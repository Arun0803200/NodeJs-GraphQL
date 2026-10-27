import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { ADMIN_MESSAGES, ADMIN_UPDATE_MESSAGES, MY_MESSAGES, NAV_COUNTS, UPDATE_MY_MESSAGES } from "../../api/queries";
import { Alert } from "../ui/Alert";
import { Icon } from "../ui/Icon";
import { formatDateTime, parseLocal, timeAgo } from "../charts/format";
import { downloadCsv } from "../../lib/analytics";

export interface InboxMessage {
  id: number; senderName: string; senderEmail: string; message: string; isRead: boolean; isStarred: boolean; isArchived: boolean;
  source: string; createdAt: string; readAt: string | null; recipientUuid: string; recipientName: string; recipientUserName: string; recipientEmail: string;
}

type Mode = "user" | "admin";
const PAGE = 30;

const FOLDERS: Record<Mode, { key: string; label: string; countKey: string }[]> = {
  user: [
    { key: "inbox", label: "Inbox", countKey: "unread" },
    { key: "starred", label: "Starred", countKey: "starred" },
    { key: "archived", label: "Archived", countKey: "archived" },
    { key: "all", label: "All", countKey: "all" },
  ],
  admin: [
    { key: "all", label: "All messages", countKey: "all" },
    { key: "unread", label: "Unread by owner", countKey: "unread" },
  ],
};

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const TINTS = ["#e0e7ff", "#dcfce7", "#fef3c7", "#fce7f3", "#e0f2fe", "#ede9fe", "#ffedd5"];
const tint = (s: string) => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

function shortDate(s: string) {
  const d = parseLocal(s);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}

function replyLink(m: InboxMessage) {
  const quoted = m.message.split("\n").map((l) => `> ${l}`).join("\n");
  const body = `\n\n\nOn ${formatDateTime(m.createdAt)}, ${m.senderName} wrote:\n${quoted}`;
  return `mailto:${encodeURIComponent(m.senderEmail)}?subject=${encodeURIComponent("Re: your message via my portfolio")}&body=${encodeURIComponent(body)}`;
}

export function Inbox({ mode }: { mode: Mode }) {
  const client = useApolloClient();
  const folders = FOLDERS[mode];
  const [folder, setFolder] = useState(folders[0].key);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search.trim()); setLimit(PAGE); setChecked(new Set()); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, previousData, loading, refetch } = useQuery<any>(mode === "admin" ? ADMIN_MESSAGES : MY_MESSAGES, {
    variables: { filter: { folder, search: query || null, limit, offset: 0 } },
    notifyOnNetworkStatusChange: true,
    pollInterval: 60_000,
  });
  const res = (data ?? previousData)?.[mode === "admin" ? "adminMessages" : "myMessages"];
  const messages: InboxMessage[] = res?.data ?? [];
  const counts = res?.counts ?? {};
  const total: number = res?.total ?? 0;
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const [updateMine] = useMutation<any>(UPDATE_MY_MESSAGES);
  const [updateAdmin] = useMutation<any>(ADMIN_UPDATE_MESSAGES);

  const run = async (ids: number[], action: string, quiet = false) => {
    if (ids.length === 0) return;
    if (action === "delete" && !window.confirm(`Delete ${ids.length === 1 ? "this message" : `${ids.length} messages`} permanently?`)) return;
    const { data } = mode === "admin"
      ? await updateAdmin({ variables: { ids, action } })
      : await updateMine({ variables: { ids, action } });
    const r = mode === "admin" ? data.adminUpdateMessages : data.updateMyMessages;
    if (!quiet || r.status !== 1) setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    if (action === "delete" || action === "archive" || action === "unarchive") {
      if (selectedId !== null && ids.includes(selectedId)) setSelectedId(null);
    }
    setChecked(new Set());
    await refetch();
    // Keep the sidebar badge in step
    client.refetchQueries({ include: [NAV_COUNTS] });
  };

  const open = (m: InboxMessage) => {
    setSelectedId(m.id);
    // Opening a message reads it (only the owner's own view changes read state)
    if (mode === "user" && !m.isRead) run([m.id], "read", true);
  };

  const changeFolder = (key: string) => { setFolder(key); setLimit(PAGE); setSelectedId(null); setChecked(new Set()); };
  const toggleCheck = (id: number) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allChecked = messages.length > 0 && messages.every((m) => checked.has(m.id));
  const checkedList = messages.filter((m) => checked.has(m.id));

  const exportCsv = () => downloadCsv(`messages-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Received", "From", "Email", ...(mode === "admin" ? ["To", "Username"] : []), "Message", "Read", "Starred", "Archived", "Source"],
    messages.map((m) => [m.createdAt, m.senderName, m.senderEmail, ...(mode === "admin" ? [m.recipientName, m.recipientUserName] : []), m.message,
      m.isRead ? "yes" : "no", m.isStarred ? "yes" : "no", m.isArchived ? "yes" : "no", m.source]));

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setAlert({ type: "success", message: `${label} copied` });
  };

  return (
    <div className="page inbox-page">
      <div className="page-header">
        <div>
          <h1>{mode === "admin" ? "Messages" : "Inbox"}</h1>
          <p className="text-muted">
            {mode === "admin"
              ? "Every contact message sent to portfolios on the platform. Read status belongs to each owner; admins can review and remove spam."
              : "Messages visitors send from your website's contact form. Reply goes straight to their email."}
          </p>
        </div>
        <div className="log-actions">
          <button className="btn btn-sm btn-secondary icon-btn-text" onClick={() => refetch()} disabled={loading}><Icon name="refresh" size={15} /> Refresh</button>
          <button className="btn btn-sm btn-secondary" onClick={exportCsv} disabled={messages.length === 0}>Export CSV</button>
        </div>
      </div>

      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className={`inbox${selected ? " has-selection" : ""}`}>
        <section className="inbox-list" aria-label="Messages">
          <div className="inbox-folders" role="tablist">
            {folders.map((f) => (
              <button key={f.key} role="tab" aria-selected={folder === f.key} className={folder === f.key ? "active" : ""} onClick={() => changeFolder(f.key)}>
                {f.label}
                {(counts[f.countKey] ?? 0) > 0 && <span className={`inbox-count${f.countKey === "unread" ? " strong" : ""}`}>{counts[f.countKey]}</span>}
              </button>
            ))}
          </div>
          <div className="inbox-search">
            <Icon name="search" size={16} />
            <input type="search" placeholder={mode === "admin" ? "Search sender, recipient or text" : "Search sender or text"} value={search}
              onChange={(e) => setSearch(e.target.value)} aria-label="Search messages" />
          </div>

          <div className="inbox-bulk">
            <label className="inbox-check-all">
              <input type="checkbox" checked={allChecked} onChange={() => setChecked(allChecked ? new Set() : new Set(messages.map((m) => m.id)))} disabled={messages.length === 0} />
              {checked.size > 0 ? `${checked.size} selected` : `${total} message${total === 1 ? "" : "s"}`}
            </label>
            {checked.size > 0 && (
              <div className="inbox-bulk-actions">
                {mode === "user" && <>
                  {checkedList.some((m) => !m.isRead)
                    ? <button title="Mark read" onClick={() => run([...checked], "read")}><Icon name="mailOpen" size={16} /></button>
                    : <button title="Mark unread" onClick={() => run([...checked], "unread")}><Icon name="mail" size={16} /></button>}
                  {folder === "archived"
                    ? <button title="Move to inbox" onClick={() => run([...checked], "unarchive")}><Icon name="inbox" size={16} /></button>
                    : <button title="Archive" onClick={() => run([...checked], "archive")}><Icon name="archive" size={16} /></button>}
                </>}
                <button title="Delete" className="danger" onClick={() => run([...checked], "delete")}><Icon name="trash" size={16} /></button>
              </div>
            )}
          </div>

          <ul className={`inbox-items${loading ? " dash-stale" : ""}`}>
            {messages.map((m) => (
              <li key={m.id} className={`inbox-item${m.id === selectedId ? " selected" : ""}${!m.isRead && mode === "user" ? " unread" : ""}`}>
                <input type="checkbox" checked={checked.has(m.id)} onChange={() => toggleCheck(m.id)} aria-label={`Select message from ${m.senderName}`} />
                <button type="button" className="inbox-item-main" onClick={() => open(m)}>
                  <span className="inbox-avatar" style={{ background: tint(m.senderEmail) }} aria-hidden="true">{initials(m.senderName)}</span>
                  <span className="inbox-item-text">
                    <span className="inbox-item-top">
                      <span className="inbox-sender">{m.senderName}</span>
                      <time dateTime={m.createdAt} title={formatDateTime(m.createdAt)}>{shortDate(m.createdAt)}</time>
                    </span>
                    {mode === "admin" && <span className="inbox-recipient">to {m.recipientName}{!m.isRead && <span className="inbox-unread-tag">unread</span>}</span>}
                    <span className="inbox-snippet">{m.message}</span>
                  </span>
                </button>
                {mode === "user" && (
                  <button type="button" className={`inbox-star${m.isStarred ? " on" : ""}`} onClick={() => run([m.id], m.isStarred ? "unstar" : "star", true)}
                    aria-label={m.isStarred ? "Unstar" : "Star"} aria-pressed={m.isStarred}>
                    <Icon name="star" size={16} filled={m.isStarred} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!loading && messages.length === 0 && (
            <div className="inbox-empty">
              <Icon name="inbox" size={32} />
              <strong>{query ? "No messages match your search" : folder === "starred" ? "No starred messages" : folder === "archived" ? "Nothing archived" : "No messages yet"}</strong>
              <span>{!query && mode === "user" && folder === "inbox" ? "When visitors use the contact button on your published website, their messages appear here." : ""}</span>
            </div>
          )}
          {messages.length < total && (
            <button className="btn btn-sm btn-secondary inbox-more" onClick={() => setLimit((l) => l + PAGE)} disabled={loading}>Load more ({total - messages.length})</button>
          )}
        </section>

        <section className="inbox-reader" aria-label="Message">
          {!selected ? (
            <div className="inbox-empty reader-empty">
              <Icon name="mail" size={36} />
              <strong>Select a message to read it</strong>
              <span>{counts.unread ? `${counts.unread} unread` : "You're all caught up"}</span>
            </div>
          ) : (
            <article>
              <div className="reader-toolbar">
                <button type="button" className="reader-back" onClick={() => setSelectedId(null)}><Icon name="back" size={18} /> Back</button>
                <div className="reader-actions">
                  {mode === "user" && <>
                    <button title={selected.isStarred ? "Unstar" : "Star"} className={selected.isStarred ? "on" : ""} onClick={() => run([selected.id], selected.isStarred ? "unstar" : "star", true)}>
                      <Icon name="star" size={17} filled={selected.isStarred} />
                    </button>
                    <button title="Mark unread" onClick={() => { run([selected.id], "unread"); setSelectedId(null); }}><Icon name="mail" size={17} /></button>
                    {selected.isArchived
                      ? <button title="Move to inbox" onClick={() => run([selected.id], "unarchive")}><Icon name="inbox" size={17} /></button>
                      : <button title="Archive" onClick={() => run([selected.id], "archive")}><Icon name="archive" size={17} /></button>}
                  </>}
                  <button title="Delete" className="danger" onClick={() => run([selected.id], "delete")}><Icon name="trash" size={17} /></button>
                </div>
              </div>

              <header className="reader-head">
                <span className="inbox-avatar lg" style={{ background: tint(selected.senderEmail) }} aria-hidden="true">{initials(selected.senderName)}</span>
                <div className="reader-from">
                  <strong>{selected.senderName}</strong>
                  <button type="button" className="reader-email" onClick={() => copy(selected.senderEmail, "Email")} title="Copy email">
                    {selected.senderEmail} <Icon name="copy" size={13} />
                  </button>
                </div>
                <div className="reader-meta">
                  <time dateTime={selected.createdAt}>{formatDateTime(selected.createdAt)}</time>
                  <small>{timeAgo(selected.createdAt)} · via {selected.source === "website" ? "website contact form" : "portfolio page"}</small>
                </div>
              </header>

              {mode === "admin" && (
                <div className="reader-recipient">
                  To <Link to={`/admin/users/${selected.recipientUuid}`}>{selected.recipientName}</Link>
                  {selected.recipientUserName && <> · <a href={`/${selected.recipientUserName}`} target="_blank" rel="noreferrer">/{selected.recipientUserName} ↗</a></>}
                  <span className={`state ${selected.isRead ? "state-off" : "state-warn"}`}><span className="state-dot" />{selected.isRead ? "Read by owner" : "Not yet read by owner"}</span>
                </div>
              )}

              <div className="reader-body">{selected.message}</div>

              <div className="reader-reply">
                {mode === "user" ? (
                  <>
                    <a className="btn btn-primary icon-btn-text" href={replyLink(selected)}><Icon name="reply" size={16} /> Reply by email</a>
                    <button className="btn btn-secondary icon-btn-text" onClick={() => copy(selected.senderEmail, "Email")}><Icon name="copy" size={16} /> Copy email</button>
                  </>
                ) : (
                  <>
                    <a className="btn btn-secondary icon-btn-text" href={`mailto:${selected.senderEmail}`}><Icon name="mail" size={16} /> Email sender</a>
                    <Link className="btn btn-secondary icon-btn-text" to={`/admin/users/${selected.recipientUuid}`}><Icon name="user" size={16} /> View recipient</Link>
                  </>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </div>
  );
}

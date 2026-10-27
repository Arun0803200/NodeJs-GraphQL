import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { ADMIN_DELETE_PLATFORM_LEAD, ADMIN_PLATFORM_LEADS, ADMIN_UPDATE_PLATFORM_LEAD, NAV_COUNTS } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Icon } from "../../components/ui/Icon";
import { formatDateTime, timeAgo } from "../../components/charts/format";
import { downloadCsv } from "../../lib/analytics";

interface Lead {
  id: number; ref: string; name: string; phone: string; email: string | null; purpose: string; message: string; source: string;
  pageUrl: string | null; status: string; adminNote: string | null; lang: string; createdAt: string;
}

const TABS = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "converted", label: "Converted" },
  { key: "closed", label: "Closed" },
  { key: "", label: "All" },
] as const;
const PURPOSE: Record<string, string> = {
  "new-website": "Wants a website", pricing: "Pricing & plans", support: "Help with a website", partnership: "Partnership", other: "Other",
};
const TONE: Record<string, string> = { new: "warn", contacted: "on", converted: "on", closed: "off" };

function replyLink(l: Lead) {
  const text = l.lang === "ta"
    ? `வணக்கம் ${l.name}, Portfolia-வைத் தொடர்பு கொண்டதற்கு நன்றி (${l.ref}). உங்களுக்கு எப்படி உதவலாம்?`
    : `Hi ${l.name}, thanks for contacting Portfolia (${l.ref}). How can we help?`;
  return `https://api.whatsapp.com/send?phone=91${l.phone}&text=${encodeURIComponent(text)}`;
}

export function AdminEnquiriesPage() {
  const client = useApolloClient();
  const [status, setStatus] = useState<string>("new");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, previousData, loading, refetch } = useQuery<any>(ADMIN_PLATFORM_LEADS, {
    variables: { status: status || null, search: query || null }, notifyOnNetworkStatusChange: true, pollInterval: 60_000,
  });
  const res = (data ?? previousData)?.adminPlatformLeads;
  const leads: Lead[] = res?.data ?? [];
  const counts = res?.counts ?? {};
  const [update] = useMutation<any>(ADMIN_UPDATE_PLATFORM_LEAD);
  const [remove] = useMutation<any>(ADMIN_DELETE_PLATFORM_LEAD);

  const after = async (r: { status: number; message: string }) => {
    setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    await refetch();
    client.refetchQueries({ include: [NAV_COUNTS] });
  };
  const save = async (l: Lead, patch: { status?: string; adminNote?: string }) => after((await update({ variables: { id: l.id, ...patch } })).data.adminUpdatePlatformLead);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Business enquiries</h1>
          <p className="text-muted">Messages from the "Contact us" form shown on every website and the storefront. Visitors are also sent to WhatsApp ({`ADMIN_WHATSAPP`} in the server .env).</p>
        </div>
        <div className="log-actions">
          <button className="btn btn-sm btn-secondary icon-btn-text" onClick={() => refetch()} disabled={loading}><Icon name="refresh" size={15} /> Refresh</button>
          <button className="btn btn-sm btn-secondary" disabled={leads.length === 0} onClick={() => downloadCsv(`enquiries-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Ref", "Status", "Received", "Name", "Phone", "Email", "Interested in", "Message", "From", "Page", "Note"],
            leads.map((l) => [l.ref, l.status, l.createdAt, l.name, l.phone, l.email, PURPOSE[l.purpose] ?? l.purpose, l.message, l.source, l.pageUrl, l.adminNote]))}>Export CSV</button>
        </div>
      </div>
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className="bk-toolbar">
        <div className="dash-tabs bk-tabs" role="tablist">
          {TABS.map((tab) => (
            <button key={tab.key} role="tab" aria-selected={status === tab.key} className={status === tab.key ? "active" : ""} onClick={() => setStatus(tab.key)}>
              {tab.label}{(counts[tab.key || "all"] ?? 0) > 0 && <span className="bk-count">{counts[tab.key || "all"]}</span>}
            </button>
          ))}
        </div>
        <div className="inbox-search bk-search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Search name, phone, message, website or reference" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search enquiries" />
        </div>
      </div>

      {!res && loading ? <p className="text-muted">Loading…</p> : leads.length === 0 ? (
        <div className="inbox-empty bk-empty">
          <Icon name="inbox" size={32} />
          <strong>{query ? "No enquiries match your search" : status === "new" ? "No new enquiries" : "Nothing here yet"}</strong>
          <span>Visitors reach you through "Contact us" at the bottom of every website and in the storefront menu.</span>
        </div>
      ) : (
        <ul className={`bk-list${loading ? " dash-stale" : ""}`}>
          {leads.map((l) => (
            <li key={l.id} className={`bk-card ${l.status === "new" ? "bk-new" : l.status === "closed" ? "bk-cancelled" : "bk-confirmed"}`}>
              <div className="bk-top">
                <div className="bk-ref">
                  <code>{l.ref}</code>
                  <span className={`state state-${TONE[l.status] ?? "off"}`}><span className="state-dot" />{l.status[0].toUpperCase() + l.status.slice(1)}</span>
                  <span className="text-muted bk-ago" title={formatDateTime(l.createdAt)}>{timeAgo(l.createdAt)}</span>
                </div>
                <span className="pill pill-system">{PURPOSE[l.purpose] ?? l.purpose}</span>
              </div>
              <div className="bk-customer">
                <div><strong>{l.name}</strong><span className="text-muted"> · +91 {l.phone}{l.email ? ` · ${l.email}` : ""}</span></div>
                <div className="bk-actions">
                  <a className="btn btn-sm btn-secondary" href={`tel:+91${l.phone}`}>Call</a>
                  <a className="btn btn-sm btn-wa" href={replyLink(l)} target="_blank" rel="noreferrer">WhatsApp</a>
                  {l.email && <a className="btn btn-sm btn-secondary" href={`mailto:${l.email}`}>Email</a>}
                </div>
              </div>
              <p className="rv-comment enq-message">{l.message}</p>
              <p className="text-muted enq-source">
                From {l.source === "storefront" ? "the storefront" : <>the website <Link to={`/${l.source}`} target="_blank">/{l.source}</Link></>}
                {l.lang === "ta" ? " · Tamil" : ""}
              </p>
              <div className="form-group da-note">
                <label>Note</label>
                <textarea rows={2} value={notes[l.id] ?? l.adminNote ?? ""} onChange={(e) => setNotes({ ...notes, [l.id]: e.target.value })} />
                <button className="btn btn-sm btn-secondary" onClick={() => save(l, { adminNote: notes[l.id] ?? l.adminNote ?? "" })}>Save note</button>
              </div>
              <div className="bk-status-actions">
                {l.status !== "contacted" && <button className="btn btn-sm btn-secondary" onClick={() => save(l, { status: "contacted" })}>Mark contacted</button>}
                {l.status !== "converted" && <button className="btn btn-sm btn-primary" onClick={() => save(l, { status: "converted" })}>Converted</button>}
                {l.status !== "closed" && <button className="btn btn-sm btn-secondary" onClick={() => save(l, { status: "closed" })}>Close</button>}
                {l.status !== "new" && <button className="btn btn-sm btn-secondary" onClick={() => save(l, { status: "new" })}>Move to new</button>}
                <button className="btn btn-sm btn-danger" onClick={async () => window.confirm(`Delete ${l.ref}?`) && after((await remove({ variables: { id: l.id } })).data.adminDeletePlatformLead)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { DELETE_MY_FORM_SUBMISSION, MY_FORM_SUBMISSIONS, NAV_COUNTS, UPDATE_MY_FORM_SUBMISSION } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Icon } from "../../components/ui/Icon";
import { timeAgo } from "../../components/charts/format";
import { downloadCsv } from "../../lib/analytics";

interface Submission {
  id: number; ref: string; formId: string; formTitle: string; answers: { fieldId: string; label: string; value: string }[];
  status: string; ownerNote: string | null; lang: string; createdAt: string;
}

const TABS = [
  { key: "new", label: "New" },
  { key: "done", label: "Done" },
  { key: "archived", label: "Archived" },
  { key: "", label: "All" },
] as const;
const PHONE = /^[6-9]\d{9}$/;

export function FormSubmissionsPage() {
  const client = useApolloClient();
  const [status, setStatus] = useState<string>("new");
  const [formId, setFormId] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  const { data, previousData, loading, refetch } = useQuery<any>(MY_FORM_SUBMISSIONS, {
    variables: { status: status || null, formId: formId || null }, notifyOnNetworkStatusChange: true, pollInterval: 60_000,
  });
  const res = (data ?? previousData)?.myFormSubmissions;
  const items: Submission[] = res?.data ?? [];
  const counts = res?.counts ?? {};
  const forms: { fieldId: string; label: string }[] = res?.forms ?? [];
  const [update] = useMutation<any>(UPDATE_MY_FORM_SUBMISSION);
  const [remove] = useMutation<any>(DELETE_MY_FORM_SUBMISSION);

  const after = async (r: { status: number; message: string }) => {
    setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    await refetch();
    client.refetchQueries({ include: [NAV_COUNTS] });
  };
  const save = async (s: Submission, patch: { status?: string; ownerNote?: string }) =>
    after((await update({ variables: { id: s.id, ...patch } })).data.updateMyFormSubmission);

  const exportCsv = () => {
    const labels = [...new Set(items.flatMap((s) => s.answers.map((a) => a.label)))];
    downloadCsv(`form-submissions-${new Date().toISOString().slice(0, 10)}.csv`, ["Ref", "Form", "Status", "Submitted", ...labels, "My note"],
      items.map((s) => [s.ref, s.formTitle, s.status, s.createdAt, ...labels.map((l) => s.answers.find((a) => a.label === l)?.value ?? ""), s.ownerNote]));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Form submissions</h1>
          <p className="text-muted">Answers sent through the custom forms on your website.</p>
        </div>
        <div className="log-actions">
          <button className="btn btn-sm btn-secondary icon-btn-text" onClick={() => refetch()} disabled={loading}><Icon name="refresh" size={15} /> Refresh</button>
          <button className="btn btn-sm btn-secondary" onClick={exportCsv} disabled={items.length === 0}>Export CSV</button>
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
        {forms.length > 1 && (
          <select className="fs-filter" value={formId} onChange={(e) => setFormId(e.target.value)} aria-label="Form">
            <option value="">All forms</option>
            {forms.map((f) => <option key={f.fieldId} value={f.fieldId}>{f.label}</option>)}
          </select>
        )}
      </div>

      {!res && loading ? <p className="text-muted">Loading…</p> : items.length === 0 ? (
        <div className="inbox-empty bk-empty">
          <Icon name="inbox" size={32} />
          <strong>{status === "new" ? "No new submissions" : "Nothing here yet"}</strong>
          <span>Create forms under Custom forms in your website builder.</span>
        </div>
      ) : (
        <ul className={`bk-list${loading ? " dash-stale" : ""}`}>
          {items.map((s) => {
            const phone = s.answers.find((a) => PHONE.test(a.value))?.value;
            return (
              <li key={s.id} className={`bk-card ${s.status === "new" ? "bk-new" : s.status === "archived" ? "bk-cancelled" : "bk-confirmed"}`}>
                <div className="bk-top">
                  <div className="bk-ref"><code>{s.ref}</code><strong>{s.formTitle}</strong><span className="text-muted bk-ago">{timeAgo(s.createdAt)}</span></div>
                </div>
                <dl className="fs-answers">
                  {s.answers.map((a) => <div key={a.fieldId}><dt>{a.label}</dt><dd>{a.value}</dd></div>)}
                </dl>
                {phone && (
                  <div className="bk-actions">
                    <a className="btn btn-sm btn-secondary" href={`tel:+91${phone}`}>Call</a>
                    <a className="btn btn-sm btn-wa" href={`https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(`Hi, thanks for your enquiry (${s.ref}).`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  </div>
                )}
                <div className="form-group da-note">
                  <label>Private note</label>
                  <textarea rows={2} value={notes[s.id] ?? s.ownerNote ?? ""} onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })} />
                  <button className="btn btn-sm btn-secondary" onClick={() => save(s, { ownerNote: notes[s.id] ?? s.ownerNote ?? "" })}>Save note</button>
                </div>
                <div className="bk-status-actions">
                  {s.status !== "done" && <button className="btn btn-sm btn-primary" onClick={() => save(s, { status: "done" })}>Mark done</button>}
                  {s.status !== "archived" && <button className="btn btn-sm btn-secondary" onClick={() => save(s, { status: "archived" })}>Archive</button>}
                  {s.status !== "new" && <button className="btn btn-sm btn-secondary" onClick={() => save(s, { status: "new" })}>Move to new</button>}
                  <button className="btn btn-sm btn-danger" onClick={async () => window.confirm(`Delete ${s.ref}?`) && after((await remove({ variables: { id: s.id } })).data.deleteMyFormSubmission)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

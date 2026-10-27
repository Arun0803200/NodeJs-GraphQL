import { useEffect, useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { DELETE_MY_DRIVER_APPLICATION, MY_DRIVER_APPLICATIONS, NAV_COUNTS, UPDATE_MY_DRIVER_APPLICATION } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Icon } from "../../components/ui/Icon";
import { timeAgo } from "../../components/charts/format";
import { downloadCsv } from "../../lib/analytics";

interface Application {
  id: number; ref: string; status: string; fullName: string; phone: string; email: string | null; age: number | null; area: string;
  experienceYears: number; licenseNumber: string; licenseType: string; licenseValidTill: string; vehicleTypes: string[]; languages: string;
  availability: string; tripPreference: string; expectedSalary: string | null; ownVehicle: string | null; about: string | null;
  photoUrl: string | null; licenseFrontUrl: string | null; licenseBackUrl: string | null; ownerNote: string | null; lang: string; createdAt: string;
}

const TABS = [
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
] as const;
const TONE: Record<string, string> = { new: "warn", shortlisted: "on", hired: "on", rejected: "bad" };
const LICENCE: Record<string, string> = { LMV: "LMV (car)", "LMV-TR": "LMV transport / badge", HMV: "HMV (heavy)" };
const AVAILABILITY: Record<string, string> = { "full-time": "Full-time", "part-time": "Part-time", weekends: "Weekends", "on-call": "On call" };
const PREFERENCE: Record<string, string> = { city: "City trips", outstation: "Outstation", both: "City & outstation" };

const licenceSoon = (date: string) => {
  const d = new Date(date);
  return !Number.isNaN(d.getTime()) && d.getTime() - Date.now() < 90 * 86400_000;
};

function applicantWhatsapp(a: Application) {
  const text = a.lang === "ta"
    ? `வணக்கம் ${a.fullName}, உங்கள் டிரைவர் விண்ணப்பம் (${a.ref}) கிடைத்தது. நேர்காணலுக்கு உங்களைத் தொடர்பு கொள்கிறோம்.`
    : `Hi ${a.fullName}, thanks for your driver application (${a.ref}). We'd like to talk to you about the role.`;
  return `https://api.whatsapp.com/send?phone=91${a.phone}&text=${encodeURIComponent(text)}`;
}

export function DriverApplicationsPage() {
  const client = useApolloClient();
  const [status, setStatus] = useState<string>("new");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Document links expire after an hour, so the list refreshes well within that
  const { data, previousData, loading, refetch } = useQuery<any>(MY_DRIVER_APPLICATIONS, {
    variables: { status: status || null, search: query || null },
    notifyOnNetworkStatusChange: true,
    pollInterval: 10 * 60_000,
  });
  const res = (data ?? previousData)?.myDriverApplications;
  const apps: Application[] = res?.data ?? [];
  const counts = res?.counts ?? {};
  const [update] = useMutation<any>(UPDATE_MY_DRIVER_APPLICATION);
  const [remove] = useMutation<any>(DELETE_MY_DRIVER_APPLICATION);

  const after = async (r: { status: number; message: string }) => {
    setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    await refetch();
    client.refetchQueries({ include: [NAV_COUNTS] });
  };
  const save = async (a: Application, patch: { status?: string; ownerNote?: string }) =>
    after((await update({ variables: { id: a.id, ...patch } })).data.updateMyDriverApplication);
  const del = async (a: Application) => {
    if (!window.confirm(`Delete ${a.fullName}'s application and documents permanently?`)) return;
    after((await remove({ variables: { id: a.id } })).data.deleteMyDriverApplication);
  };

  const exportCsv = () => downloadCsv(`driver-applications-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Ref", "Status", "Applied", "Name", "Phone", "Email", "Age", "Area", "Experience (yrs)", "Licence no.", "Licence type", "Valid till",
      "Vehicles", "Languages", "Availability", "Trips", "Expected salary", "Own vehicle", "About", "My note"],
    apps.map((a) => [a.ref, a.status, a.createdAt, a.fullName, a.phone, a.email, a.age, a.area, a.experienceYears, a.licenseNumber,
      LICENCE[a.licenseType] ?? a.licenseType, a.licenseValidTill, a.vehicleTypes.join(", "), a.languages, AVAILABILITY[a.availability],
      PREFERENCE[a.tripPreference], a.expectedSalary, a.ownVehicle, a.about, a.ownerNote]));

  const doc = (url: string | null, title: string) => url && (
    <button type="button" className="da-doc" onClick={() => setViewer({ url, title })} title={`View ${title}`}>
      <img src={url} alt={title} loading="lazy" referrerPolicy="no-referrer" />
      <span>{title}</span>
    </button>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Driver applications</h1>
          <p className="text-muted">Drivers who applied through "Drive with us" on your website. Licence photos are private to you.</p>
        </div>
        <div className="log-actions">
          <button className="btn btn-sm btn-secondary icon-btn-text" onClick={() => refetch()} disabled={loading}><Icon name="refresh" size={15} /> Refresh</button>
          <button className="btn btn-sm btn-secondary" onClick={exportCsv} disabled={apps.length === 0}>Export CSV</button>
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
          <input type="search" placeholder="Search name, phone, area or reference" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search applications" />
        </div>
      </div>

      {!res && loading ? <p className="text-muted">Loading applications…</p> : apps.length === 0 ? (
        <div className="inbox-empty bk-empty">
          <Icon name="user" size={32} />
          <strong>{query ? "No applications match your search" : status === "new" ? "No new applications" : "Nothing here yet"}</strong>
          <span>Turn on "Drive with us" in your website builder (Trips & online booking) to receive driver applications.</span>
        </div>
      ) : (
        <ul className={`bk-list${loading ? " dash-stale" : ""}`}>
          {apps.map((a) => (
            <li key={a.id} className={`bk-card da-card bk-${a.status === "new" ? "new" : a.status === "rejected" ? "cancelled" : "confirmed"}`}>
              <div className="da-head">
                {a.photoUrl ? (
                  <button type="button" className="da-avatar" onClick={() => setViewer({ url: a.photoUrl!, title: `${a.fullName} — photo` })}>
                    <img src={a.photoUrl} alt={a.fullName} referrerPolicy="no-referrer" />
                  </button>
                ) : <span className="da-avatar">{a.fullName[0]}</span>}
                <div className="da-who">
                  <strong>{a.fullName}{a.age ? <span className="text-muted">, {a.age}</span> : null}</strong>
                  <span className="text-muted">{a.area} · applied {timeAgo(a.createdAt)} · <code>{a.ref}</code></span>
                </div>
                <span className={`state state-${TONE[a.status] ?? "off"}`}><span className="state-dot" />{a.status[0].toUpperCase() + a.status.slice(1)}</span>
              </div>

              <dl className="bk-facts">
                <div><dt>Experience</dt><dd>{a.experienceYears} years</dd></div>
                <div><dt>Licence</dt><dd>{a.licenseNumber}</dd></div>
                <div><dt>Type</dt><dd>{LICENCE[a.licenseType] ?? a.licenseType}</dd></div>
                <div><dt>Valid till</dt><dd className={licenceSoon(a.licenseValidTill) ? "text-critical" : ""}>{a.licenseValidTill}{licenceSoon(a.licenseValidTill) ? " (expiring soon)" : ""}</dd></div>
                <div><dt>Can drive</dt><dd>{a.vehicleTypes.join(", ")}</dd></div>
                <div><dt>Availability</dt><dd>{AVAILABILITY[a.availability] ?? a.availability} · {PREFERENCE[a.tripPreference] ?? a.tripPreference}</dd></div>
                {a.languages && <div><dt>Languages</dt><dd>{a.languages}</dd></div>}
                {a.expectedSalary && <div><dt>Expected salary</dt><dd>{a.expectedSalary}</dd></div>}
                {a.ownVehicle && <div><dt>Own vehicle</dt><dd>{a.ownVehicle}</dd></div>}
              </dl>
              {a.about && <p className="bk-notes">“{a.about}”</p>}

              <div className="da-docs">
                {doc(a.licenseFrontUrl, "Licence front")}
                {doc(a.licenseBackUrl, "Licence back")}
              </div>

              <div className="bk-customer">
                <div><strong>+91 {a.phone}</strong>{a.email && <span className="text-muted"> · {a.email}</span>}</div>
                <div className="bk-actions">
                  <a className="btn btn-sm btn-secondary" href={`tel:+91${a.phone}`}>Call</a>
                  <a className="btn btn-sm btn-wa" href={applicantWhatsapp(a)} target="_blank" rel="noreferrer">WhatsApp</a>
                  {a.email && <a className="btn btn-sm btn-secondary" href={`mailto:${a.email}`}>Email</a>}
                </div>
              </div>

              <div className="form-group da-note">
                <label>Private note (interview date, references…)</label>
                <textarea rows={2} value={notes[a.id] ?? a.ownerNote ?? ""} onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
                <button className="btn btn-sm btn-secondary" onClick={() => save(a, { ownerNote: notes[a.id] ?? a.ownerNote ?? "" })}>Save note</button>
              </div>

              <div className="bk-status-actions">
                {a.status !== "shortlisted" && a.status !== "hired" && <button className="btn btn-sm btn-secondary" onClick={() => save(a, { status: "shortlisted" })}>Shortlist</button>}
                {a.status !== "hired" && <button className="btn btn-sm btn-primary" onClick={() => save(a, { status: "hired" })}>Mark hired</button>}
                {a.status !== "rejected" && <button className="btn btn-sm btn-secondary" onClick={() => save(a, { status: "rejected" })}>Reject</button>}
                {a.status !== "new" && <button className="btn btn-sm btn-secondary" onClick={() => save(a, { status: "new" })}>Move to new</button>}
                <button className="btn btn-sm btn-danger" onClick={() => del(a)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewer && (
        <div className="modal-overlay da-viewer" onClick={() => setViewer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={viewer.title}>
            <div className="modal-header"><h3>{viewer.title}</h3><button className="modal-close" onClick={() => setViewer(null)} aria-label="Close">&times;</button></div>
            <div className="modal-body"><img src={viewer.url} alt={viewer.title} referrerPolicy="no-referrer" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

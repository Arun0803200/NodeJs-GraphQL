import { useState } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { DELETE_MY_REVIEW, MODERATE_MY_REVIEW, MY_REVIEWS, NAV_COUNTS } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { Icon } from "../../components/ui/Icon";
import { timeAgo } from "../../components/charts/format";
import { downloadCsv } from "../../lib/analytics";

interface OwnerReview {
  id: number; typeId: string; typeLabel: string; target: string; targetId: string | null; targetName: string | null; rating: number;
  criteria: Record<string, number>; comment: string | null; reviewerName: string; reviewerPhone: string | null; ownerReply: string | null;
  status: string; createdAt: string;
}

const TABS = [
  { key: "pending", label: "Waiting for approval" },
  { key: "approved", label: "Published" },
  { key: "hidden", label: "Hidden" },
  { key: "", label: "All" },
] as const;
const TONE: Record<string, string> = { pending: "warn", approved: "on", hidden: "off" };
const TARGET: Record<string, string> = { business: "Business", driver: "Driver", vehicle: "Vehicle" };
const stars = (n: number) => "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);

export function ReviewsPage() {
  const client = useApolloClient();
  const [status, setStatus] = useState<string>("pending");
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  const { data, previousData, loading, refetch } = useQuery<any>(MY_REVIEWS, { variables: { status: status || null }, notifyOnNetworkStatusChange: true });
  const res = (data ?? previousData)?.myReviews;
  const reviews: OwnerReview[] = res?.data ?? [];
  const counts = res?.counts ?? {};
  const [moderate] = useMutation<any>(MODERATE_MY_REVIEW);
  const [remove] = useMutation<any>(DELETE_MY_REVIEW);

  const after = async (r: { status: number; message: string }) => {
    setAlert({ type: r.status === 1 ? "success" : "error", message: r.message });
    await refetch();
    client.refetchQueries({ include: [NAV_COUNTS] });
  };
  const act = async (r: OwnerReview, patch: { status?: string; ownerReply?: string }) =>
    after((await moderate({ variables: { id: r.id, ...patch } })).data.moderateMyReview);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Ratings & reviews</h1>
          <p className="text-muted">Reviews customers left on your website. Approve them to publish, hide anything inappropriate, and reply publicly.</p>
        </div>
        <div className="log-actions">
          {res?.average && <span className="rv-average">★ {res.average.toFixed(1)} <small>average of published</small></span>}
          <button className="btn btn-sm btn-secondary" disabled={reviews.length === 0} onClick={() => downloadCsv(`reviews-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Date", "Status", "Rating type", "About", "Rating", "Review", "Name", "Phone", "Reply"],
            reviews.map((r) => [r.createdAt, r.status, r.typeLabel, r.targetName ?? "Business", r.rating, r.comment, r.reviewerName, r.reviewerPhone, r.ownerReply]))}>Export CSV</button>
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
      </div>

      {!res && loading ? <p className="text-muted">Loading…</p> : reviews.length === 0 ? (
        <div className="inbox-empty bk-empty">
          <Icon name="star" size={32} />
          <strong>{status === "pending" ? "Nothing waiting for approval" : "No reviews here yet"}</strong>
          <span>Turn on Ratings & reviews in your website builder and add the rating types you want.</span>
        </div>
      ) : (
        <ul className={`bk-list${loading ? " dash-stale" : ""}`}>
          {reviews.map((r) => (
            <li key={r.id} className={`bk-card ${r.status === "pending" ? "bk-new" : r.status === "hidden" ? "bk-cancelled" : "bk-confirmed"}`}>
              <div className="da-head">
                <span className="rv-stars" aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span>
                <div className="da-who">
                  <strong>{r.reviewerName}</strong>
                  <span className="text-muted">{r.typeLabel} · {TARGET[r.target]}{r.targetName ? `: ${r.targetName}` : ""} · {timeAgo(r.createdAt)}{r.reviewerPhone ? ` · +91 ${r.reviewerPhone}` : ""}</span>
                </div>
                <span className={`state state-${TONE[r.status] ?? "off"}`}><span className="state-dot" />{TABS.find((x) => x.key === r.status)?.label ?? r.status}</span>
              </div>
              {Object.keys(r.criteria).length > 0 && (
                <p className="rv-criteria">{Object.entries(r.criteria).map(([k, v]) => <span key={k}>{k}: <b>{v}★</b></span>)}</p>
              )}
              {r.comment ? <p className="rv-comment">“{r.comment}”</p> : <p className="text-muted">No written review.</p>}
              <div className="form-group da-note">
                <label>Public reply (optional)</label>
                <textarea rows={2} value={replies[r.id] ?? r.ownerReply ?? ""} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} placeholder="Thank you for travelling with us!" />
                <button className="btn btn-sm btn-secondary" onClick={() => act(r, { ownerReply: replies[r.id] ?? r.ownerReply ?? "" })}>Save reply</button>
              </div>
              <div className="bk-status-actions">
                {r.status !== "approved" && <button className="btn btn-sm btn-primary" onClick={() => act(r, { status: "approved" })}>Approve & publish</button>}
                {r.status !== "hidden" && <button className="btn btn-sm btn-secondary" onClick={() => act(r, { status: "hidden" })}>Hide</button>}
                <button className="btn btn-sm btn-danger" onClick={async () => window.confirm("Delete this review permanently?") && after((await remove({ variables: { id: r.id } })).data.deleteMyReview)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

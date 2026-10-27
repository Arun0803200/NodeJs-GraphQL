import { useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import { ADMIN_SITE_REVIEWS, ADMIN_SITE_REVIEW, ADMIN_APPROVE_SITE, ADMIN_REJECT_SITE, ADMIN_TAKE_DOWN_SITE } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import { LANGS, LANG_NAMES, parseSite, siteContentFor } from "../../lib/templates";
import { LangSwitch } from "../../i18n/UiLang";
import type { Lang } from "../../templates/types";

type Tab = "pending" | "live" | "rejected" | "draft";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending approval" },
  { key: "live", label: "Live" },
  { key: "rejected", label: "Changes requested" },
  { key: "draft", label: "Not submitted" },
];

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

export function AdminApprovalsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const { data, loading, refetch } = useQuery<any>(ADMIN_SITE_REVIEWS, { variables: { status: tab } });
  const [loadReview, { data: reviewData, loading: reviewLoading }] = useLazyQuery<any>(ADMIN_SITE_REVIEW, { fetchPolicy: "network-only" });
  const [approve, { loading: approving }] = useMutation<any>(ADMIN_APPROVE_SITE);
  const [reject, { loading: rejecting }] = useMutation<any>(ADMIN_REJECT_SITE);
  const [takeDown] = useMutation<any>(ADMIN_TAKE_DOWN_SITE);
  const [previewUuid, setPreviewUuid] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reviewLang, setReviewLang] = useState<Lang>("en");
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });

  const rows: any[] = data?.adminSiteReviews?.data ?? [];
  const review = previewUuid ? reviewData?.adminSiteReview?.data : null;
  const reviewSite = review ? parseSite(review.contentJson) : null;
  const reviewLangs = reviewSite ? LANGS.filter((l) => reviewSite.languages[l]) : [];
  const reviewContent = reviewSite ? siteContentFor(reviewSite, reviewLang) : null;

  const openPreview = (userUuid: string) => {
    setPreviewUuid(userUuid);
    setNote("");
    loadReview({ variables: { userUuid } });
  };

  const act = async (fn: () => Promise<any>, key: string) => {
    try {
      const { data } = await fn();
      const res = data[key];
      setAlert({ type: res.status === 1 ? "success" : "error", message: res.message });
      if (res.status === 1) { setPreviewUuid(null); refetch(); }
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Website Approvals</h1>
          <p className="text-muted">Review users' websites before they go live at their portfolio URL.</p>
        </div>
      </div>
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? <p>Loading...</p> : rows.length === 0 ? (
        <p className="empty-state">{tab === "pending" ? "Nothing waiting for approval. 🎉" : "No websites here."}</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Portfolio URL</th><th>Template</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userUuid}>
                  <td><strong>{r.fullName}</strong><br /><small className="text-muted">{r.email}</small></td>
                  <td>{r.isPublished ? <a href={`/${r.userName}`} target="_blank" rel="noreferrer">/{r.userName}</a> : `/${r.userName}`}</td>
                  <td>{r.templateName} <span className={`badge badge-inline ${r.templateCategory === "free" ? "badge-free" : "badge-premium"}`}>{r.templateCategory}</span></td>
                  <td>{fmt(r.submittedAt)}</td>
                  <td><span className={`review-chip review-${r.status}`}>{r.status}</span>{r.isPublished && <span className="review-chip review-live">live</span>}</td>
                  <td className="actions-cell">
                    <button className="btn btn-sm btn-primary" onClick={() => openPreview(r.userUuid)}>{r.status === "pending" ? "Review" : "Preview"}</button>
                    {r.isPublished && (
                      <button className="btn btn-sm btn-danger" onClick={() => window.confirm(`Take /${r.userName} offline?`) && act(() => takeDown({ variables: { userUuid: r.userUuid } }), "adminTakeDownSite")}>Take down</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {previewUuid && (
        <div className="review-overlay" role="dialog" aria-modal="true" aria-label="Review website">
          <div className="review-sheet">
            <header className="review-sheet-head">
              <div>
                <strong>{review ? `${review.fullName} · /${review.userName}` : "Loading…"}</strong>
                {review && <small className="text-muted"> {review.templateName} · submitted {fmt(review.submittedAt)}</small>}
              </div>
              <div className="review-sheet-tools">
                {reviewLangs.length > 1 && <LangSwitch value={reviewContent?.lang ?? "en"} onChange={setReviewLang} className="lang-switch-sm" />}
                <button className="modal-close" onClick={() => setPreviewUuid(null)} aria-label="Close">&times;</button>
              </div>
            </header>
            <div className="review-sheet-body">
              <div className="review-preview">
                {reviewLoading || !review || !reviewContent ? <p className="empty-state">Loading preview…</p> : <TemplateRenderer designKey={review.designKey} content={reviewContent.content} lang={reviewContent.lang} />}
              </div>
              <aside className="review-panel">
                <h3>Decision</h3>
                <p className="text-muted small">Check photos, album and certificates for anything inappropriate or misleading before approving.{reviewLangs.length > 1 && ` This site has ${reviewLangs.map((l) => LANG_NAMES[l]).join(" and ")} versions — review both.`}</p>
                {review?.reviewNote && <p className="review-banner-note">Previous note: “{review.reviewNote}”</p>}
                <div className="form-group">
                  <label>Note to user</label>
                  <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when requesting changes" />
                </div>
                <button className="btn btn-primary btn-full" disabled={approving || !review}
                  onClick={() => act(() => approve({ variables: { userUuid: previewUuid, note: note || null } }), "adminApproveSite")}>
                  ✓ Approve & publish
                </button>
                <button className="btn btn-danger btn-full" disabled={rejecting || !review || !note.trim()}
                  onClick={() => act(() => reject({ variables: { userUuid: previewUuid, note } }), "adminRejectSite")}>
                  Request changes
                </button>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

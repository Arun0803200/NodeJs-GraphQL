import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { PUBLIC_REVIEWS, SUBMIT_REVIEW } from "../../api/queries";
import type { Lang, PortfolioContent, RatingType, ReviewTarget } from "../types";
import { ReviewsContext, useReviews, type ReviewItem, type ReviewsCtx, type Summary } from "./reviewsContext";
import { pick } from "../../lib/siteConfig";
import { travelText, type TravelT } from "./labels";

// ─── Stars ───

export function Stars({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span className="trv-stars" role="img" aria-label={label ?? `${value} / 5`}>
      <span className="trv-stars-bg" aria-hidden="true">★★★★★</span>
      <span className="trv-stars-fg" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

function StarInput({ value, onChange, label, t, small = false }: { value: number; onChange: (n: number) => void; label: string; t: TravelT; small?: boolean }) {
  const name = useId();
  const [hover, setHover] = useState(0);
  return (
    <fieldset className={`trv-star-input${small ? " sm" : ""}`} onMouseLeave={() => setHover(0)}>
      <legend className="trv-label">{label}</legend>
      <div className="trv-star-row">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={(hover || value) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} title={t("stars", { n })}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} aria-label={t("stars", { n })} />
            <span aria-hidden="true">★</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ─── Sample data for previews (no published site yet) ───

function sampleData(content: PortfolioContent, types: RatingType[]): { summary: Summary[]; reviews: ReviewItem[] } {
  const summary: Summary[] = [];
  const reviews: ReviewItem[] = [];
  const quotes = content.testimonials.filter((x) => x.text.trim());
  let id = -1;
  const now = Date.now();
  for (const type of types) {
    const targets: (string | null)[] = type.target === "business" ? [null]
      : (type.target === "driver" ? content.travel.drivers : content.travel.vehicles).filter((x) => x.name).map((x) => x.id);
    targets.forEach((targetId, i) => {
      const avg = [4.8, 4.6, 4.9, 4.7][i % 4];
      summary.push({ typeId: type.id, target: type.target, targetId, avg, count: 12 - i * 3, criteria: type.criteria.map((c, j) => ({ id: c.id, avg: Math.min(5, avg - 0.1 * j) })) });
      const q = quotes[i % Math.max(1, quotes.length)];
      reviews.push({
        id: id--, typeId: type.id, target: type.target, targetId, rating: 5,
        criteria: Object.fromEntries(type.criteria.map((c) => [c.id, 5])),
        comment: type.target === "business" && q ? q.text : null, reviewerName: q?.name || "Customer",
        ownerReply: null, createdAt: new Date(now - (i + 2) * 86400_000).toISOString(),
      });
    });
  }
  return { summary, reviews };
}

// ─── Provider: loads approved reviews once for the whole page ───

export function ReviewsProvider({ content, lang, owner, children }: { content: PortfolioContent; lang: Lang; owner?: string; children: ReactNode }) {
  const t = useMemo(() => travelText(lang), [lang]);
  const cfg = content.reviews;
  const types = useMemo(() => cfg.types.filter((x) => x.enabled && (x.label.en || x.label.ta)), [cfg.types]);
  const { data, refetch } = useQuery<any>(PUBLIC_REVIEWS, { variables: { userName: owner ?? "" }, skip: !owner || !cfg.enabled });
  const sample = !owner;
  const live = data?.publicReviews;
  const fallback = useMemo(() => (sample ? sampleData(content, types) : { summary: [], reviews: [] }), [sample, content, types]);
  const [dialog, setDialog] = useState<{ typeId?: string; targetId?: string } | null>(null);
  const open = useCallback((typeId?: string, targetId?: string) => setDialog({ typeId, targetId }), []);
  const typesFor = useCallback((target: ReviewTarget) => types.filter((x) => x.target === target), [types]);

  if (!cfg.enabled || types.length === 0) return <>{children}</>;
  const value: ReviewsCtx = {
    types, sample, lang, t, open, typesFor, ownerName: content.fullName || "us",
    summary: sample ? fallback.summary : live?.summary ?? [],
    reviews: sample ? fallback.reviews : live?.reviews ?? [],
  };
  return (
    <ReviewsContext.Provider value={value}>
      {children}
      {dialog && <ReviewDialog content={content} owner={owner} initial={dialog} onClose={() => setDialog(null)} onSaved={() => refetch()} />}
    </ReviewsContext.Provider>
  );
}

// ─── Review list ───

function ReviewList({ items, max }: { items: ReviewItem[]; max: number }) {
  const r = useReviews()!;
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, max);
  const typeOf = (id: string) => r.types.find((x) => x.id === id);
  return (
    <>
      <ul className="trv-review-list">
        {shown.map((x) => (
          <li key={x.id} className="trv-review">
            <div className="trv-review-head">
              <span className="trv-review-avatar" aria-hidden="true">{x.reviewerName[0]?.toUpperCase()}</span>
              <div>
                <strong>{x.reviewerName}</strong>
                <small>{new Date(x.createdAt).toLocaleDateString(r.lang === "ta" ? "ta-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
              </div>
              <Stars value={x.rating} label={r.t("stars", { n: x.rating })} />
            </div>
            {Object.keys(x.criteria).length > 0 && (
              <ul className="trv-review-criteria">
                {(typeOf(x.typeId)?.criteria ?? []).filter((c) => x.criteria[c.id]).map((c) => (
                  <li key={c.id}>{pick(c.label, r.lang)} <b>{x.criteria[c.id]}★</b></li>
                ))}
              </ul>
            )}
            {x.comment && <p className="trv-review-text">{x.comment}</p>}
            {x.ownerReply && <p className="trv-review-reply"><b>{r.t("ownerReply", { name: r.ownerName })}:</b> {x.ownerReply}</p>}
          </li>
        ))}
      </ul>
      {items.length > max && (
        <button type="button" className="trv-link" onClick={() => setShowAll((v) => !v)}>{showAll ? r.t("hideReviews") : `${r.t("seeReviews")} (${items.length})`}</button>
      )}
    </>
  );
}

const countText = (t: TravelT, n: number) => (n === 1 ? t("basedOne") : t("basedOn", { n }));

// ─── Common (business) reviews section ───

export function ReviewsSection() {
  const r = useReviews();
  if (!r) return null;
  const business = r.typesFor("business");
  const items = r.reviews.filter((x) => x.target === "business");
  return (
    <div className="trv-reviews">
      {r.sample && <p className="trv-preview-note">{r.t("sampleReviews")}</p>}
      {business.length > 0 && (
        <div className="trv-review-summaries">
          {business.map((type) => {
            const s = r.summary.find((x) => x.typeId === type.id && !x.targetId);
            return (
              <div key={type.id} className="trv-review-summary">
                <span className="trv-label">{pick(type.label, r.lang)}</span>
                <div className="trv-review-score">
                  <strong>{s ? s.avg.toFixed(1) : "–"}</strong>
                  <div><Stars value={s?.avg ?? 0} label={s ? r.t("stars", { n: s.avg }) : undefined} /><small>{countText(r.t, s?.count ?? 0)}</small></div>
                </div>
                {type.criteria.length > 0 && (
                  <ul className="trv-criteria-bars">
                    {type.criteria.map((c) => {
                      const avg = s?.criteria.find((x) => x.id === c.id)?.avg ?? 0;
                      return (
                        <li key={c.id}>
                          <span>{pick(c.label, r.lang)}</span>
                          <span className="trv-bar"><span style={{ width: `${(avg / 5) * 100}%` }} /></span>
                          <b>{avg ? avg.toFixed(1) : "–"}</b>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button type="button" className="trv-btn trv-btn-primary trv-btn-sm" onClick={() => r.open(type.id)}>{r.t("writeReview")}</button>
              </div>
            );
          })}
        </div>
      )}
      {items.length > 0 ? <ReviewList items={items} max={6} /> : business.length > 0 && <p className="trv-quote-empty">{r.t("noReviews")}</p>}
      {business.length === 0 && (
        <button type="button" className="trv-btn trv-btn-primary" onClick={() => r.open()}>{r.t("writeReview")}</button>
      )}
    </div>
  );
}

// ─── Rating on a driver / vehicle card ───

export function EntityRating({ target, targetId }: { target: "driver" | "vehicle"; targetId: string }) {
  const r = useReviews();
  const [openList, setOpenList] = useState(false);
  if (!r) return null;
  const types = r.typesFor(target);
  if (types.length === 0) return null;
  const sums = r.summary.filter((x) => x.target === target && x.targetId === targetId);
  const count = sums.reduce((n, s) => n + s.count, 0);
  const avg = count ? sums.reduce((n, s) => n + s.avg * s.count, 0) / count : 0;
  const items = r.reviews.filter((x) => x.target === target && x.targetId === targetId);
  return (
    <div className="trv-entity-rating">
      <div className="trv-entity-rating-row">
        {count > 0 ? (
          <button type="button" className="trv-entity-score" onClick={() => setOpenList((v) => !v)} aria-expanded={openList}>
            <Stars value={avg} label={r.t("stars", { n: avg.toFixed(1) })} /> <b>{avg.toFixed(1)}</b> <small>({count})</small>
          </button>
        ) : <small className="trv-entity-none">{r.t("noReviews").split(".")[0]}</small>}
        <button type="button" className="trv-btn trv-btn-ghost trv-btn-sm" onClick={() => r.open(types[0].id, targetId)}>★ {r.t("rateThis")}</button>
      </div>
      {openList && items.length > 0 && <ReviewList items={items} max={3} />}
    </div>
  );
}

// ─── Write-a-review dialog ───

function ReviewDialog({ content, owner, initial, onClose, onSaved }: {
  content: PortfolioContent; owner?: string; initial: { typeId?: string; targetId?: string }; onClose: () => void; onSaved: () => void;
}) {
  const r = useReviews()!;
  const { t, lang } = r;
  const ref = useRef<HTMLDialogElement>(null);
  const [typeId, setTypeId] = useState(initial.typeId ?? r.types[0]?.id ?? "");
  const type = r.types.find((x) => x.id === typeId);
  const [targetId, setTargetId] = useState(initial.targetId ?? "");
  const [rating, setRating] = useState(0);
  const [criteria, setCriteria] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ comment: "", name: "", phone: "", company: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [submit, { loading }] = useMutation<any>(SUBMIT_REVIEW);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { if (d?.open) d.close(); };
  }, []);

  const targets = type?.target === "driver" ? content.travel.drivers : type?.target === "vehicle" ? content.travel.vehicles : [];
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!type) return;
    if (type.target !== "business" && !targetId) { setError(t("errTarget")); return; }
    if (!rating) { setError(t("errRating")); return; }
    if (form.name.trim().length < 2) { setError(t("errName")); return; }
    if (!owner) return;
    const { data } = await submit({ variables: { input: {
      userName: owner, typeId, targetId: type.target === "business" ? null : targetId, rating, criteria,
      comment: form.comment.trim() || null, reviewerName: form.name.trim(), reviewerPhone: form.phone.trim() || null, lang, company: form.company,
    } } });
    const res = data?.submitReview;
    if (res?.status !== 1) { setError(res?.message ?? "Could not send your review"); return; }
    setDone(res.message);
    onSaved();
  };

  return (
    <dialog ref={ref} className="trv-modal" aria-labelledby="trv-review-title" onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="trv-modal-inner">
        <button type="button" className="trv-modal-close" onClick={onClose} aria-label={t("close")}>✕</button>
        {done ? (
          <div className="trv-done" role="status">
            <span className="trv-done-icon" aria-hidden="true">★</span>
            <h3 id="trv-review-title">{t("formDoneTitle")}</h3>
            <p>{done}</p>
            <button type="button" className="trv-btn trv-btn-primary" onClick={onClose}>{t("close")}</button>
          </div>
        ) : (
          <form className="trv-form" onSubmit={send} noValidate>
            <h2 id="trv-review-title">{t("reviewTitle")}</h2>
            {r.types.length > 1 && (
              <label className="trv-field"><span className="trv-label">{t("reviewWhat")}</span>
                <select value={typeId} onChange={(e) => { setTypeId(e.target.value); setTargetId(""); setCriteria({}); }}>
                  {r.types.map((x) => <option key={x.id} value={x.id}>{pick(x.label, lang)}</option>)}
                </select>
              </label>
            )}
            {type && type.target !== "business" && (
              <label className="trv-field"><span className="trv-label">{t("reviewWho")}</span>
                <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">{t("chooseOne")}</option>
                  {targets.filter((x) => x.name).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
            )}
            <StarInput value={rating} onChange={setRating} label={t("yourRating")} t={t} />
            {type && type.criteria.length > 0 && (
              <div className="trv-criteria-inputs">
                <span className="trv-label">{t("ratingParts")}</span>
                {type.criteria.map((c) => (
                  <StarInput key={c.id} small value={criteria[c.id] ?? 0} onChange={(n) => setCriteria((x) => ({ ...x, [c.id]: n }))} label={pick(c.label, lang)} t={t} />
                ))}
              </div>
            )}
            <label className="trv-field"><span className="trv-label">{t("yourReview")}</span><textarea rows={3} maxLength={2000} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder={t("reviewPh")} /></label>
            <div className="trv-grid-2">
              <label className="trv-field"><span className="trv-label">{t("reviewName")}</span><input value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
              <label className="trv-field"><span className="trv-label">{t("reviewPhone")}</span><input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label>
            </div>
            <input className="trv-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            {error && <p className="trv-error" role="alert">{error}</p>}
            {!owner && <p className="trv-preview-note">{t("previewOnly")}</p>}
            <button type="submit" className="trv-btn trv-btn-primary trv-btn-full" disabled={loading || !owner}>{loading ? t("submittingReview") : t("submitReview")}</button>
          </form>
        )}
      </div>
    </dialog>
  );
}

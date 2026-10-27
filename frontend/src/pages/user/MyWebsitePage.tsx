import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { MY_SITE, UNPUBLISH_MY_SITE, SAVE_MY_SITE } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { TemplateThumbnail } from "../../components/guest/TemplateThumbnail";
import { LANGS, LANG_NAMES, parseSite } from "../../lib/templates";
import { SAMPLE_PERSONAS } from "../../templates/samples";
import { LangSwitch, useUiLang } from "../../i18n/UiLang";
import type { Lang, PortfolioContent } from "../../templates/types";

// Which sample a language version was started from and not yet edited (its name or headline is still the sample's)
function leftoverSample(c: PortfolioContent | undefined, lang: Lang) {
  if (!c) return null;
  const p = SAMPLE_PERSONAS.find((x) => {
    const s = x.content[lang];
    return (s.fullName && c.fullName.trim() === s.fullName) || (s.headline && c.headline.trim() === s.headline);
  });
  return p ? { label: p.label.en, name: c.fullName } : null;
}

const REVIEW_LABELS: Record<string, { label: string; tone: string; text: string }> = {
  draft: { label: "Not submitted", tone: "draft", text: "You have changes that haven't been submitted for approval yet." },
  pending: { label: "Pending approval", tone: "pending", text: "Our team is reviewing your website. We'll email you once it's approved." },
  approved: { label: "Approved", tone: "live", text: "Your latest changes are approved and live." },
  rejected: { label: "Changes requested", tone: "rejected", text: "An admin asked for changes before your website can go live." },
};

export function MyWebsitePage() {
  const { data, loading, refetch } = useQuery<any>(MY_SITE);
  const [unpublish, { loading: unpublishing }] = useMutation<any>(UNPUBLISH_MY_SITE);
  const [saveSite, { loading: submitting }] = useMutation<any>(SAVE_MY_SITE);
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  const { lang: uiLang } = useUiLang();
  const site = data?.mySite?.data;
  const parsed = useMemo(() => (site ? parseSite(site.contentJson) : null), [site]);
  const languages = parsed ? LANGS.filter((l) => parsed.languages[l]) : [];
  const leftovers = languages.map((l) => ({ lang: l, sample: leftoverSample(parsed?.languages[l], l) })).filter((x) => x.sample);
  // Show the version the owner actually worked on: their UI language, then the default, avoiding untouched sample text
  const preferred = [uiLang, parsed?.defaultLang, ...languages].filter((l): l is Lang => !!l && languages.includes(l as Lang));
  const initialLang = preferred.find((l) => !leftovers.some((x) => x.lang === l)) ?? preferred[0] ?? "en";
  const [previewLang, setPreviewLang] = useState<Lang | null>(null);
  const shownLang = previewLang && languages.includes(previewLang) ? previewLang : initialLang;

  if (loading) return <div className="page"><p>Loading...</p></div>;

  if (!site) {
    return (
      <div className="page">
        <h1>My Website</h1>
        <div className="form-card website-empty">
          <h3>You haven't created a website yet</h3>
          <p className="text-muted">Pick a template, add your details and photos, then submit it for approval.</p>
          <Link to="/" className="btn btn-primary">Browse templates</Link>
        </div>
      </div>
    );
  }

  const url = `${window.location.origin}/${site.userName}`;
  const review = REVIEW_LABELS[site.status] ?? REVIEW_LABELS.draft;
  const run = async (action: () => Promise<any>, key: string) => {
    try {
      const { data } = await action();
      const res = data[key];
      setAlert({ type: res.status === 1 ? "success" : "error", message: res.message });
      refetch();
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  const submit = () => run(() => saveSite({ variables: { templateId: site.templateId, contentJson: site.contentJson, publish: true } }), "saveMySite");

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Website</h1>
        <span className={`status-pill ${site.isPublished ? "live" : "draft"}`}>{site.isPublished ? "● Live" : "Offline"}</span>
      </div>
      <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />

      <div className={`review-banner review-${review.tone}`}>
        <div>
          <strong>{review.label}</strong>
          <p>{review.text}</p>
          {site.reviewNote && <p className="review-banner-note">Reviewer note: “{site.reviewNote}”</p>}
        </div>
        {(site.status === "draft" || site.status === "rejected") && (
          <button className="btn btn-primary" disabled={submitting} onClick={submit}>{site.status === "rejected" ? "Resubmit" : "Submit for approval"}</button>
        )}
      </div>

      {leftovers.length > 0 && (
        <div className="review-banner review-rejected sample-warning">
          <div>
            <strong>Sample text still in your website</strong>
            {leftovers.map(({ lang, sample }) => (
              <p key={lang}>
                Your <b>{LANG_NAMES[lang]}</b> version still shows the “{sample!.label}” sample{sample!.name ? <> (name: “{sample!.name}”)</> : null}.
                Edit it, or remove that language in the builder, so visitors don't see sample details.
              </p>
            ))}
          </div>
          <Link to={`/templates/${site.templateSlug}/customize?lang=${leftovers[0].lang}`} className="btn btn-primary">Edit {LANG_NAMES[leftovers[0].lang]} version</Link>
        </div>
      )}

      <div className="website-card">
        <div className="website-thumb">
          {languages.length > 1 && (
            <div className="website-thumb-bar">
              <span>Preview</span>
              <LangSwitch value={shownLang} onChange={setPreviewLang} className="lang-switch-sm" />
            </div>
          )}
          <TemplateThumbnail designKey={site.designKey} content={parsed!.languages[shownLang]!} lang={shownLang} />
        </div>
        <div className="website-info">
          <div className="detail-grid">
            <div><strong>Template</strong>{site.templateName}</div>
            <div><strong>Languages</strong>{languages.map((l) => LANG_NAMES[l]).join(" · ")}{languages.length > 1 && parsed ? <span className="text-muted"> (default: {LANG_NAMES[parsed.defaultLang]})</span> : null}</div>
            <div><strong>Portfolio URL</strong>{site.isPublished ? <a href={url} target="_blank" rel="noreferrer">{url}</a> : <span className="text-muted">{url} (goes live after approval)</span>}</div>
            {site.submittedAt && <div><strong>Last submitted</strong>{new Date(site.submittedAt).toLocaleString()}</div>}
            {site.publishedAt && <div><strong>Last approved</strong>{new Date(site.publishedAt).toLocaleString()}</div>}
          </div>
          <div className="website-actions">
            <Link to={`/templates/${site.templateSlug}/customize?lang=${shownLang}`} className="btn btn-primary">Edit website</Link>
            <Link to="/" className="btn btn-secondary">Change template</Link>
            {site.isPublished && (
              <button className="btn btn-danger" disabled={unpublishing} onClick={() => window.confirm("Take your website offline? You'll need approval again to republish.") && run(() => unpublish(), "unpublishMySite")}>Take offline</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

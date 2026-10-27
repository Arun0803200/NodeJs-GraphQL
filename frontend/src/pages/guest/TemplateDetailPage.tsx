import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { TEMPLATE_BY_SLUG, TEMPLATES } from "../../api/queries";
import type { TemplateItem } from "../../lib/templates";
import { isFree, loadDraft, siteContentFor } from "../../lib/templates";
import { SAMPLE_PERSONAS, defaultPersonaFor, getPersona } from "../../templates/samples";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import { Price } from "../../components/guest/Price";
import { TemplateCard } from "../../components/guest/TemplateCard";
import { LangSwitch, useUiLang } from "../../i18n/UiLang";

type Device = "desktop" | "mobile";
const MY_DETAILS = "__mine";

export function TemplateDetailPage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const { lang, setLang, t } = useUiLang();
  const [device, setDevice] = useState<Device>("desktop");
  const [chosen, setSource] = useState<string | null>(params.get("for") ? getPersona(params.get("for")).key : null);
  const { data, loading } = useQuery<any>(TEMPLATE_BY_SLUG, { variables: { slug } });
  const { data: listData } = useQuery<any>(TEMPLATES);
  const template: TemplateItem | undefined = data?.template?.data;
  const source = chosen ?? defaultPersonaFor(template?.designKey);
  const draft = loadDraft();

  if (loading) return <div className="guest-container detail-loading"><div className="skeleton" style={{ height: 480 }} /></div>;
  if (!template) {
    return (
      <div className="guest-container empty-page">
        <h1>{t("detail.notFound")}</h1>
        <p className="text-muted">{t("detail.notFoundText")}</p>
        <Link to="/" className="btn btn-primary">{t("home.browse")}</Link>
      </div>
    );
  }

  // Samples always carry photos, so every template is shown at its best; "My details" previews the visitor's draft
  const preview = source === MY_DETAILS && draft ? siteContentFor(draft, lang) : { lang, content: getPersona(source).content[lang] };
  const personaQuery = source !== MY_DETAILS && source !== "corporate" ? `?for=${source}` : "";

  const related = ((listData?.templates?.data ?? []) as TemplateItem[])
    .filter((x) => x.id !== template.id && x.category === template.category)
    .slice(0, 3);

  return (
    <div className="guest-container detail">
      <nav className="breadcrumb"><Link to="/">{t("nav.templates")}</Link> <span>/</span> <Link to={`/?category=${template.category}`}>{isFree(template) ? t("nav.free") : t("nav.premium")}</Link> <span>/</span> {template.name}</nav>

      <div className="detail-grid-layout">
        <section className="detail-preview">
          <div className="preview-toolbar">
            <span className="browser-dots"><i /><i /><i /></span>
            <select className="select select-sm preview-source" value={source} onChange={(e) => setSource(e.target.value)} aria-label={t("detail.previewWith")}>
              {SAMPLE_PERSONAS.map((p) => <option key={p.key} value={p.key}>{p.icon} {p.label[lang]}</option>)}
              {draft && <option value={MY_DETAILS}>👤 {t("detail.myDetails")}</option>}
            </select>
            <LangSwitch value={lang} onChange={setLang} className="lang-switch-sm" />
            <div className="segmented segmented-sm">
              {(["desktop", "mobile"] as Device[]).map((d) => (
                <button key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)}>{d === "desktop" ? t("detail.desktop") : t("detail.mobile")}</button>
              ))}
            </div>
          </div>
          <div className={`preview-stage preview-${device}`}>
            <div className="preview-screen">
              <TemplateRenderer designKey={template.designKey} content={preview.content} lang={preview.lang} />
            </div>
          </div>
        </section>

        <aside className="detail-panel">
          <span className={`badge badge-inline ${isFree(template) ? "badge-free" : "badge-premium"}`}>{isFree(template) ? t("detail.freeVersion") : t("detail.premiumVersion")}</span>
          <h1>{template.name}</h1>
          <Price template={template} size="lg" />
          <p className="detail-desc">{template.description}</p>
          <div className="tag-row">{template.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
          <Link to={`/templates/${template.slug}/customize${personaQuery}`} className="btn btn-primary btn-lg btn-full">{t("detail.use")}</Link>
          <ul className="feature-list">
            <li>{t("detail.f1")}</li>
            <li>{t("detail.f2")}</li>
            <li>{t("detail.f3")}: {window.location.host}/<em>username</em></li>
            <li>{t("detail.f4")}</li>
            <li>{t("detail.f5")}</li>
            {!isFree(template) && <li>{t("detail.f6")}</li>}
          </ul>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="related">
          <h2>{t("detail.more")}</h2>
          <div className="tpl-grid">
            {related.map((x) => <TemplateCard key={x.id} template={x} content={getPersona(source === MY_DETAILS ? null : source).content[lang]} lang={lang} query={personaQuery} />)}
          </div>
        </section>
      )}
    </div>
  );
}

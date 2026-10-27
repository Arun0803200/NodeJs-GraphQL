import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { TEMPLATES } from "../../api/queries";
import type { TemplateItem } from "../../lib/templates";
import { hasDiscount } from "../../lib/templates";
import { TemplateCard } from "../../components/guest/TemplateCard";
import { TemplateThumbnail } from "../../components/guest/TemplateThumbnail";
import { SAMPLE_PERSONAS, getPersona } from "../../templates/samples";
import { useUiLang } from "../../i18n/UiLang";

type Category = "all" | "free" | "premium";
type Sort = "recommended" | "price-asc" | "price-desc";

const effectivePrice = (t: TemplateItem) => (hasDiscount(t) ? t.discountPrice! : t.originalPrice);

export function HomePage() {
  const { lang, t } = useUiLang();
  const [params, setParams] = useSearchParams();
  const category = (["free", "premium"].includes(params.get("category") ?? "") ? params.get("category") : "all") as Category;
  const persona = getPersona(params.get("for"));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const { data, loading, error } = useQuery<any>(TEMPLATES);

  const all: TemplateItem[] = data?.templates?.data ?? [];
  const counts = { all: all.length, free: all.filter((x) => x.category === "free").length, premium: all.filter((x) => x.category === "premium").length };
  // Only an explicit "Show samples for" choice overrides each design's own sample
  const sample = params.get("for") ? persona.content[lang] : undefined;
  const personaQuery = persona.key === "corporate" ? "" : `?for=${persona.key}`;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = all.filter((x) =>
      (category === "all" || x.category === category) &&
      (!q || [x.name, x.description, ...x.tags].some((v) => v.toLowerCase().includes(q))));
    if (sort === "price-asc") return [...list].sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === "price-desc") return [...list].sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return list;
  }, [all, category, search, sort]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const heroDesigns = all.filter((x) => ["executive-navy", "techlead-midnight", "product-aurora"].includes(x.designKey));

  return (
    <>
      <section className="hero">
        <div className="guest-container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">{t("home.eyebrow")}</span>
            <h1>{t("home.title1")} <span className="text-gradient">{t("home.title2")}</span>.</h1>
            <p>{t("home.subtitle")}</p>
            <div className="hero-cta">
              <a href="#templates" className="btn btn-primary btn-lg">{t("home.browse")}</a>
              <Link to={`/templates/classic-clean/customize${personaQuery}`} className="btn btn-outline btn-lg">{t("home.startFree")}</Link>
            </div>
            <ul className="hero-stats">
              <li><strong>{counts.all || 20}</strong><span>{t("home.statTemplates")}</span></li>
              <li><strong>{counts.free || 2}</strong><span>{t("home.statFree")}</span></li>
              <li><strong>2</strong><span>{t("home.statLanguages")}</span></li>
            </ul>
          </div>
          <div className="hero-visual" aria-hidden="true">
            {heroDesigns.map((x, i) => (
              <div key={x.id} className={`hero-shot hero-shot-${i + 1}`}><TemplateThumbnail designKey={x.designKey} content={sample} lang={lang} /></div>
            ))}
          </div>
        </div>
      </section>

      <section className="steps guest-container">
        {[
          ["1", t("home.step1Title"), t("home.step1Text")],
          ["2", t("home.step2Title"), t("home.step2Text")],
          ["3", t("home.step3Title"), t("home.step3Text")],
        ].map(([n, title, text]) => (
          <div key={n} className="step">
            <span className="step-num">{n}</span>
            <div><h3>{title}</h3><p>{text}</p></div>
          </div>
        ))}
      </section>

      <section id="templates" className="guest-container catalog">
        <div className="catalog-head">
          <div>
            <h2>{t("home.catalogTitle")}</h2>
            <p className="text-muted">{t("home.catalogText")}</p>
          </div>
          <div className="catalog-tools">
            <input className="search-input" type="search" placeholder={t("home.search")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("home.search")} />
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
              <option value="recommended">{t("home.sortRecommended")}</option>
              <option value="price-asc">{t("home.sortLow")}</option>
              <option value="price-desc">{t("home.sortHigh")}</option>
            </select>
          </div>
        </div>

        <div className="persona-bar">
          <span className="persona-label">{t("home.iAm")}</span>
          <div className="persona-chips">
            {SAMPLE_PERSONAS.map((p) => (
              <button key={p.key} type="button" className={`persona-chip${p.key === persona.key ? " active" : ""}`}
                onClick={() => setParam("for", p.key === "corporate" ? null : p.key)} aria-pressed={p.key === persona.key}>
                <span aria-hidden="true">{p.icon}</span> {p.label[lang]}
              </button>
            ))}
          </div>
        </div>

        <div className="segmented" role="tablist">
          {(["all", "free", "premium"] as Category[]).map((c) => (
            <button key={c} role="tab" aria-selected={category === c} className={category === c ? "active" : ""} onClick={() => setParam("category", c === "all" ? null : c)}>
              {c === "all" ? t("home.all") : c === "free" ? t("home.freeVersion") : t("home.premiumVersion")}
              <span className="count">{counts[c]}</span>
            </button>
          ))}
        </div>

        {loading && <div className="tpl-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="tpl-card skeleton" />)}</div>}
        {error && <p className="empty-state">{t("home.loadError")}</p>}
        {!loading && !error && visible.length === 0 && <p className="empty-state">{t("home.noMatch")}</p>}
        <div className="tpl-grid">
          {visible.map((x) => <TemplateCard key={x.id} template={x} content={sample} lang={lang} query={personaQuery} />)}
        </div>
      </section>

      <section className="cta-band">
        <div className="guest-container cta-band-inner">
          <div>
            <h2>{t("home.ctaTitle")}</h2>
            <p>{t("home.ctaText")}</p>
          </div>
          <Link to={`/templates/classic-clean/customize${personaQuery}`} className="btn btn-light btn-lg">{t("home.ctaButton")}</Link>
        </div>
      </section>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useUndoable } from "../../lib/useUndoable";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { MY_SITE, SAVE_MY_SITE, TEMPLATES } from "../../api/queries";
import { useAuth } from "../../context/AuthContext";
import type {
  CertificateItem, EducationItem, ExperienceItem, Lang, PortfolioContent, ProjectItem, ServiceItem, SiteContent, TestimonialItem, TravelConfig,
} from "../../templates/types";
import { getDesign } from "../../templates/registry";
import { NEW_DRIVER, NEW_VEHICLE } from "../../lib/travel";
import { contactFieldsFor, sectionsFor, type BuilderSection } from "../../templates/sections";
import { FormsEditor, PageLayoutEditor, ReviewsEditor } from "../../components/builder/EngagementEditors";
import { EMPTY_CONTENT } from "../../templates/sampleContent";
import { SAMPLE_PERSONAS, defaultPersonaFor, getPersona, type PersonaKey } from "../../templates/samples";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import type { TemplateItem } from "../../lib/templates";
import { LANGS, LANG_NAMES, cleanContent, isFree, loadDraft, parseSite, saveDraft, serializeSite } from "../../lib/templates";
import { BRAND_NAME } from "../../lib/brand";
import { Price } from "../../components/guest/Price";
import { AuthModal } from "../../components/auth/AuthModal";
import { Alert } from "../../components/ui/Alert";
import { AlbumEditor, ImageField } from "../../components/guest/ImageInputs";
import { LangSwitch, useUiLang, type UiKey } from "../../i18n/UiLang";

type Device = "desktop" | "mobile";
type MobilePane = "edit" | "preview";

const NEW_EXPERIENCE: ExperienceItem = { role: "", company: "", location: "", start: "", end: "", highlights: "" };
const NEW_EDUCATION: EducationItem = { degree: "", school: "", start: "", end: "", details: "" };
const NEW_PROJECT: ProjectItem = { name: "", description: "", link: "", tech: "", imageUrl: "" };
const NEW_CERTIFICATE: CertificateItem = { name: "", issuer: "", year: "", link: "", imageUrl: "" };
const NEW_SERVICE: ServiceItem = { name: "", description: "", price: "", imageUrl: "" };
const NEW_TESTIMONIAL: TestimonialItem = { name: "", role: "", text: "" };

const SECTION_TITLE: Record<BuilderSection, UiKey> = {
  basics: "b.basics", travel: "tr.section", contact: "b.contact", services: "b.services", album: "b.album", experience: "b.experience",
  certificates: "b.certificates", testimonials: "b.testimonials", education: "b.education", skills: "b.skills", projects: "b.projects", more: "b.more",
  reviews: "rv.section", forms: "fm.section", layout: "ly.section",
};

// Same in every language: editing them in one language updates all
const SHARED_FIELDS: (keyof PortfolioContent)[] = ["photoUrl", "coverUrl", "email", "phone", "whatsapp", "website", "linkedin", "github", "travel", "reviews", "forms", "pageLayout"];

const personaSite = (key: PersonaKey): SiteContent => {
  const p = getPersona(key);
  return { defaultLang: "en", languages: { en: p.content.en, ta: p.content.ta } };
};

const sharedFrom = (c?: PortfolioContent) => (c ? Object.fromEntries(SHARED_FIELDS.map((f) => [f, c[f]])) : {});

// ─── Small editor controls ─────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; hint?: string;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}

function NumField({ label, value, onChange, hint, min = 0, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; min?: number; step?: number;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type="number" inputMode="decimal" min={min} step={step} value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(min, Number(e.target.value)))} />
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="form-group form-check builder-check">
      <label><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}

function TagInput({ label, values, onChange, placeholder, hint }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; hint: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const items = raw.split(",").map((s) => s.trim()).filter((s) => s && !values.includes(s));
    if (items.length) onChange([...values, ...items]);
    setDraft("");
  };
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="tag-input">
        {values.map((v) => (
          <span key={v} className="tag tag-removable">{v}<button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`}>×</button></span>
        ))}
        <input value={draft} placeholder={values.length ? "" : placeholder}
          onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(draft); }
            if (e.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)} />
      </div>
      <small className="field-hint">{hint}</small>
    </div>
  );
}

function Section({ title, icon, count, open, onToggle, children }: {
  title: string; icon: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <section className={`editor-section${open ? " open" : ""}`}>
      <button type="button" className="editor-section-head" onClick={onToggle} aria-expanded={open}>
        <span><span className="section-icon" aria-hidden="true">{icon}</span>{title}{count ? <span className="count">{count}</span> : null}</span>
        <span className="chevron" aria-hidden="true">▾</span>
      </button>
      {open && <div className="editor-section-body">{children}</div>}
    </section>
  );
}

function ListEditor<T extends object>({ items, onChange, blank, addLabel, titleOf, render }: {
  items: T[]; onChange: (items: T[]) => void; blank: T | (() => T); addLabel: string;
  titleOf: (item: T) => string; render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const { t } = useUiLang();
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div className="list-editor">
      {items.map((item, i) => (
        <div key={i} className="list-item">
          <div className="list-item-head">
            <strong>{titleOf(item) || `${t("b.item")} ${i + 1}`}</strong>
            <div className="list-item-actions">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("b.moveUp")}>↑</button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t("b.moveDown")}>↓</button>
              <button type="button" className="danger" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("b.remove")}>✕</button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))))}
        </div>
      ))}
      <button type="button" className="btn btn-dashed btn-full" onClick={() => onChange([...items, typeof blank === "function" ? (blank as () => T)() : { ...blank }])}>+ {addLabel}</button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────
export function CustomizePage() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { lang: uiLang, setLang: setUiLang, t } = useUiLang();

  const { data: templatesData } = useQuery<any>(TEMPLATES);
  const templates: TemplateItem[] = templatesData?.templates?.data ?? [];
  const template = templates.find((x) => x.slug === slug);

  // Start from: saved draft → ?for=<persona> sample → corporate sample
  const initialDraft = useRef(loadDraft());
  const hadDraft = useRef(initialDraft.current !== null);
  // Every edit goes through this history so the builder can undo/redo it
  const history = useUndoable<SiteContent>(() => initialDraft.current ?? personaSite(getPersona(params.get("for")).key));
  const { state: site, set: setSite, reset: resetSite, undo, redo, canUndo, canRedo } = history;
  // ?lang= (e.g. from My Website) opens that language version, otherwise the UI language when the site has it
  const askedLang = params.get("lang") === "ta" || params.get("lang") === "en" ? (params.get("lang") as Lang) : null;
  const [editLang, setEditLang] = useState<Lang>(() => (askedLang && site.languages[askedLang] ? askedLang : site.languages[uiLang] ? uiLang : site.defaultLang));

  const { data: siteData } = useQuery<any>(MY_SITE, { skip: !isAuthenticated });
  const savedSite = siteData?.mySite?.data;

  // A signed-in user without a local draft continues from their saved website
  useEffect(() => {
    if (savedSite && !hadDraft.current) {
      const parsed = parseSite(savedSite.contentJson);
      resetSite(parsed);
      setEditLang(askedLang && parsed.languages[askedLang] ? askedLang : parsed.languages[uiLang] ? uiLang : parsed.defaultLang);
      hadDraft.current = true;
    }
  }, [savedSite, uiLang, askedLang, resetSite]);

  useEffect(() => { saveDraft(site); }, [site]);

  // Opened a travel template directly (no draft, no sample chosen): start from the travels sample
  const [startFromDefault] = useState(() => loadDraft() === null && !params.get("for"));
  const appliedDefault = useRef(false);
  useEffect(() => {
    if (!template || !startFromDefault || appliedDefault.current || hadDraft.current) return;
    appliedDefault.current = true;
    const persona = defaultPersonaFor(template.designKey);
    if (persona !== "corporate") resetSite(personaSite(persona));
  }, [template, startFromDefault, resetSite]);

  const [device, setDevice] = useState<Device>("desktop");
  const [pane, setPane] = useState<MobilePane>("edit");
  const [openSection, setOpenSection] = useState<string>("basics");
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState<"submit" | "upload">("submit");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  const [saveSite, { loading: saving }] = useMutation<any>(SAVE_MY_SITE);

  const content = site.languages[editLang];
  const otherLang: Lang = editLang === "en" ? "ta" : "en";
  const preview = useMemo(() => (content ? cleanContent(content) : null), [content]);
  const languagesInSite = LANGS.filter((l) => site.languages[l]);

  const setContent = (updater: (c: PortfolioContent) => PortfolioContent) =>
    setSite((s) => (s.languages[editLang] ? { ...s, languages: { ...s.languages, [editLang]: updater(s.languages[editLang]!) } } : s));

  const set = <K extends keyof PortfolioContent>(key: K) => (value: PortfolioContent[K]) => {
    if (SHARED_FIELDS.includes(key)) {
      setSite((s) => ({
        ...s,
        languages: Object.fromEntries(Object.entries(s.languages).map(([l, c]) => [l, { ...c!, [key]: value }])) as SiteContent["languages"],
      }));
    } else {
      setContent((c) => ({ ...c, [key]: value }));
    }
  };
  const toggle = (id: string) => setOpenSection((s) => (s === id ? "" : id));

  // Ctrl/⌘+Z undo, Ctrl/⌘+Shift+Z or Ctrl+Y redo — for every builder change, including text boxes
  const shortcut = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === "z" && e.shiftKey) || (k === "y" && !e.metaKey)) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const setTravel = (patch: Partial<TravelConfig>) => content && set("travel")({ ...content.travel, ...patch });
  const isTravelDesign = template ? ["travel", "travelsplit"].includes(getDesign(template.designKey).layout) : false;
  // Only offer the sections this template renders; data in other sections is kept for templates that use it
  const shown = sectionsFor(template?.designKey);
  const has = (id: BuilderSection) => shown.has(id);
  const contactFields = contactFieldsFor(template?.designKey);
  const hiddenWithData = content ? ([
    ["experience", content.experience.length], ["certificates", content.certifications.length], ["education", content.education.length],
    ["skills", content.skills.length], ["projects", content.projects.length], ["more", content.achievements.length + content.languages.length],
  ] as [BuilderSection, number][]).filter(([id, n]) => !has(id) && n > 0).map(([id]) => id) : [];

  const loadPersona = (key: PersonaKey) => {
    if (!window.confirm(t("b.confirmReplace"))) return;
    setSite(personaSite(key));
  };

  // Adds the missing language: copied from the other one, the matching sample persona, or blank
  const addLanguage = (lang: Lang, from: "copy" | "sample" | "blank") => {
    setSite((s) => {
      const source = s.languages[lang === "en" ? "ta" : "en"];
      const persona = SAMPLE_PERSONAS.find((p) => LANGS.some((l) => p.content[l].fullName === source?.fullName)) ?? getPersona("corporate");
      const next =
        from === "copy" && source ? { ...source }
          : from === "sample" ? { ...persona.content[lang] }
            : { ...EMPTY_CONTENT, ...sharedFrom(source) };
      return { ...s, languages: { ...s.languages, [lang]: next } };
    });
  };

  const removeLanguage = (lang: Lang) => {
    if (!window.confirm(t("b.confirmRemoveLang", { lang: LANG_NAMES[lang] }))) return;
    const remaining = LANGS.find((l) => l !== lang && site.languages[l]);
    if (!remaining) return;
    setSite((s) => {
      const languages = { ...s.languages };
      delete languages[lang];
      return { defaultLang: remaining, languages };
    });
    setEditLang(remaining);
  };

  const persist = async (publish: boolean) => {
    if (!template) return;
    setAlert({ type: "success", message: "" });
    try {
      const { data } = await saveSite({ variables: { templateId: template.id, contentJson: serializeSite(site), publish } });
      const res = data.saveMySite;
      if (res.status !== 1) {
        setAlert({ type: "error", message: res.message });
        return;
      }
      if (publish) setSubmitted(true);
      else setAlert({ type: "success", message: t("b.draftSaved") });
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  const startPublish = () => {
    if (isAuthenticated) return setConfirmOpen(true);
    setAuthReason("submit");
    setAuthOpen(true);
  };
  // Uploads need an account; after signing in the visitor simply picks the file again
  const imageGate = { isAuthenticated, onRequireAuth: () => { setAuthReason("upload"); setAuthOpen(true); } };

  if (templatesData && !template) {
    return (
      <div className="empty-page">
        <h1>{t("b.notFound")}</h1>
        <Link to="/" className="btn btn-primary">{t("home.browse")}</Link>
      </div>
    );
  }

  const liveUrl = (name: string) => `${window.location.origin}/${name}`;

  return (
    <div className="builder">
      <header className="builder-bar">
        <div className="builder-bar-left">
          <Link to={template ? `/templates/${template.slug}` : "/"} className="icon-btn" aria-label={t("b.back")}>←</Link>
          <Link to="/" className="brand brand-compact"><span className="brand-mark">{BRAND_NAME[0]}</span></Link>
          <select className="select template-switch" value={slug} onChange={(e) => navigate(`/templates/${e.target.value}/customize`, { replace: true })} aria-label={t("nav.templates")}>
            {templates.map((x) => <option key={x.id} value={x.slug}>{x.name} {isFree(x) ? `· ${t("card.free")}` : `· ${t("nav.premium")}`}</option>)}
          </select>
          {template && <span className="builder-price"><Price template={template} /></span>}
        </div>
        <div className="builder-bar-right">
          <div className="undo-group" role="group" aria-label={t("b.history")}>
            <button type="button" className="undo-btn" onClick={undo} disabled={!canUndo} title={`${t("b.undo")} (${shortcut}Z)`} aria-label={t("b.undo")}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
              <span className="undo-label">{t("b.undo")}</span>
            </button>
            <button type="button" className="undo-btn" onClick={redo} disabled={!canRedo} title={`${t("b.redo")} (${shortcut}⇧Z)`} aria-label={t("b.redo")}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
              <span className="undo-label">{t("b.redo")}</span>
            </button>
          </div>
          <LangSwitch value={uiLang} onChange={setUiLang} className="lang-switch-sm ui-lang" />
          <div className="segmented segmented-sm device-toggle">
            {(["desktop", "mobile"] as Device[]).map((d) => (
              <button key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)}>{d === "desktop" ? t("detail.desktop") : t("detail.mobile")}</button>
            ))}
          </div>
          {isAuthenticated && <button className="btn btn-ghost" onClick={() => persist(false)} disabled={saving || !template}>{t("b.saveDraft")}</button>}
          <button className="btn btn-primary" onClick={startPublish} disabled={saving || !template}>{saving ? t("b.submitting") : t("b.publish")}</button>
        </div>
      </header>

      <div className="builder-mobile-tabs segmented">
        <button className={pane === "edit" ? "active" : ""} onClick={() => setPane("edit")}>{t("b.editTab")}</button>
        <button className={pane === "preview" ? "active" : ""} onClick={() => setPane("preview")}>{t("b.previewTab")}</button>
      </div>

      <div className={`builder-body pane-${pane}`}>
        <aside className="builder-editor">
          <div className="editor-intro">
            <h2>{t("b.yourDetails")}</h2>
            <p className="text-muted">{t("b.intro")}</p>
          </div>

          <div className="content-lang">
            <span className="content-lang-label">{t("b.contentLanguage")}</span>
            <div className="content-lang-tabs" role="tablist">
              {LANGS.map((l) => (
                <button key={l} role="tab" aria-selected={editLang === l} className={editLang === l ? "active" : ""} onClick={() => setEditLang(l)} lang={l}>
                  {LANG_NAMES[l]}{site.languages[l] ? "" : " +"}
                </button>
              ))}
            </div>
            {languagesInSite.length > 1 && site.languages[editLang] && (
              <label className="content-lang-default">
                <input type="checkbox" checked={site.defaultLang === editLang} onChange={() => setSite((s) => ({ ...s, defaultLang: editLang }))} />
                {t("b.defaultLanguage")}
              </label>
            )}
          </div>

          <div className="persona-picker">
            <span className="content-lang-label">{t("b.startFrom")}</span>
            <div className="persona-chips persona-chips-sm">
              {SAMPLE_PERSONAS.map((p) => (
                <button key={p.key} type="button" className="persona-chip" onClick={() => loadPersona(p.key)}>
                  <span aria-hidden="true">{p.icon}</span> {p.label[uiLang]}
                </button>
              ))}
              {content && (
                <button type="button" className="persona-chip persona-chip-ghost"
                  onClick={() => window.confirm(t("b.confirmClear")) && setContent((c) => ({ ...EMPTY_CONTENT, ...sharedFrom(c) }))}>
                  ✕ {t("b.startBlank")}
                </button>
              )}
            </div>
          </div>
          <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />
          {isTravelDesign && content && !content.travel.enabled && (
            <div className="travel-off-banner">
              <span>🚕 {t("tr.offBanner")}</span>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setTravel({ enabled: true }); setOpenSection("travel"); }}>{t("tr.turnOn")}</button>
            </div>
          )}

          {!content ? (
            <div className="missing-lang">
              <p>{t("b.missingLang", { lang: LANG_NAMES[editLang] })}</p>
              <div className="missing-lang-actions">
                {site.languages[otherLang] && <button className="btn btn-primary" onClick={() => addLanguage(editLang, "copy")}>{t("b.copyFrom", { lang: LANG_NAMES[otherLang] })}</button>}
                <button className="btn btn-secondary" onClick={() => addLanguage(editLang, "sample")}>{t("b.useSample")}</button>
                <button className="btn btn-ghost" onClick={() => addLanguage(editLang, "blank")}>{t("b.startBlank")}</button>
              </div>
            </div>
          ) : (
            <div lang={editLang}>
              <Section title={t("b.basics")} icon="👤" open={openSection === "basics"} onToggle={() => toggle("basics")}>
                <Field label={t("b.fullName")} value={content.fullName} onChange={set("fullName")} />
                <Field label={t("b.headline")} value={content.headline} onChange={set("headline")} placeholder={t("b.headlineHint")} />
                <TextArea label={t("b.summary")} value={content.summary} onChange={set("summary")} rows={5} />
                <ImageField label={t("b.photo")} value={content.photoUrl} onChange={set("photoUrl")} shape="round" {...imageGate} />
                <ImageField label={t("b.cover")} value={content.coverUrl} onChange={set("coverUrl")} shape="wide" hint={t("b.coverHint")} {...imageGate} />
              </Section>

              {has("travel") && (
                <Section title={t("tr.section")} icon="🚕" count={content.travel.enabled ? content.travel.vehicles.length || undefined : undefined} open={openSection === "travel"} onToggle={() => toggle("travel")}>
                  <Check label={t("tr.enable")} checked={content.travel.enabled} onChange={(v) => setTravel({ enabled: v })} hint={t("tr.enableHint")} />
                  {content.travel.enabled && (
                    <>
                      <Field label={t("tr.bookingWhatsapp")} value={content.travel.bookingWhatsapp} onChange={(v) => setTravel({ bookingWhatsapp: v.replace(/\D/g, "") })} type="tel" hint={t("tr.bookingWhatsappHint")} />

                      <h4 className="builder-subhead">{t("tr.rates")}</h4>
                      <div className="form-row">
                        <NumField label={t("tr.cityPerKm")} value={content.travel.cityPerKm} onChange={(v) => setTravel({ cityPerKm: v })} />
                        <NumField label={t("tr.longPerKm")} value={content.travel.longPerKm} onChange={(v) => setTravel({ longPerKm: v })} />
                      </div>
                      <div className="form-row">
                        <NumField label={t("tr.cityLimitKm")} value={content.travel.cityLimitKm} onChange={(v) => setTravel({ cityLimitKm: v })} hint={t("tr.cityLimitHint")} />
                        <NumField label={t("tr.cityMinFare")} value={content.travel.cityMinFare} onChange={(v) => setTravel({ cityMinFare: v })} />
                      </div>
                      <div className="form-row">
                        <NumField label={t("tr.driverBataPerDay")} value={content.travel.driverBataPerDay} onChange={(v) => setTravel({ driverBataPerDay: v })} />
                        <NumField label={t("tr.cityDriverBata")} value={content.travel.cityDriverBata} onChange={(v) => setTravel({ cityDriverBata: v })} />
                      </div>
                      <div className="form-row">
                        <NumField label={t("tr.oneWayMinKm")} value={content.travel.oneWayMinKm} onChange={(v) => setTravel({ oneWayMinKm: v })} />
                        <NumField label={t("tr.minKmPerDay")} value={content.travel.minKmPerDay} onChange={(v) => setTravel({ minKmPerDay: v })} />
                      </div>
                      <div className="form-row">
                        <NumField label={t("tr.tollPerPlaza")} value={content.travel.tollPerPlaza} onChange={(v) => setTravel({ tollPerPlaza: v })} hint={t("tr.tollHint")} />
                        <NumField label={t("tr.maxTripKm")} value={content.travel.maxTripKm} onChange={(v) => setTravel({ maxTripKm: v })} hint={t("tr.maxTripHint")} />
                      </div>

                      <h4 className="builder-subhead">{t("tr.vehicles")}</h4>
                      <ListEditor items={content.travel.vehicles} onChange={(vehicles) => setTravel({ vehicles })} blank={NEW_VEHICLE} addLabel={t("tr.addVehicle")}
                        titleOf={(x) => x.name}
                        render={(x, update) => (
                          <>
                            <div className="form-row">
                              <Field label={t("tr.vehicleName")} value={x.name} onChange={(v) => update({ name: v })} placeholder="Toyota Innova Crysta" />
                              <Field label={t("tr.vehicleType")} value={x.type} onChange={(v) => update({ type: v })} placeholder={t("tr.vehicleTypeHint")} />
                            </div>
                            <div className="form-row">
                              <NumField label={t("tr.seats")} value={x.seats} min={1} onChange={(v) => update({ seats: Math.max(1, Math.round(v)) })} />
                              <Check label={t("tr.ac")} checked={x.ac} onChange={(v) => update({ ac: v })} />
                            </div>
                            <Field label={t("tr.features")} value={x.features} onChange={(v) => update({ features: v })} />
                            <ImageField label={t("tr.vehicleImage")} value={x.imageUrl} onChange={(v) => update({ imageUrl: v })} shape="wide" {...imageGate} />
                            <small className="field-hint">{t("tr.vehicleRates")}</small>
                            <div className="form-row form-row-3">
                              <NumField label={t("tr.cityPerKm")} value={x.cityPerKm} onChange={(v) => update({ cityPerKm: v })} />
                              <NumField label={t("tr.longPerKm")} value={x.longPerKm} onChange={(v) => update({ longPerKm: v })} />
                              <NumField label={t("tr.tollPerPlaza")} value={x.tollPerPlaza} onChange={(v) => update({ tollPerPlaza: v })} />
                            </div>
                          </>
                        )} />

                      <h4 className="builder-subhead">{t("tr.drivers")}</h4>
                      <Check label={t("tr.showDrivers")} checked={content.travel.showDrivers} onChange={(v) => setTravel({ showDrivers: v })} />
                      {content.travel.showDrivers && <Check label={t("tr.allowChoice")} checked={content.travel.allowDriverChoice} onChange={(v) => setTravel({ allowDriverChoice: v })} />}
                      <ListEditor items={content.travel.drivers} onChange={(drivers) => setTravel({ drivers })} blank={NEW_DRIVER} addLabel={t("tr.addDriver")}
                        titleOf={(x) => x.name}
                        render={(x, update) => (
                          <>
                            <div className="form-row">
                              <Field label={t("tr.driverName")} value={x.name} onChange={(v) => update({ name: v })} />
                              <Field label={t("tr.driverPhone")} value={x.phone} onChange={(v) => update({ phone: v })} type="tel" />
                            </div>
                            <ImageField label={t("tr.driverPhoto")} value={x.photoUrl} onChange={(v) => update({ photoUrl: v })} shape="round" {...imageGate} />
                            <div className="form-row">
                              <NumField label={t("tr.experience")} value={x.experienceYears} onChange={(v) => update({ experienceYears: Math.round(v) })} />
                              <Field label={t("tr.driverLanguages")} value={x.languages} onChange={(v) => update({ languages: v })} placeholder="Tamil, English" />
                            </div>
                            <div className="form-row">
                              <Field label={t("tr.licenseNumber")} value={x.licenseNumber} onChange={(v) => update({ licenseNumber: v.toUpperCase() })} placeholder="TN09 20150001234" hint={t("tr.licenseHint")} />
                              <Field label={t("tr.licenseValid")} value={x.licenseValidTill} onChange={(v) => update({ licenseValidTill: v })} placeholder="2032" />
                            </div>
                            <ImageField label={t("tr.licenseImage")} value={x.licenseImageUrl} onChange={(v) => update({ licenseImageUrl: v })} shape="wide" {...imageGate} />
                            <Check label={t("tr.showLicense")} checked={x.showLicenseImage} onChange={(v) => update({ showLicenseImage: v })} hint={t("tr.showLicenseHint")} />
                          </>
                        )} />

                      <h4 className="builder-subhead">{t("tr.hiringHead")}</h4>
                      <Check label={t("tr.hiring")} checked={content.travel.driverHiring} onChange={(v) => setTravel({ driverHiring: v })} hint={t("tr.hiringHint")} />
                      {content.travel.driverHiring && (
                        <TextArea label={t("tr.hiringText")} value={content.hiringText} onChange={set("hiringText")} rows={4} placeholder={t("tr.hiringTextHint")} />
                      )}

                      <TextArea label={t("tr.terms")} value={content.travelTerms} onChange={set("travelTerms")} rows={4} placeholder={t("tr.termsHint")} />
                    </>
                  )}
                </Section>
              )}

              {has("reviews") && (
                <Section title={t("rv.section")} icon="★" count={content.reviews.enabled ? content.reviews.types.length || undefined : undefined} open={openSection === "reviews"} onToggle={() => toggle("reviews")}>
                  <ReviewsEditor content={content} lang={editLang} onChange={set("reviews")} />
                </Section>
              )}
              {has("forms") && (
                <Section title={t("fm.section")} icon="📝" count={content.forms.length || undefined} open={openSection === "forms"} onToggle={() => toggle("forms")}>
                  <FormsEditor content={content} lang={editLang} onChange={set("forms")} />
                </Section>
              )}
              {has("layout") && (
                <Section title={t("ly.section")} icon="↕" open={openSection === "layout"} onToggle={() => toggle("layout")}>
                  <PageLayoutEditor content={content} lang={editLang} onChange={set("pageLayout")} />
                </Section>
              )}

              <Section title={t("b.contact")} icon="📞" open={openSection === "contact"} onToggle={() => toggle("contact")}>
                <div className="form-row">
                  <Field label={t("b.phone")} value={content.phone} onChange={set("phone")} type="tel" />
                  <Field label={t("b.whatsapp")} value={content.whatsapp} onChange={set("whatsapp")} type="tel" hint={t("b.whatsappHint")} />
                </div>
                <Field label={t("b.email")} value={content.email} onChange={set("email")} type="email" />
                <Field label={t("b.location")} value={content.location} onChange={set("location")} />
                <Field label={t("b.hours")} value={content.businessHours} onChange={set("businessHours")} />
                <Field label={t("b.website")} value={content.website} onChange={set("website")} placeholder="https://" type="url" />
                {contactFields.has("linkedin") && (
                  <div className="form-row">
                    <Field label="LinkedIn" value={content.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/…" type="url" />
                    <Field label="GitHub" value={content.github} onChange={set("github")} placeholder="https://github.com/…" type="url" />
                  </div>
                )}
              </Section>

              {has("services") && (
                <Section title={t("b.services")} icon="🛠" count={content.services.length} open={openSection === "services"} onToggle={() => toggle("services")}>
                  <ListEditor items={content.services} onChange={set("services")} blank={NEW_SERVICE} addLabel={t("b.addService")}
                    titleOf={(x) => x.name}
                    render={(x, update) => (
                      <>
                        <div className="form-row">
                          <Field label={t("b.serviceName")} value={x.name} onChange={(v) => update({ name: v })} />
                          <Field label={t("b.servicePrice")} value={x.price} onChange={(v) => update({ price: v })} placeholder={t("b.servicePriceHint")} />
                        </div>
                        <TextArea label={t("b.serviceDesc")} value={x.description} onChange={(v) => update({ description: v })} rows={2} />
                        <ImageField label={t("b.serviceImage")} value={x.imageUrl} onChange={(v) => update({ imageUrl: v })} shape="wide" {...imageGate} />
                      </>
                    )} />
                </Section>
              )}

              {has("album") && (
                <Section title={t("b.album")} icon="🖼" count={content.album.length} open={openSection === "album"} onToggle={() => toggle("album")}>
                  <AlbumEditor items={content.album} onChange={set("album")} {...imageGate} />
                </Section>
              )}

              {has("experience") && (
                <Section title={t("b.experience")} icon="💼" count={content.experience.length} open={openSection === "experience"} onToggle={() => toggle("experience")}>
                  <ListEditor items={content.experience} onChange={set("experience")} blank={NEW_EXPERIENCE} addLabel={t("b.addExperience")}
                    titleOf={(x) => [x.role, x.company].filter(Boolean).join(" · ")}
                    render={(x, update) => (
                      <>
                        <div className="form-row">
                          <Field label={t("b.role")} value={x.role} onChange={(v) => update({ role: v })} />
                          <Field label={t("b.company")} value={x.company} onChange={(v) => update({ company: v })} />
                        </div>
                        <div className="form-row form-row-3">
                          <Field label={t("b.location")} value={x.location} onChange={(v) => update({ location: v })} />
                          <Field label={t("b.start")} value={x.start} onChange={(v) => update({ start: v })} placeholder="2018" />
                          <Field label={t("b.end")} value={x.end} onChange={(v) => update({ end: v })} placeholder={t("b.endHint")} />
                        </div>
                        <TextArea label={t("b.highlights")} value={x.highlights} onChange={(v) => update({ highlights: v })} rows={4} hint={t("b.highlightsHint")} />
                      </>
                    )} />
                </Section>
              )}

              {has("certificates") && (
                <Section title={t("b.certificates")} icon="🏅" count={content.certifications.length} open={openSection === "certificates"} onToggle={() => toggle("certificates")}>
                  <ListEditor items={content.certifications} onChange={set("certifications")} blank={NEW_CERTIFICATE} addLabel={t("b.addCertificate")}
                    titleOf={(x) => x.name}
                    render={(x, update) => (
                      <>
                        <Field label={t("b.certName")} value={x.name} onChange={(v) => update({ name: v })} />
                        <div className="form-row">
                          <Field label={t("b.issuer")} value={x.issuer} onChange={(v) => update({ issuer: v })} />
                          <Field label={t("b.year")} value={x.year} onChange={(v) => update({ year: v })} placeholder="2024" />
                        </div>
                        <Field label={t("b.verifyLink")} value={x.link} onChange={(v) => update({ link: v })} placeholder="https://" type="url" />
                        <ImageField label={t("b.certImage")} value={x.imageUrl} onChange={(v) => update({ imageUrl: v })} shape="wide" {...imageGate} />
                      </>
                    )} />
                </Section>
              )}

              {has("testimonials") && (
                <Section title={t("b.testimonials")} icon="⭐" count={content.testimonials.length} open={openSection === "testimonials"} onToggle={() => toggle("testimonials")}>
                  <ListEditor items={content.testimonials} onChange={set("testimonials")} blank={NEW_TESTIMONIAL} addLabel={t("b.addTestimonial")}
                    titleOf={(x) => x.name}
                    render={(x, update) => (
                      <>
                        <div className="form-row">
                          <Field label={t("b.customerName")} value={x.name} onChange={(v) => update({ name: v })} />
                          <Field label={t("b.customerRole")} value={x.role} onChange={(v) => update({ role: v })} />
                        </div>
                        <TextArea label={t("b.review")} value={x.text} onChange={(v) => update({ text: v })} rows={3} />
                      </>
                    )} />
                </Section>
              )}

              {has("education") && (
                <Section title={t("b.education")} icon="🎓" count={content.education.length} open={openSection === "education"} onToggle={() => toggle("education")}>
                  <ListEditor items={content.education} onChange={set("education")} blank={NEW_EDUCATION} addLabel={t("b.addEducation")}
                    titleOf={(x) => x.degree || x.school}
                    render={(x, update) => (
                      <>
                        <Field label={t("b.degree")} value={x.degree} onChange={(v) => update({ degree: v })} />
                        <Field label={t("b.school")} value={x.school} onChange={(v) => update({ school: v })} />
                        <div className="form-row">
                          <Field label={t("b.start")} value={x.start} onChange={(v) => update({ start: v })} placeholder="2013" />
                          <Field label={t("b.end")} value={x.end} onChange={(v) => update({ end: v })} placeholder="2015" />
                        </div>
                        <Field label={t("b.details")} value={x.details} onChange={(v) => update({ details: v })} />
                      </>
                    )} />
                </Section>
              )}

              {has("skills") && (
                <Section title={t("b.skills")} icon="✨" count={content.skills.length} open={openSection === "skills"} onToggle={() => toggle("skills")}>
                  <TagInput label={t("b.skills")} values={content.skills} onChange={set("skills")} placeholder={t("b.skillsPlaceholder")} hint={t("b.pressEnter")} />
                </Section>
              )}

              {has("projects") && (
                <Section title={t("b.projects")} icon="📁" count={content.projects.length} open={openSection === "projects"} onToggle={() => toggle("projects")}>
                  <ListEditor items={content.projects} onChange={set("projects")} blank={NEW_PROJECT} addLabel={t("b.addProject")}
                    titleOf={(x) => x.name}
                    render={(x, update) => (
                      <>
                        <Field label={t("b.projectName")} value={x.name} onChange={(v) => update({ name: v })} />
                        <TextArea label={t("b.serviceDesc")} value={x.description} onChange={(v) => update({ description: v })} rows={3} />
                        <div className="form-row">
                          <Field label={t("b.link")} value={x.link} onChange={(v) => update({ link: v })} placeholder="https://" type="url" />
                          <Field label={t("b.tech")} value={x.tech} onChange={(v) => update({ tech: v })} />
                        </div>
                        <ImageField label={t("b.projectImage")} value={x.imageUrl} onChange={(v) => update({ imageUrl: v })} shape="wide" {...imageGate} />
                      </>
                    )} />
                </Section>
              )}

              {has("more") && (
                <Section title={t("b.more")} icon="🏆" open={openSection === "more"} onToggle={() => toggle("more")}>
                  <TagInput label={t("b.achievements")} values={content.achievements} onChange={set("achievements")} hint={t("b.pressEnter")} />
                  <TagInput label={t("b.languagesSpoken")} values={content.languages} onChange={set("languages")} hint={t("b.pressEnter")} />
                </Section>
              )}

              {hiddenWithData.length > 0 && (
                <p className="hidden-sections-note">ℹ️ {t("b.hiddenSections", { sections: hiddenWithData.map((id) => t(SECTION_TITLE[id])).join(", ") })}</p>
              )}

              {languagesInSite.length > 1 && (
                <button type="button" className="link-button remove-lang" onClick={() => removeLanguage(editLang)}>{t("b.removeLang", { lang: LANG_NAMES[editLang] })}</button>
              )}
            </div>
          )}
        </aside>

        <section className="builder-preview">
          <div className={`preview-stage preview-${device}`}>
            <div className="preview-screen">
              {template && preview && <TemplateRenderer designKey={template.designKey} content={preview} lang={editLang} />}
            </div>
          </div>
        </section>
      </div>

      <AuthModal
        isOpen={authOpen}
        initialView="register"
        reason={authReason === "submit" ? t("p.authSubmit") : t("p.authUpload")}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={() => { setAuthOpen(false); if (authReason === "submit") setConfirmOpen(true); }}
      />

      {confirmOpen && template && (
        <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="modal-content publish-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t("p.title")}>
            <div className="modal-header"><h3>{t("p.title")}</h3><button className="modal-close" onClick={() => setConfirmOpen(false)} aria-label="Close">&times;</button></div>
            <div className="modal-body">
              <div className="order-summary">
                <div className="order-line"><span>{t("p.template")}</span><strong>{template.name}</strong></div>
                <div className="order-line"><span>{t("p.plan")}</span><strong>{isFree(template) ? t("home.freeVersion") : t("home.premiumVersion")}</strong></div>
                <div className="order-line"><span>{t("p.languages")}</span><strong>{languagesInSite.map((l) => LANG_NAMES[l]).join(" · ")}</strong></div>
                <div className="order-line"><span>{t("p.address")}</span><strong className="mono">{liveUrl(user?.userName ?? "you")}</strong></div>
                <div className="order-line order-total"><span>{t("p.total")}</span><Price template={template} /></div>
              </div>
              <p className="review-note">🛡 {t("p.review")}{savedSite?.isPublished ? ` ${t("p.stillOnline")}` : ""}</p>
              <button className="btn btn-primary btn-full btn-lg" disabled={saving} onClick={async () => { await persist(true); setConfirmOpen(false); }}>
                {saving ? t("b.submitting") : t("p.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitted && (
        <div className="modal-overlay" onClick={() => setSubmitted(false)}>
          <div className="modal-content publish-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t("p.submittedTitle")}>
            <div className="modal-body publish-success">
              <div className="auth-success-icon pending-icon">⏳</div>
              <h2>{t("p.submittedTitle")}</h2>
              <p className="text-muted">{t("p.submittedText")}</p>
              <div className="copy-row">
                <input readOnly value={liveUrl(user?.userName ?? "you")} onFocus={(e) => e.target.select()} aria-label={t("p.address")} />
              </div>
              <p className="text-muted small">{t("p.emailNote", { email: user?.email ?? "" })}</p>
              <div className="publish-actions">
                <Link to="/user/website" className="btn btn-primary">{t("p.track")}</Link>
                <button className="btn btn-ghost" onClick={() => setSubmitted(false)}>{t("p.keepEditing")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import type { Bilingual, FieldType, FormField, Lang, PageLayout, PortfolioContent, RatingType, ReviewsConfig, SiteForm } from "../../templates/types";
import { CHOICE_TYPES, FIELD_TYPES, emptyBi, pick, uid } from "../../lib/siteConfig";
import { orderedSections, sectionLabel } from "../../templates/travel/pageSections";
import { useUiLang, type UiKey } from "../../i18n/UiLang";

// Builder editors for ratings & reviews, custom forms and page section order (travel templates).
// Bilingual labels are edited in the language tab currently open; the other language is shown as a hint.

function BiInput({ label, value, lang, onChange, placeholder, multiline = false }: {
  label: string; value: Bilingual; lang: Lang; onChange: (v: Bilingual) => void; placeholder?: string; multiline?: boolean;
}) {
  const { t } = useUiLang();
  const other = lang === "en" ? value.ta : value.en;
  const props = { value: value[lang], placeholder, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [lang]: e.target.value }) };
  return (
    <div className="form-group">
      <label>{label}</label>
      {multiline ? <textarea rows={2} {...props} /> : <input {...props} />}
      {other && <small className="field-hint">{t("otherLang", { text: other })}</small>}
    </div>
  );
}

function Tick({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="form-group form-check builder-check">
      <label><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
    </div>
  );
}

function ItemHead({ title, index, count, onMove, onRemove }: { title: string; index: number; count: number; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  const { t } = useUiLang();
  return (
    <div className="list-item-head">
      <strong>{title || `${t("b.item")} ${index + 1}`}</strong>
      <div className="list-item-actions">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label={t("b.moveUp")}>↑</button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={t("b.moveDown")}>↓</button>
        <button type="button" className="danger" onClick={onRemove} aria-label={t("b.remove")}>✕</button>
      </div>
    </div>
  );
}

const move = <T,>(list: T[], i: number, d: number) => {
  const next = [...list];
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
};

// ─── Ratings & reviews ───

export function ReviewsEditor({ content, lang, onChange }: { content: PortfolioContent; lang: Lang; onChange: (v: ReviewsConfig) => void }) {
  const { t } = useUiLang();
  const cfg = content.reviews;
  const [draft, setDraft] = useState<Record<string, string>>({});
  const set = (patch: Partial<ReviewsConfig>) => onChange({ ...cfg, ...patch });
  const setType = (i: number, patch: Partial<RatingType>) => set({ types: cfg.types.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const addCriterion = (i: number, text: string) => {
    const names = text.split(",").map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setType(i, { criteria: [...cfg.types[i].criteria, ...names.map((n) => ({ id: uid("c"), label: { ...emptyBi(), [lang]: n } }))] });
    setDraft((d) => ({ ...d, [cfg.types[i].id]: "" }));
  };

  return (
    <>
      <Tick label={t("rv.enable")} checked={cfg.enabled} onChange={(v) => set({ enabled: v, types: v && cfg.types.length === 0
        ? [{ id: uid("rt"), enabled: true, target: "business", label: { en: "Overall experience", ta: "ஒட்டுமொத்த அனுபவம்" }, criteria: [] }] : cfg.types })} />
      <small className="field-hint builder-indent">{t("rv.enableHint")}</small>
      {cfg.enabled && (
        <>
          <div className="form-group">
            <label>{t("rv.moderation")}</label>
            <select value={cfg.moderation} onChange={(e) => set({ moderation: e.target.value as ReviewsConfig["moderation"] })}>
              <option value="approve">{t("rv.modApprove")}</option>
              <option value="auto">{t("rv.modAuto")}</option>
            </select>
          </div>
          <h4 className="builder-subhead">{t("rv.types")}</h4>
          <div className="list-editor">
            {cfg.types.map((type, i) => (
              <div key={type.id} className="list-item">
                <ItemHead title={pick(type.label, lang)} index={i} count={cfg.types.length}
                  onMove={(d) => set({ types: move(cfg.types, i, d) })} onRemove={() => set({ types: cfg.types.filter((_, j) => j !== i) })} />
                <BiInput label={t("rv.typeLabel")} value={type.label} lang={lang} placeholder={t("rv.typeLabelPh")} onChange={(label) => setType(i, { label })} />
                <div className="form-group">
                  <label>{t("rv.target")}</label>
                  <select value={type.target} onChange={(e) => setType(i, { target: e.target.value as RatingType["target"] })}>
                    <option value="business">{t("rv.tBusiness")}</option>
                    <option value="driver">{t("rv.tDriver")}</option>
                    <option value="vehicle">{t("rv.tVehicle")}</option>
                  </select>
                  {type.target === "driver" && !content.travel.drivers.some((x) => x.name) && <small className="field-hint">{t("rv.noDrivers")}</small>}
                  {type.target === "vehicle" && !content.travel.vehicles.some((x) => x.name) && <small className="field-hint">{t("rv.noVehicles")}</small>}
                </div>
                <div className="form-group">
                  <label>{t("rv.criteria")}</label>
                  <div className="tag-input">
                    {type.criteria.map((c, j) => (
                      <span key={c.id} className="tag tag-removable">{pick(c.label, lang)}
                        <button type="button" onClick={() => setType(i, { criteria: type.criteria.filter((_, k) => k !== j) })} aria-label={`${t("b.remove")} ${pick(c.label, lang)}`}>×</button>
                      </span>
                    ))}
                    <input value={draft[type.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [type.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCriterion(i, draft[type.id] ?? ""); } }}
                      onBlur={() => addCriterion(i, draft[type.id] ?? "")} />
                  </div>
                  <small className="field-hint">{t("rv.criteriaHint")}</small>
                </div>
                <Tick label={t("rv.typeOn")} checked={type.enabled} onChange={(v) => setType(i, { enabled: v })} />
              </div>
            ))}
            <button type="button" className="btn btn-dashed btn-full"
              onClick={() => set({ types: [...cfg.types, { id: uid("rt"), enabled: true, target: "business", label: emptyBi(), criteria: [] }] })}>+ {t("rv.addType")}</button>
          </div>
          <p className="field-hint">{t("rv.manage")}</p>
        </>
      )}
    </>
  );
}

// ─── Custom forms ───

const newField = (type: FieldType = "text"): FormField => ({ id: uid("f"), type, label: emptyBi(), placeholder: emptyBi(), required: false, options: [] });
const newForm = (): SiteForm => ({
  id: uid("form"), enabled: true, whatsapp: true, title: emptyBi(), description: emptyBi(), submitLabel: emptyBi(),
  fields: [{ ...newField("text"), label: { en: "Your name", ta: "உங்கள் பெயர்" }, required: true }, { ...newField("phone"), label: { en: "Mobile number", ta: "மொபைல் எண்" }, required: true }],
});

function FieldEditor({ field, lang, onChange }: { field: FormField; lang: Lang; onChange: (f: FormField) => void }) {
  const { t } = useUiLang();
  const choice = CHOICE_TYPES.includes(field.type);
  // Choices are edited as lines; positions are what visitors' answers point at, so they're kept in order
  const optionsText = field.options.map((o) => o[lang]).join("\n");
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>{t("fm.type")}</label>
          <select value={field.type} onChange={(e) => onChange({ ...field, type: e.target.value as FieldType })}>
            {FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{t(`fm.t.${ft}` as UiKey)}</option>)}
          </select>
        </div>
        <Tick label={t("fm.required")} checked={field.required} onChange={(v) => onChange({ ...field, required: v })} />
      </div>
      <BiInput label={t("fm.label")} value={field.label} lang={lang} onChange={(label) => onChange({ ...field, label })} />
      {!["checkbox", "radio", "multiselect"].includes(field.type) && (
        <BiInput label={t("fm.placeholder")} value={field.placeholder} lang={lang} onChange={(placeholder) => onChange({ ...field, placeholder })} />
      )}
      {choice && (
        <div className="form-group">
          <label>{t("fm.options")}</label>
          <textarea rows={4} value={optionsText} onChange={(e) => {
            const lines = e.target.value.split("\n");
            onChange({ ...field, options: lines.map((line, i) => ({ ...(field.options[i] ?? emptyBi()), [lang]: line })) });
          }} />
        </div>
      )}
    </>
  );
}

export function FormsEditor({ content, lang, onChange }: { content: PortfolioContent; lang: Lang; onChange: (forms: SiteForm[]) => void }) {
  const { t } = useUiLang();
  const forms = content.forms;
  const setForm = (i: number, patch: Partial<SiteForm>) => onChange(forms.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <>
      <p className="field-hint">{t("fm.hint")}</p>
      <div className="list-editor">
        {forms.map((form, i) => (
          <div key={form.id} className="list-item">
            <ItemHead title={pick(form.title, lang)} index={i} count={forms.length} onMove={(d) => onChange(move(forms, i, d))} onRemove={() => onChange(forms.filter((_, j) => j !== i))} />
            <BiInput label={t("fm.title")} value={form.title} lang={lang} onChange={(title) => setForm(i, { title })} />
            <BiInput label={t("fm.desc")} value={form.description} lang={lang} multiline onChange={(description) => setForm(i, { description })} />
            <BiInput label={t("fm.submitLabel")} value={form.submitLabel} lang={lang} placeholder={t("fm.submitPh")} onChange={(submitLabel) => setForm(i, { submitLabel })} />
            <Tick label={t("fm.whatsapp")} checked={form.whatsapp} onChange={(v) => setForm(i, { whatsapp: v })} />
            <Tick label={t("fm.enabled")} checked={form.enabled} onChange={(v) => setForm(i, { enabled: v })} />
            <h4 className="builder-subhead">{t("fm.fields")}</h4>
            <div className="list-editor list-editor-nested">
              {form.fields.map((field, k) => (
                <div key={field.id} className="list-item">
                  <ItemHead title={pick(field.label, lang) || t(`fm.t.${field.type}` as UiKey)} index={k} count={form.fields.length}
                    onMove={(d) => setForm(i, { fields: move(form.fields, k, d) })} onRemove={() => setForm(i, { fields: form.fields.filter((_, j) => j !== k) })} />
                  <FieldEditor field={field} lang={lang} onChange={(f) => setForm(i, { fields: form.fields.map((x, j) => (j === k ? f : x)) })} />
                </div>
              ))}
              <button type="button" className="btn btn-dashed btn-full" onClick={() => setForm(i, { fields: [...form.fields, newField()] })}>+ {t("fm.addField")}</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-dashed btn-full" onClick={() => onChange([...forms, newForm()])}>+ {t("fm.addForm")}</button>
      </div>
    </>
  );
}

// ─── Page layout: drag & drop section order ───

export function PageLayoutEditor({ content, lang, onChange }: { content: PortfolioContent; lang: Lang; onChange: (v: PageLayout) => void }) {
  const { t } = useUiLang();
  const order = orderedSections(content);
  const hidden = new Set(content.pageLayout.hidden);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // Sections whose feature is switched off elsewhere still sit in the order, marked as off
  const off = (id: string) =>
    (id === "rates" && !content.travel.enabled) || (id === "careers" && !(content.travel.enabled && content.travel.driverHiring))
    || (id === "reviews" && !content.reviews.enabled) || (id === "drivers" && !content.travel.showDrivers)
    || (id.startsWith("form:") && content.forms.find((f) => `form:${f.id}` === id)?.enabled === false);

  const save = (nextOrder: string[], nextHidden = hidden) => onChange({ order: nextOrder, hidden: [...nextHidden] });
  const moveTo = (id: string, target: string) => {
    if (id === target) return;
    const next = order.filter((x) => x !== id);
    next.splice(next.indexOf(target) + (order.indexOf(id) < order.indexOf(target) ? 1 : 0), 0, id);
    save(next);
  };
  const shift = (i: number, d: number) => save(move(order, i, d));
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id); else next.add(id);
    save(order, next);
  };

  return (
    <>
      <p className="field-hint">{t("ly.hint")}</p>
      <ol className="layout-list" aria-label={t("ly.section")}>
        {order.map((id, i) => (
          <li key={id} draggable
            className={`layout-row${dragging === id ? " dragging" : ""}${over === id && dragging !== id ? " over" : ""}${hidden.has(id) ? " is-hidden" : ""}`}
            onDragStart={(e) => { setDragging(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); }}
            onDragOver={(e) => { e.preventDefault(); setOver(id); }}
            onDragLeave={() => setOver((o) => (o === id ? null : o))}
            onDrop={(e) => { e.preventDefault(); const from = e.dataTransfer.getData("text/plain") || dragging; if (from) moveTo(from, id); setDragging(null); setOver(null); }}
            onDragEnd={() => { setDragging(null); setOver(null); }}>
            <span className="layout-grip" aria-hidden="true">⋮⋮</span>
            <span className="layout-name">
              {sectionLabel(id, content, lang)}
              {off(id) ? <small> · {t("ly.off")}</small> : hidden.has(id) ? <small> · {t("ly.hidden")}</small> : null}
            </span>
            <button type="button" onClick={() => shift(i, -1)} disabled={i === 0} aria-label={`${t("ly.up")}: ${sectionLabel(id, content, lang)}`}>↑</button>
            <button type="button" onClick={() => shift(i, 1)} disabled={i === order.length - 1} aria-label={`${t("ly.down")}: ${sectionLabel(id, content, lang)}`}>↓</button>
            <button type="button" className="layout-eye" onClick={() => toggle(id)} aria-pressed={!hidden.has(id)}
              aria-label={`${hidden.has(id) ? t("ly.show") : t("ly.hide")}: ${sectionLabel(id, content, lang)}`}>{hidden.has(id) ? "🙈" : "👁"}</button>
          </li>
        ))}
      </ol>
      <button type="button" className="link-button" onClick={() => onChange({ order: [], hidden: [] })}>{t("ly.reset")}</button>
    </>
  );
}

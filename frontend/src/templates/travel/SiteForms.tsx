import { useId, useMemo, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { SUBMIT_SITE_FORM } from "../../api/queries";
import type { FormField, Lang, SiteForm } from "../types";
import { pick } from "../../lib/siteConfig";
import { travelText, type TravelT } from "./labels";

type Values = Record<string, string[]>;

const isEmpty = (f: FormField, v: string[] = []) => (f.type === "checkbox" ? v[0] !== "true" : v.filter((x) => x.trim()).length === 0);

function clientCheck(f: FormField, v: string[] = [], lang: Lang): string | null {
  const label = pick(f.label, lang);
  if (isEmpty(f, v)) return f.required ? `${label}: ${lang === "ta" ? "அவசியம்" : "required"}` : null;
  const s = (v[0] ?? "").trim();
  if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return `${label}: ${lang === "ta" ? "சரியான மின்னஞ்சல் இல்லை" : "enter a valid email"}`;
  if (f.type === "phone" && !/^(\+?91|0)?[6-9]\d{9}$/.test(s.replace(/[\s-]/g, ""))) return `${label}: ${lang === "ta" ? "10 இலக்க மொபைல் எண்" : "enter a 10-digit mobile number"}`;
  if (f.type === "number" && !/^-?\d+(\.\d+)?$/.test(s)) return `${label}: ${lang === "ta" ? "எண் மட்டும்" : "numbers only"}`;
  return null;
}

function Field({ f, value, onChange, lang, t }: { f: FormField; value: string[]; onChange: (v: string[]) => void; lang: Lang; t: TravelT }) {
  const id = useId();
  const label = pick(f.label, lang);
  const ph = pick(f.placeholder, lang);
  const req = f.required ? <span className="trv-req" aria-label={t("required")}> *</span> : null;
  const one = value[0] ?? "";
  const set = (v: string) => onChange([v]);

  if (f.type === "checkbox") {
    return (
      <label className="trv-consent trv-form-check">
        <input type="checkbox" checked={one === "true"} onChange={(e) => set(e.target.checked ? "true" : "false")} />
        <span>{label}{req}</span>
      </label>
    );
  }
  if (f.type === "radio" || f.type === "multiselect") {
    const multi = f.type === "multiselect";
    return (
      <fieldset className="trv-chip-pick">
        <legend className="trv-label">{label}{req}</legend>
        {f.options.map((o, i) => {
          const k = String(i);
          const on = value.includes(k);
          return (
            <label key={k} className={on ? "on" : ""}>
              <input type={multi ? "checkbox" : "radio"} name={id} checked={on}
                onChange={() => onChange(multi ? (on ? value.filter((x) => x !== k) : [...value, k]) : [k])} />
              {pick(o, lang)}
            </label>
          );
        })}
      </fieldset>
    );
  }
  return (
    <label className="trv-field" htmlFor={id}>
      <span className="trv-label">{label}{req}</span>
      {f.type === "textarea" ? <textarea id={id} rows={3} value={one} placeholder={ph} maxLength={3000} onChange={(e) => set(e.target.value)} />
        : f.type === "select" ? (
          <select id={id} value={one} onChange={(e) => set(e.target.value)}>
            <option value="">{ph || t("selectPh")}</option>
            {f.options.map((o, i) => <option key={i} value={String(i)}>{pick(o, lang)}</option>)}
          </select>
        ) : (
          <input id={id} value={one} placeholder={ph} onChange={(e) => set(e.target.value)} maxLength={300}
            type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
            inputMode={f.type === "phone" ? "tel" : f.type === "number" ? "decimal" : undefined}
            autoComplete={f.type === "email" ? "email" : f.type === "phone" ? "tel" : undefined} />
        )}
    </label>
  );
}

// One owner-built form rendered on the website
export function DynamicForm({ form, lang, owner, ownerName }: { form: SiteForm; lang: Lang; owner?: string; ownerName: string }) {
  const t = useMemo(() => travelText(lang), [lang]);
  const [values, setValues] = useState<Values>({});
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ ref: string; waUrl: string } | null>(null);
  const [submit, { loading }] = useMutation<any>(SUBMIT_SITE_FORM);
  const description = pick(form.description, lang);

  if (form.fields.length === 0) return owner ? null : <div className="trv-placeholder">{t("emptyForm")}</div>;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    for (const f of form.fields) {
      const problem = clientCheck(f, values[f.id], lang);
      if (problem) { setError(problem); return; }
    }
    if (!owner) return;
    const { data } = await submit({ variables: { input: {
      userName: owner, formId: form.id, lang, company,
      answers: form.fields.map((f) => ({ fieldId: f.id, values: values[f.id] ?? [] })),
    } } });
    const res = data?.submitSiteForm;
    if (res?.status !== 1) { setError(res?.message ?? "Could not submit"); return; }
    const text = [`*${pick(form.title, lang)}* — ${res.ref}`, "", ...res.answers.map((a: any) => `• ${a.label}: ${a.value}`)].join("\n");
    const waUrl = res.whatsapp ? `https://api.whatsapp.com/send?phone=${res.whatsapp}&text=${encodeURIComponent(text)}` : "";
    setDone({ ref: res.ref, waUrl });
    setValues({});
    if (waUrl) setTimeout(() => { window.location.href = waUrl; }, 1200);
  };

  if (done) {
    return (
      <div className="trv-done trv-form-card" role="status">
        <span className="trv-done-icon" aria-hidden="true">✓</span>
        <h3>{t("formDoneTitle")}</h3>
        <p>{done.waUrl ? t("formDoneWa", { ref: done.ref, name: ownerName }) : t("formDoneText", { ref: done.ref, name: ownerName })}</p>
        <div className="trv-done-actions">
          {done.waUrl && <a className="trv-btn trv-btn-wa" href={done.waUrl}>{t("openWhatsapp")}</a>}
          <button type="button" className="trv-btn trv-btn-ghost" onClick={() => setDone(null)}>{t("formAgain")}</button>
        </div>
      </div>
    );
  }

  // Short fields sit two per row on wider screens; long ones take the full width
  const wide = (f: FormField) => ["textarea", "radio", "multiselect", "checkbox"].includes(f.type);
  return (
    <form className="trv-form trv-form-card" onSubmit={send} noValidate>
      {description && <p className="trv-sec-sub trv-form-desc">{description}</p>}
      <div className="trv-dyn-grid">
        {form.fields.map((f) => (
          <div key={f.id} className={wide(f) ? "trv-dyn-wide" : ""}>
            <Field f={f} value={values[f.id] ?? []} onChange={(v) => setValues((x) => ({ ...x, [f.id]: v }))} lang={lang} t={t} />
          </div>
        ))}
      </div>
      <input className="trv-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={company} onChange={(e) => setCompany(e.target.value)} />
      {error && <p className="trv-error" role="alert">{error}</p>}
      {!owner && <p className="trv-preview-note">{t("previewOnly")}</p>}
      <button type="submit" className={`trv-btn ${form.whatsapp ? "trv-btn-wa" : "trv-btn-primary"}`} disabled={loading || !owner}>
        {loading ? t("formSending") : pick(form.submitLabel, lang) || t("formSubmit")}
      </button>
    </form>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang, PortfolioContent } from "../types";
import { postMultipart } from "../../lib/upload";
import { travelText, type TravelT } from "./labels";

const VEHICLES = ["Hatchback", "Sedan", "SUV", "MUV", "Tempo Traveller", "Mini bus", "Bus", "Luxury"];
const MAX_MB = 10;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY = {
  fullName: "", phone: "", email: "", age: "", area: "", experienceYears: "", licenseNumber: "", licenseType: "LMV-TR",
  licenseValidTill: "", languages: "", availability: "full-time", tripPreference: "both", expectedSalary: "", ownVehicle: "",
  about: "", consent: false, company: "",
};
type Form = typeof EMPTY;

const APPLY = `mutation ApplyAsDriver($input: DriverApplicationInput!, $photo: Upload!, $licenseFront: Upload!, $licenseBack: Upload) {
  applyAsDriver(input: $input, photo: $photo, licenseFront: $licenseFront, licenseBack: $licenseBack) { status message ref whatsapp }
}`;

// Photo picker with preview; checks type and size before upload
function PhotoPick({ label, file, onChange, t, required }: { label: string; file: File | null; onChange: (f: File | null) => void; t: TravelT; required?: boolean }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const [error, setError] = useState("");
  return (
    <label className="trv-photo-pick">
      <span className="trv-label">{label}{required ? " *" : ""}</span>
      <span className={`trv-photo-box${file ? " has" : ""}`}>
        {file ? <img src={preview} alt="" /> : <span aria-hidden="true">📷</span>}
        <span className="trv-photo-cta">{file ? t("changePhoto") : t("choosePhoto")}</span>
      </span>
      <input type="file" accept={IMAGE_TYPES.join(",")} onChange={(e) => {
        const f = e.target.files?.[0] ?? null;
        e.target.value = "";
        if (!f) return;
        if (!IMAGE_TYPES.includes(f.type)) { setError("JPG / PNG / WEBP"); return; }
        if (f.size > MAX_MB * 1024 * 1024) { setError(`< ${MAX_MB} MB`); return; }
        setError("");
        onChange(f);
      }} />
      {error && <small className="trv-field-error">{error}</small>}
    </label>
  );
}

function ApplyForm({ owner, ownerName, whatsappFallback, lang, t, onClose }: {
  owner?: string; ownerName: string; whatsappFallback: string; lang: Lang; t: TravelT; onClose: () => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [vehicles, setVehicles] = useState<string[]>(["Sedan"]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ref: string; waUrl: string } | null>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // A modal <dialog> renders in the top layer, so the template's container can't clip or trap it
  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    firstField.current?.focus();
    return () => { if (d?.open) d.close(); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const toggleVehicle = (v: string) => setVehicles((list) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]));

  const avLabel: Record<string, string> = { "full-time": t("avFull"), "part-time": t("avPart"), weekends: t("avWeekend"), "on-call": t("avOnCall") };
  const prefLabel: Record<string, string> = { city: t("prefCity"), outstation: t("prefOut"), both: t("prefBoth") };
  const ltLabel: Record<string, string> = { LMV: t("ltLMV"), "LMV-TR": t("ltLMVTR"), HMV: t("ltHMV") };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!owner) return;
    if (!form.fullName.trim() || !form.phone.trim() || !form.area.trim() || form.experienceYears === "" || !form.licenseNumber.trim() || !form.licenseValidTill) {
      setError(t("errRequired")); return;
    }
    if (vehicles.length === 0) { setError(t("errVehicles")); return; }
    if (!photo || !front) { setError(t("errPhotos")); return; }
    if (!form.consent) { setError(t("errConsent")); return; }

    setBusy(true);
    try {
      const input = {
        userName: owner, fullName: form.fullName.trim(), phone: form.phone, email: form.email.trim() || null,
        age: form.age ? Number(form.age) : null, area: form.area.trim(), experienceYears: Number(form.experienceYears),
        licenseNumber: form.licenseNumber, licenseType: form.licenseType, licenseValidTill: form.licenseValidTill,
        vehicleTypes: vehicles, languages: form.languages.trim(), availability: form.availability, tripPreference: form.tripPreference,
        expectedSalary: form.expectedSalary.trim() || null, ownVehicle: form.ownVehicle.trim() || null, about: form.about.trim() || null,
        consent: form.consent, lang, company: form.company,
      };
      const files: Record<string, File> = { 0: photo, 1: front };
      const map: Record<string, string[]> = { 0: ["variables.photo"], 1: ["variables.licenseFront"] };
      if (back) { files[2] = back; map[2] = ["variables.licenseBack"]; }
      const data = await postMultipart(APPLY, { input, photo: null, licenseFront: null, licenseBack: null }, files, map);
      const res = data?.applyAsDriver;
      if (res?.status !== 1) { setError(res?.message ?? "Could not submit your application"); return; }

      const number = res.whatsapp || whatsappFallback;
      const lines = [
        `*${t("waApplication")}* — ${res.ref}`,
        "",
        `• ${t("fullName")}: ${input.fullName}${input.age ? ` (${input.age})` : ""}`,
        `• ${t("waMobile")}: ${form.phone}`,
        input.email ? `• ${input.email}` : null,
        `• ${t("area")}: ${input.area}`,
        `• ${t("expYears")}: ${input.experienceYears}`,
        `• ${t("licenceType")}: ${ltLabel[input.licenseType]} · ${t("licenceValid")}: ${input.licenseValidTill}`,
        `• ${t("canDrive")}: ${vehicles.join(", ")}`,
        input.languages ? `• ${t("speaks2")}: ${input.languages}` : null,
        `• ${t("availability")}: ${avLabel[input.availability]} · ${t("tripPref")}: ${prefLabel[input.tripPreference]}`,
        input.expectedSalary ? `• ${t("salary")}: ${input.expectedSalary}` : null,
        input.ownVehicle ? `• ${input.ownVehicle}` : null,
        input.about ? `\n• ${input.about}` : null,
        "",
        `• ${t("waDocsUploaded")} (${res.ref})`,
      ].filter((l): l is string => l !== null);
      const waUrl = number ? `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(lines.join("\n").trim())}` : "";
      setDone({ ref: res.ref, waUrl });
      if (waUrl) setTimeout(() => { window.location.href = waUrl; }, 1200);
    } catch (err: any) {
      setError(err.message || "Could not submit your application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="trv-modal" aria-labelledby="trv-apply-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="trv-modal-inner">
        <button type="button" className="trv-modal-close" onClick={onClose} aria-label={t("close")}>✕</button>
        {done ? (
          <div className="trv-done" role="status">
            <span className="trv-done-icon" aria-hidden="true">✓</span>
            <h3 id="trv-apply-title">{t("appDoneTitle")}</h3>
            <p>{t("appDoneText", { ref: done.ref, name: ownerName })}</p>
            <div className="trv-done-actions">
              {done.waUrl && <a className="trv-btn trv-btn-wa" href={done.waUrl}>{t("openWhatsapp")}</a>}
              <button type="button" className="trv-btn trv-btn-ghost" onClick={onClose}>{t("close")}</button>
            </div>
          </div>
        ) : (
          <form className="trv-form trv-apply" onSubmit={submit} noValidate>
            <h2 id="trv-apply-title">{t("applyTitle")}</h2>
            <p className="trv-modal-sub">{t("applySub", { name: ownerName })}</p>

            <h3 className="trv-subhead">{t("secPersonal")}</h3>
            <div className="trv-grid-2">
              <label className="trv-field"><span className="trv-label">{t("fullName")} *</span><input ref={firstField} value={form.fullName} onChange={set("fullName")} autoComplete="name" maxLength={120} /></label>
              <label className="trv-field"><span className="trv-label">{t("phone")} *</span><input type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="98765 43210" /></label>
            </div>
            <div className="trv-grid-2">
              <label className="trv-field"><span className="trv-label">{t("emailOpt")}</span><input type="email" value={form.email} onChange={set("email")} autoComplete="email" /></label>
              <label className="trv-field"><span className="trv-label">{t("age")}</span><input type="number" min={18} max={70} value={form.age} onChange={set("age")} /></label>
            </div>
            <div className="trv-grid-2">
              <label className="trv-field"><span className="trv-label">{t("area")} *</span><input value={form.area} onChange={set("area")} placeholder={t("areaPh")} maxLength={200} /></label>
              <label className="trv-field"><span className="trv-label">{t("expYears")} *</span><input type="number" min={0} max={60} value={form.experienceYears} onChange={set("experienceYears")} /></label>
            </div>

            <h3 className="trv-subhead">{t("secLicence")}</h3>
            <div className="trv-grid-3">
              <label className="trv-field"><span className="trv-label">{t("licenceNumber")} *</span><input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value.toUpperCase() })} placeholder="TN09 20150001234" maxLength={20} /></label>
              <label className="trv-field"><span className="trv-label">{t("licenceType")} *</span>
                <select value={form.licenseType} onChange={set("licenseType")}>{Object.entries(ltLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </label>
              <label className="trv-field"><span className="trv-label">{t("licenceValid")} *</span><input type="date" value={form.licenseValidTill} onChange={set("licenseValidTill")} /></label>
            </div>

            <h3 className="trv-subhead">{t("secWork")}</h3>
            <fieldset className="trv-chip-pick">
              <legend className="trv-label">{t("canDrive")} *</legend>
              {VEHICLES.map((v) => (
                <label key={v} className={vehicles.includes(v) ? "on" : ""}><input type="checkbox" checked={vehicles.includes(v)} onChange={() => toggleVehicle(v)} />{v}</label>
              ))}
            </fieldset>
            <div className="trv-grid-2">
              <label className="trv-field"><span className="trv-label">{t("availability")}</span>
                <select value={form.availability} onChange={set("availability")}>{Object.entries(avLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </label>
              <label className="trv-field"><span className="trv-label">{t("tripPref")}</span>
                <select value={form.tripPreference} onChange={set("tripPreference")}>{Object.entries(prefLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </label>
            </div>
            <div className="trv-grid-2">
              <label className="trv-field"><span className="trv-label">{t("speaks2")}</span><input value={form.languages} onChange={set("languages")} placeholder="Tamil, English" maxLength={200} /></label>
              <label className="trv-field"><span className="trv-label">{t("salary")}</span><input value={form.expectedSalary} onChange={set("expectedSalary")} placeholder={t("salaryPh")} maxLength={60} /></label>
            </div>
            <label className="trv-field"><span className="trv-label">{t("ownVehicle")}</span><input value={form.ownVehicle} onChange={set("ownVehicle")} placeholder={t("ownVehiclePh")} maxLength={120} /></label>
            <label className="trv-field"><span className="trv-label">{t("aboutYou")}</span><textarea rows={2} value={form.about} onChange={set("about")} placeholder={t("aboutPh")} maxLength={1500} /></label>

            <h3 className="trv-subhead">{t("secDocs")}</h3>
            <div className="trv-photos">
              <PhotoPick label={t("yourPhoto")} file={photo} onChange={setPhoto} t={t} required />
              <PhotoPick label={t("licFront")} file={front} onChange={setFront} t={t} required />
              <PhotoPick label={t("licBack")} file={back} onChange={setBack} t={t} />
            </div>
            <small className="trv-hint">{t("photoHint")}</small>

            <label className="trv-consent"><input type="checkbox" checked={form.consent} onChange={set("consent")} /> {t("consent", { name: ownerName })}</label>
            <input className="trv-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={set("company")} />

            {error && <p className="trv-error" role="alert">{error}</p>}
            {!owner && <p className="trv-preview-note">{t("previewOnly")}</p>}
            <button type="submit" className="trv-btn trv-btn-wa trv-btn-full" disabled={busy || !owner}>{busy ? t("submitting") : t("submitApp")}</button>
          </form>
        )}
      </div>
    </dialog>
  );
}

// "Drive with us" section: what the owner offers drivers + the application form
export function DriverCareers({ content, lang, owner }: { content: PortfolioContent; lang: Lang; owner?: string }) {
  const t = useMemo(() => travelText(lang), [lang]);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const points = content.hiringText.split("\n").map((s) => s.trim()).filter(Boolean);
  const perks = points.length ? points : [t("careersDefault1"), t("careersDefault2"), t("careersDefault3")];

  return (
    <div className="trv-careers">
      <div className="trv-careers-text">
        <span className="trv-careers-badge" aria-hidden="true">🧑‍✈️</span>
        <p className="trv-careers-sub">{t("careersSub")}</p>
        <ul className="trv-careers-perks">{perks.map((p) => <li key={p}>{p}</li>)}</ul>
      </div>
      <button type="button" className="trv-btn trv-btn-primary" onClick={() => setOpen(true)}>{t("applyNow")} →</button>
      {open && (
        <ApplyForm owner={owner} ownerName={content.fullName || "us"} whatsappFallback={content.travel.bookingWhatsapp || content.whatsapp}
          lang={lang} t={t} onClose={close} />
      )}
    </div>
  );
}

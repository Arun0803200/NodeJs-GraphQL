import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { CONTACT_PLATFORM } from "../../api/queries";
import { BRAND_NAME } from "../../lib/brand";
import { Icon } from "../ui/Icon";
import type { Lang } from "../../templates/types";

const TEXT = {
  en: {
    strip: "Website by {brand}", stripCta: "Want a website like this for your business?", contact: "Contact us",
    title: "Contact {brand}", sub: "Tell us what you need. We'll reply on WhatsApp or call you back.",
    name: "Your name", phone: "Mobile number", email: "Email (optional)", purpose: "I'm interested in", message: "Message",
    messagePh: "e.g. I run a taxi service in Madurai and want a booking website.",
    p_new: "A website for my business", p_pricing: "Pricing & plans", p_support: "Help with my website", p_partnership: "Partnership", p_other: "Something else",
    send: "Send & chat on WhatsApp", sendNoWa: "Send enquiry", sending: "Sending…",
    doneTitle: "Thank you!", doneWa: "Reference {ref}. We're opening WhatsApp so you can send your message to the {brand} team.",
    done: "Reference {ref}. The {brand} team will contact you soon.", openWa: "Open WhatsApp", close: "Close",
    errName: "Please enter your name", errPhone: "Please enter a valid 10-digit mobile number", errMessage: "Please write a short message",
    waTitle: "New enquiry", waFrom: "From",
  },
  ta: {
    strip: "{brand} உருவாக்கிய இணையதளம்", stripCta: "உங்கள் வணிகத்திற்கும் இதுபோன்ற இணையதளம் வேண்டுமா?", contact: "தொடர்பு கொள்ளுங்கள்",
    title: "{brand} ஐத் தொடர்பு கொள்ளுங்கள்", sub: "உங்கள் தேவையைச் சொல்லுங்கள். வாட்ஸ்அப்பில் பதில் அனுப்புவோம் அல்லது அழைப்போம்.",
    name: "உங்கள் பெயர்", phone: "மொபைல் எண்", email: "மின்னஞ்சல் (விருப்பம்)", purpose: "எனக்கு வேண்டியது", message: "செய்தி",
    messagePh: "எ.கா. மதுரையில் டாக்ஸி சேவை நடத்துகிறேன், முன்பதிவு இணையதளம் வேண்டும்.",
    p_new: "என் வணிகத்திற்கு இணையதளம்", p_pricing: "கட்டணம் & திட்டங்கள்", p_support: "என் இணையதளத்திற்கு உதவி", p_partnership: "கூட்டாண்மை", p_other: "வேறு ஏதேனும்",
    send: "அனுப்பி வாட்ஸ்அப்பில் பேசுங்கள்", sendNoWa: "விசாரணையை அனுப்பு", sending: "அனுப்புகிறது…",
    doneTitle: "நன்றி!", doneWa: "குறிப்பு எண் {ref}. {brand} குழுவுக்கு உங்கள் செய்தியை அனுப்ப வாட்ஸ்அப் திறக்கிறது.",
    done: "குறிப்பு எண் {ref}. {brand} குழு விரைவில் உங்களைத் தொடர்பு கொள்ளும்.", openWa: "வாட்ஸ்அப் திற", close: "மூடு",
    errName: "உங்கள் பெயரை உள்ளிடுங்கள்", errPhone: "சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடுங்கள்", errMessage: "சிறு செய்தி எழுதுங்கள்",
    waTitle: "புதிய விசாரணை", waFrom: "எங்கிருந்து",
  },
} as const;
type Key = keyof typeof TEXT.en;
const PURPOSES = [["new-website", "p_new"], ["pricing", "p_pricing"], ["support", "p_support"], ["partnership", "p_partnership"], ["other", "p_other"]] as const;
const EMPTY = { name: "", phone: "", email: "", purpose: "new-website", message: "", company: "" };

const text = (lang: Lang) => (key: Key, vars: Record<string, string> = {}) =>
  Object.entries({ brand: BRAND_NAME, ...vars }).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, v), TEXT[lang]?.[key] ?? TEXT.en[key]);

function ContactDialog({ source, lang, onClose }: { source: string; lang: Lang; onClose: () => void }) {
  const t = text(lang);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ ref: string; waUrl: string } | null>(null);
  const [send, { loading }] = useMutation<any>(CONTACT_PLATFORM);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError(t("errName"));
    if (!/^(\+?91|0)?[6-9]\d{9}$/.test(form.phone.replace(/[\s-]/g, ""))) return setError(t("errPhone"));
    if (form.message.trim().length < 5) return setError(t("errMessage"));
    try {
      const { data } = await send({ variables: { input: { ...form, email: form.email.trim() || null, source, pageUrl: window.location.href, lang } } });
      const res = data?.contactPlatform;
      if (res?.status !== 1) return setError(res?.message ?? "Could not send");
      const purposeLabel = t((PURPOSES.find(([k]) => k === form.purpose)?.[1] ?? "p_other") as Key);
      // Plain bullets: WhatsApp's link handling can garble emoji
      const lines = [
        `*${t("waTitle")}* — ${res.ref}`, "",
        `• ${t("name")}: ${form.name.trim()}`,
        `• ${t("phone")}: ${form.phone.trim()}`,
        form.email.trim() ? `• ${form.email.trim()}` : null,
        `• ${t("purpose")}: ${purposeLabel}`,
        `• ${t("waFrom")}: ${window.location.href}`, "",
        form.message.trim(),
      ].filter((l): l is string => l !== null);
      const waUrl = res.whatsapp ? `https://api.whatsapp.com/send?phone=${res.whatsapp}&text=${encodeURIComponent(lines.join("\n"))}` : "";
      setDone({ ref: res.ref, waUrl });
      if (waUrl) setTimeout(() => { window.location.href = waUrl; }, 1200);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="contact-overlay platform-contact" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-contact-title" lang={lang}>
        <button type="button" className="contact-close" onClick={onClose} aria-label={t("close")}><Icon name="close" size={18} /></button>
        {done ? (
          <div className="contact-sent">
            <span className="contact-sent-icon" aria-hidden="true">✓</span>
            <h2 id="platform-contact-title">{t("doneTitle")}</h2>
            <p>{done.waUrl ? t("doneWa", { ref: done.ref }) : t("done", { ref: done.ref })}</p>
            <div className="contact-sent-actions">
              {done.waUrl && <a className="btn btn-primary platform-wa-btn" href={done.waUrl}>{t("openWa")}</a>}
              <button type="button" className="btn btn-secondary" onClick={onClose}>{t("close")}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <h2 id="platform-contact-title"><span className="platform-mark" aria-hidden="true">{BRAND_NAME[0]}</span>{t("title")}</h2>
            <p className="contact-sub">{t("sub")}</p>
            {error && <div className="alert alert-error"><span>{error}</span></div>}
            <label>{t("name")}<input ref={firstField} value={form.name} onChange={set("name")} maxLength={120} autoComplete="name" /></label>
            <div className="platform-row">
              <label>{t("phone")}<input type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="98765 43210" /></label>
              <label>{t("email")}<input type="email" value={form.email} onChange={set("email")} autoComplete="email" maxLength={255} /></label>
            </div>
            <label>{t("purpose")}
              <select value={form.purpose} onChange={set("purpose")}>
                {PURPOSES.map(([k, label]) => <option key={k} value={k}>{t(label as Key)}</option>)}
              </select>
            </label>
            <label>{t("message")}<textarea rows={4} value={form.message} onChange={set("message")} maxLength={2000} placeholder={t("messagePh")} /></label>
            <input className="contact-hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company} onChange={set("company")} />
            <button type="submit" className="btn btn-primary btn-full platform-wa-btn" disabled={loading}>{loading ? t("sending") : t("send")}</button>
          </form>
        )}
      </div>
    </div>
  );
}

// "Contact us" (platform admins) — as a slim strip under published websites, or a link/button on the storefront
export function PlatformContact({ source, lang = "en", variant = "strip", className = "" }: { source: string; lang?: Lang; variant?: "strip" | "link" | "button"; className?: string }) {
  const t = text(lang);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const trigger = (cls: string, label: string) => (
    <button type="button" className={cls} onClick={() => setOpen(true)} aria-haspopup="dialog">{label}</button>
  );
  return (
    <>
      {variant === "strip" ? (
        <aside className={`platform-strip ${className}`} lang={lang} aria-label={t("strip")}>
          <span className="platform-strip-brand"><span className="platform-mark" aria-hidden="true">{BRAND_NAME[0]}</span>{t("strip")}</span>
          <span className="platform-strip-cta">{t("stripCta")}</span>
          {trigger("platform-strip-btn", t("contact"))}
        </aside>
      ) : variant === "button" ? trigger(`btn btn-secondary ${className}`, t("contact")) : trigger(`link-button platform-link ${className}`, t("contact"))}
      {open && <ContactDialog source={source} lang={lang} onClose={close} />}
    </>
  );
}

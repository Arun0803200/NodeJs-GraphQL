import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { SEND_CONTACT_MESSAGE } from "../../api/queries";
import { Icon } from "../ui/Icon";
import type { Lang } from "../../templates/types";

const TEXT: Record<Lang, Record<string, string>> = {
  en: {
    open: "Message me", title: "Send {name} a message", sub: "Your message goes straight to {name}'s inbox. They'll reply to your email.",
    name: "Your name", email: "Your email", message: "Message", placeholder: "Hi, I'd like to talk about…", send: "Send message", sending: "Sending…",
    sentTitle: "Message sent", sentText: "Thanks! {name} will get back to you at {email}.", again: "Send another", close: "Close",
  },
  ta: {
    open: "செய்தி அனுப்பு", title: "{name} அவர்களுக்கு செய்தி அனுப்புங்கள்", sub: "உங்கள் செய்தி நேரடியாக {name} அவர்களுக்குச் செல்லும். அவர்கள் உங்கள் மின்னஞ்சலுக்கு பதிலளிப்பார்கள்.",
    name: "உங்கள் பெயர்", email: "உங்கள் மின்னஞ்சல்", message: "செய்தி", placeholder: "வணக்கம், நான் பேச விரும்புகிறேன்…", send: "அனுப்பு", sending: "அனுப்புகிறது…",
    sentTitle: "செய்தி அனுப்பப்பட்டது", sentText: "நன்றி! {name} உங்கள் {email} முகவரிக்கு பதிலளிப்பார்.", again: "மற்றொன்று அனுப்பு", close: "மூடு",
  },
};

const EMPTY = { senderName: "", senderEmail: "", message: "", company: "" };

// Floating "Message me" button + form on published websites; messages land in the owner's inbox
export function ContactWidget({ userName, ownerName, lang, source = "website" }: { userName: string; ownerName: string; lang: Lang; source?: "website" | "portfolio" }) {
  const t = (key: string, vars: Record<string, string> = {}) =>
    Object.entries({ name: ownerName.split(" ")[0] || ownerName, ...vars }).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), TEXT[lang][key] ?? TEXT.en[key]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [send, { loading }] = useMutation<any>(SEND_CONTACT_MESSAGE);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await send({ variables: { input: { userName, ...form, source } } });
      const r = data.sendContactMessage;
      if (r.status !== 1) { setError(r.message); return; }
      setSentTo(form.senderEmail);
      setForm(EMPTY);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <button type="button" className="contact-fab" onClick={() => { setOpen(true); setSentTo(null); }} aria-haspopup="dialog">
        <Icon name="send" size={17} /> {t("open")}
      </button>
      {open && (
        <div className="contact-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="contact-dialog" role="dialog" aria-modal="true" aria-labelledby="contact-title">
            <button type="button" className="contact-close" onClick={() => setOpen(false)} aria-label={t("close")}><Icon name="close" size={18} /></button>
            {sentTo ? (
              <div className="contact-sent">
                <span className="contact-sent-icon" aria-hidden="true">✓</span>
                <h2 id="contact-title">{t("sentTitle")}</h2>
                <p>{t("sentText", { email: sentTo })}</p>
                <div className="contact-sent-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setSentTo(null)}>{t("again")}</button>
                  <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>{t("close")}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} noValidate={false}>
                <h2 id="contact-title">{t("title")}</h2>
                <p className="contact-sub">{t("sub")}</p>
                {error && <div className="alert alert-error"><span>{error}</span></div>}
                <label>{t("name")}<input ref={firstField} value={form.senderName} onChange={set("senderName")} required minLength={2} maxLength={120} autoComplete="name" /></label>
                <label>{t("email")}<input type="email" value={form.senderEmail} onChange={set("senderEmail")} required maxLength={255} autoComplete="email" /></label>
                <label>{t("message")}<textarea rows={5} value={form.message} onChange={set("message")} required minLength={10} maxLength={5000} placeholder={t("placeholder")} /></label>
                {/* Honeypot: invisible to people, bots fill it in */}
                <input className="contact-hp" tabIndex={-1} autoComplete="off" value={form.company} onChange={set("company")} aria-hidden="true" name="company" />
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? t("sending") : t("send")}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

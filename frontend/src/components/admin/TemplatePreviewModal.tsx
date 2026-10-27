import { useEffect, useState } from "react";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import { SAMPLE_PERSONAS, getPersona, defaultPersonaFor } from "../../templates/samples";
import { getDesign } from "../../templates/registry";
import { LangSwitch } from "../../i18n/UiLang";
import { Price } from "../guest/Price";
import type { TemplateItem } from "../../lib/templates";
import type { Lang } from "../../templates/types";

type Device = "desktop" | "mobile";

export interface PreviewTarget {
  name: string;
  designKey: string;
  category: TemplateItem["category"];
  originalPrice: number;
  discountPrice: number | null;
  // Only set for saved, active templates that guests can open
  publicSlug?: string;
}

// Full-screen preview of a template with sample data, so admins can check a design before publishing it
export function TemplatePreviewModal({ target, onClose }: { target: PreviewTarget | null; onClose: () => void }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [persona, setPersona] = useState<string>(() => defaultPersonaFor(target?.designKey));
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the preview is open
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [target, onClose]);

  if (!target) return null;
  const design = getDesign(target.designKey);

  return (
    <div className="tpl-preview-overlay" role="dialog" aria-modal="true" aria-label={`Preview ${target.name}`}>
      <div className="tpl-preview">
        <div className="tpl-preview-head">
          <div className="tpl-preview-title">
            <strong>{target.name || "Untitled template"}</strong>
            <small className="text-muted">{design.name} · {design.layout} layout</small>
          </div>
          <Price template={target} />
          <button className="modal-close" onClick={onClose} aria-label="Close preview">&times;</button>
        </div>
        <div className="preview-toolbar tpl-preview-toolbar">
          <span className="browser-dots"><i /><i /><i /></span>
          <select className="select select-sm" value={persona} onChange={(e) => setPersona(e.target.value)} aria-label="Sample profile">
            {SAMPLE_PERSONAS.map((p) => <option key={p.key} value={p.key}>{p.icon} {p.label.en}</option>)}
          </select>
          <LangSwitch value={lang} onChange={setLang} className="lang-switch-sm" />
          <div className="segmented segmented-sm">
            {(["desktop", "mobile"] as Device[]).map((d) => (
              <button key={d} className={device === d ? "active" : ""} onClick={() => setDevice(d)}>{d === "desktop" ? "Desktop" : "Mobile"}</button>
            ))}
          </div>
          {target.publicSlug && (
            <a className="btn btn-sm btn-secondary tpl-preview-open" href={`/templates/${target.publicSlug}`} target="_blank" rel="noreferrer">Open storefront page ↗</a>
          )}
        </div>
        <div className={`preview-stage preview-${device} tpl-preview-stage`}>
          <div className="preview-screen">
            <TemplateRenderer designKey={target.designKey} content={getPersona(persona).content[lang]} lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}

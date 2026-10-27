import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { Lang, LayoutKey, TemplateTheme } from "../types";
import { IMAGE_SIZES, responsiveImageProps } from "../media";
import { getLabels } from "../i18n";
import { LabelsContext, LightboxContext, useLabels, useLightbox } from "./context";
import type { OpenLightbox } from "./context";
import { initials, themeStyle } from "./view";
import type { AlbumView, CertView, ContactEntry, ContactKind, EduView, JobView, PortfolioView, ProjectView, ServiceView, StatView, TestimonialView, Tier } from "./view";

/* ───────────────────────── Lightbox ───────────────────────── */

function Lightbox({ state, onClose, onMove }: { state: { items: AlbumView[]; index: number } | null; onClose: () => void; onMove: (delta: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const L = useLabels();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (state && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
    } else if (!state && d.open) {
      d.close();
    }
  }, [state]);

  const item = state ? state.items[state.index] : undefined;
  const count = state ? state.items.length : 0;

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onMove(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      onMove(-1);
    }
  };
  const onClick = (e: ReactMouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <dialog ref={ref} className="tpl-lb" aria-label={L.gallery} onClose={onClose} onKeyDown={onKeyDown} onClick={onClick}>
      {item && (
        <div className="tpl-lb-inner">
          <figure className="tpl-lb-fig">
            <img className="tpl-lb-img" src={item.url} alt={item.caption || L.gallery} />
            <figcaption className="tpl-lb-cap">
              {item.caption && <span className="tpl-lb-cap-text">{item.caption}</span>}
              {count > 1 && (
                <span className="tpl-lb-count">
                  {state!.index + 1} / {count}
                </span>
              )}
            </figcaption>
          </figure>
          {count > 1 && (
            <>
              <button type="button" className="tpl-lb-nav tpl-lb-prev" onClick={() => onMove(-1)} aria-label={L.previous}>
                <Icon name="chevronLeft" />
              </button>
              <button type="button" className="tpl-lb-nav tpl-lb-next" onClick={() => onMove(1)} aria-label={L.next}>
                <Icon name="chevronRight" />
              </button>
            </>
          )}
          <button type="button" className="tpl-lb-close" onClick={onClose} aria-label={L.close} autoFocus>
            <Icon name="close" />
          </button>
        </div>
      )}
    </dialog>
  );
}

export function Root({
  layout,
  theme,
  tier = "premium",
  lang = "en",
  children,
}: {
  layout: LayoutKey;
  theme: TemplateTheme;
  tier?: Tier;
  lang?: Lang;
  children: ReactNode;
}) {
  const [lb, setLb] = useState<{ items: AlbumView[]; index: number } | null>(null);
  const open = useCallback<OpenLightbox>((items, index) => {
    if (items.length > 0) setLb({ items, index: Math.max(0, Math.min(index, items.length - 1)) });
  }, []);
  const close = useCallback(() => setLb(null), []);
  const move = useCallback((delta: number) => {
    setLb((cur) => (cur ? { items: cur.items, index: (cur.index + delta + cur.items.length) % cur.items.length } : cur));
  }, []);

  return (
    <div
      className={`tpl-root tpl-${layout} tpl-${tier} tpl-lang-${lang}${theme.dark ? " tpl-dark" : ""}`}
      style={themeStyle(theme, lang)}
      lang={lang}
      data-tpl-layout={layout}
      data-tpl-tier={tier}
    >
      <LabelsContext.Provider value={getLabels(lang)}>
        <LightboxContext.Provider value={open}>{children}</LightboxContext.Provider>
        <Lightbox state={lb} onClose={close} onMove={move} />
      </LabelsContext.Provider>
    </div>
  );
}

/* ───────────────────────── Icons ───────────────────────── */

export type IconName =
  | ContactKind
  | "arrowUpRight"
  | "arrowRight"
  | "check"
  | "award"
  | "star"
  | "briefcase"
  | "cap"
  | "chat"
  | "zap"
  | "layers"
  | "user"
  | "send"
  | "building"
  | "image"
  | "shield"
  | "chevronLeft"
  | "chevronRight"
  | "close"
  | "expand"
  | "clock"
  | "wrench"
  | "quote";

const ICONS: Record<IconName, ReactNode> = {
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  location: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  github: (
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  ),
  arrowUpRight: (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  award: (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11" />
    </>
  ),
  star: <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />,
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  cap: (
    <>
      <path d="M22 10 12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  layers: (
    <>
      <path d="m12 2 10 5-10 5L2 7l10-5z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
      <path d="M22 2 11 13" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  close: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
      <path d="M9.2 8.2c-.3 3.4 3.2 6.9 6.6 6.6l.9-1.4-2-1.1-.9.7c-1.1-.5-2-1.4-2.5-2.5l.7-.9-1.1-2z" />
    </>
  ),
  hours: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  quote: (
    <>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .01-1 1.03V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </>
  ),
  expand: (
    <>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </>
  ),
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className ? `tpl-icon ${className}` : "tpl-icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

/* ───────────────────────── Shared building blocks ───────────────────────── */

function Initials({ view, cls }: { view: PortfolioView; cls: string }) {
  return (
    <div className={`${cls} tpl-avatar-initials`} aria-hidden="true">
      <span>{view.initials}</span>
    </div>
  );
}

export function Avatar({ view, className }: { view: PortfolioView; className?: string }) {
  const cls = className ? `tpl-avatar ${className}` : "tpl-avatar";
  const [failedUrl, setFailedUrl] = useState("");
  if (view.photoUrl && failedUrl !== view.photoUrl) {
    return (
      <div className={`${cls} tpl-avatar-photo`}>
        <img {...responsiveImageProps(view.photoUrl, IMAGE_SIZES.avatar)} alt={view.hasName ? `${view.labels.photoOf} ${view.name}` : view.labels.photoOf} onError={() => setFailedUrl(view.photoUrl)} />
      </div>
    );
  }
  return <Initials view={view} cls={cls} />;
}

/** Decorative, absolutely-positioned backdrop: the cover photo (if any) with a themed tint, or a rich themed pattern. */
export function Cover({ url, className }: { url: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState("");
  const show = Boolean(url) && failedUrl !== url;
  return (
    <div className={`tpl-cover${show ? " has-img" : " is-empty"}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {show && <img className="tpl-cover-img" {...responsiveImageProps(url, IMAGE_SIZES.wide)} alt="" onError={() => setFailedUrl(url)} />}
      <span className="tpl-cover-tint" />
      <span className="tpl-cover-art" />
    </div>
  );
}

export function ContactLink({ entry, className }: { entry: ContactEntry; className?: string }) {
  const cls = className ? `tpl-contact-item ${className}` : "tpl-contact-item";
  const inner = (
    <>
      <span className="tpl-contact-ico">
        <Icon name={entry.kind} />
      </span>
      <span className="tpl-contact-text">{entry.label}</span>
    </>
  );
  if (!entry.href) return <span className={cls}>{inner}</span>;
  return (
    <a
      className={cls}
      href={entry.href}
      {...(entry.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {inner}
    </a>
  );
}

export function ContactList({ entries, className }: { entries: ContactEntry[]; className?: string }) {
  if (entries.length === 0) return null;
  return (
    <ul className={className ? `tpl-contact ${className}` : "tpl-contact"}>
      {entries.map((e) => (
        <li key={e.kind}>
          <ContactLink entry={e} />
        </li>
      ))}
    </ul>
  );
}

export function Chips({ items, className }: { items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={className ? `tpl-chips ${className}` : "tpl-chips"}>
      {items.map((s, i) => (
        <li className="tpl-chip" key={`${s}-${i}`}>
          {s}
        </li>
      ))}
    </ul>
  );
}

export function Bullets({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="tpl-bullets">
      {items.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

export function Section({
  title,
  icon,
  num,
  className,
  children,
}: {
  title: string;
  icon?: IconName;
  num?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className ? `tpl-sec ${className}` : "tpl-sec"}>
      <header className="tpl-sec-head">
        {num !== undefined && <span className="tpl-sec-num">{String(num).padStart(2, "0")}</span>}
        {icon && (
          <span className="tpl-sec-ico">
            <Icon name={icon} />
          </span>
        )}
        <h2 className="tpl-sec-title">{title}</h2>
      </header>
      <div className="tpl-sec-body">{children}</div>
    </section>
  );
}

function OrgLine({ company, location }: { company: string; location: string }) {
  if (!company && !location) return null;
  return (
    <p className="tpl-job-org">
      {company && <span className="tpl-job-company">{company}</span>}
      {company && location && (
        <span className="tpl-sep" aria-hidden="true">
          ·
        </span>
      )}
      {location && <span className="tpl-job-loc">{location}</span>}
    </p>
  );
}

export function JobBody({ job }: { job: JobView }) {
  return (
    <>
      {job.role && <h3 className="tpl-job-role">{job.role}</h3>}
      <OrgLine company={job.company} location={job.location} />
      <Bullets items={job.bullets} />
    </>
  );
}

export function JobList({ items, logos = false }: { items: JobView[]; logos?: boolean }) {
  return (
    <div className="tpl-jobs">
      {items.map((j, i) => (
        <article className={`tpl-job${j.current ? " is-current" : ""}`} key={i}>
          {logos && (
            <span className="tpl-job-logo" aria-hidden="true">
              {initials(j.company || j.role)}
            </span>
          )}
          <div className="tpl-job-main">
            <div className="tpl-job-head">
              <div className="tpl-job-titles">
                {j.role && <h3 className="tpl-job-role">{j.role}</h3>}
                <OrgLine company={j.company} location={j.location} />
              </div>
              {j.dates && <span className="tpl-job-date">{j.dates}</span>}
            </div>
            <Bullets items={j.bullets} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function EduList({ items }: { items: EduView[] }) {
  return (
    <div className="tpl-edus">
      {items.map((e, i) => (
        <article className="tpl-edu" key={i}>
          <div className="tpl-edu-head">
            <div className="tpl-edu-titles">
              {e.degree && <h3 className="tpl-edu-degree">{e.degree}</h3>}
              {e.school && <p className="tpl-edu-school">{e.school}</p>}
            </div>
            {e.dates && <span className="tpl-edu-date">{e.dates}</span>}
          </div>
          {e.details && <p className="tpl-edu-details">{e.details}</p>}
        </article>
      ))}
    </div>
  );
}

export function ProjectCard({
  project,
  index,
  className,
  overlay = false,
}: {
  project: ProjectView;
  index?: number;
  className?: string;
  /** Put the title over the cover image (when there is one) */
  overlay?: boolean;
}) {
  const p = project;
  const L = useLabels();
  const [failedUrl, setFailedUrl] = useState("");
  const hasImage = Boolean(p.imageUrl) && failedUrl !== p.imageUrl;
  const titleOnMedia = overlay && Boolean(p.name);
  return (
    <article className={`tpl-proj has-media${hasImage ? " has-img" : " no-img"}${titleOnMedia ? " is-overlay" : ""}${className ? ` ${className}` : ""}`}>
      <div className={`tpl-proj-media${hasImage ? "" : " is-pattern"}`}>
        {hasImage ? (
          <img
            {...responsiveImageProps(p.imageUrl, IMAGE_SIZES.card)}
            alt={p.name || L.projects}
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrl(p.imageUrl)}
          />
        ) : (
          <span className="tpl-proj-mono" aria-hidden="true">
            {initials(p.name || L.projects)}
          </span>
        )}
        {titleOnMedia && (
          <div className="tpl-proj-overlay">
            {index !== undefined && <span className="tpl-proj-idx">{String(index + 1).padStart(2, "0")}</span>}
            <h3 className="tpl-proj-name">{p.name}</h3>
          </div>
        )}
      </div>
      <div className="tpl-proj-body">
        {!titleOnMedia && (
          <div className="tpl-proj-head">
            {index !== undefined && <span className="tpl-proj-idx">{String(index + 1).padStart(2, "0")}</span>}
            {p.name && <h3 className="tpl-proj-name">{p.name}</h3>}
          </div>
        )}
        {p.description && <p className="tpl-proj-desc">{p.description}</p>}
        {(p.tech.length > 0 || p.href) && (
          <div className="tpl-proj-foot">
            <Chips items={p.tech} className="tpl-proj-tech" />
            {p.href && (
              <a className="tpl-proj-url" href={p.href} target="_blank" rel="noopener noreferrer">
                <span className="tpl-contact-text">{p.linkLabel}</span>
                <Icon name="arrowUpRight" />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ProjectGrid({ items, numbered = false, overlay = false }: { items: ProjectView[]; numbered?: boolean; overlay?: boolean }) {
  return (
    <div className="tpl-projects">
      {items.map((p, i) => (
        <ProjectCard project={p} index={numbered ? i : undefined} overlay={overlay} key={i} />
      ))}
    </div>
  );
}

/* ───────────────────────── Gallery ───────────────────────── */

export type GalleryStyle = "grid" | "masonry" | "bento" | "film";

export function Gallery({ items, look = "grid", captions = "below", className }: { items: AlbumView[]; look?: GalleryStyle; captions?: "below" | "overlay"; className?: string }) {
  const open = useLightbox();
  const L = useLabels();
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const visible = items.filter((a) => !broken.has(a.url));
  if (visible.length === 0) return null;
  return (
    <ul className={`tpl-gal tpl-gal-${look} tpl-gal-cap-${captions}${className ? ` ${className}` : ""}`} data-count={Math.min(visible.length, 7)}>
      {visible.map((a, i) => (
        <li className="tpl-gal-item" key={`${a.url}-${i}`}>
          <figure className="tpl-gal-fig">
            <button type="button" className="tpl-gal-btn" onClick={() => open(visible, i)} aria-label={a.caption ? `${L.viewImage}: ${a.caption}` : `${L.viewImage} ${i + 1}`}>
              <img
                {...responsiveImageProps(a.url, i === 0 && look === "bento" ? IMAGE_SIZES.card : IMAGE_SIZES.thumb)}
                alt={a.caption}
                loading="lazy"
                decoding="async"
                onError={() =>
                  setBroken((prev) => {
                    const next = new Set(prev);
                    next.add(a.url);
                    return next;
                  })
                }
              />
              <span className="tpl-gal-zoom" aria-hidden="true">
                <Icon name="expand" />
              </span>
            </button>
            {a.caption && <figcaption className="tpl-gal-cap">{a.caption}</figcaption>}
          </figure>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Certifications ───────────────────────── */

const SEAL_POINTS = (() => {
  const pts: string[] = [];
  const n = 24;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? 23 : 20.6;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
})();

/** Decorative award seal used when a certificate has no image. */
export function Seal({ className }: { className?: string }) {
  return (
    <svg className={className ? `tpl-seal ${className}` : "tpl-seal"} viewBox="0 0 48 60" aria-hidden="true" focusable="false">
      <path className="tpl-seal-ribbon-b" d="M14 36 8 56l8.5-3.5L21 59l4-18z" />
      <path className="tpl-seal-ribbon-a" d="M34 36l6 20-8.5-3.5L27 59l-4-18z" />
      <polygon className="tpl-seal-rosette" points={SEAL_POINTS} />
      <circle className="tpl-seal-ring" cx="24" cy="24" r="16.5" />
      <circle className="tpl-seal-core" cx="24" cy="24" r="13.5" />
      <path className="tpl-seal-mark" d="m17.5 24.5 4.5 4.5 8.5-9" />
    </svg>
  );
}

function CertThumb({ cert, onOpen, onFail }: { cert: CertView; onOpen: () => void; onFail: () => void }) {
  const L = useLabels();
  return (
    <button type="button" className="tpl-cert-thumb" onClick={onOpen} aria-label={`${L.viewImage}: ${cert.name || L.certifications}`}>
      <img
        {...responsiveImageProps(cert.imageUrl, IMAGE_SIZES.thumb)}
        alt={cert.name || L.certifications}
        loading="lazy"
        decoding="async"
        onError={onFail}
      />
      <span className="tpl-gal-zoom" aria-hidden="true">
        <Icon name="expand" />
      </span>
    </button>
  );
}

export function CertGrid({ items, className }: { items: CertView[]; className?: string }) {
  const open = useLightbox();
  const L = useLabels();
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  if (items.length === 0) return null;
  const withImg = items.filter((c) => c.imageUrl && !broken.has(c.imageUrl));
  const slides: AlbumView[] = withImg.map((c) => ({ url: c.imageUrl, caption: [c.name, c.meta].filter(Boolean).join(" — ") }));
  return (
    <ul className={className ? `tpl-certs ${className}` : "tpl-certs"}>
      {items.map((c, i) => {
        const slide = withImg.indexOf(c);
        return (
          <li className={`tpl-cert${slide >= 0 ? " has-img" : ""}`} key={`${c.name}-${i}`}>
            <div className="tpl-cert-media">
              {slide >= 0 ? (
                <CertThumb
                  cert={c}
                  onOpen={() => open(slides, slide)}
                  onFail={() =>
                    setBroken((prev) => {
                      const next = new Set(prev);
                      next.add(c.imageUrl);
                      return next;
                    })
                  }
                />
              ) : (
                <Seal />
              )}
            </div>
            <div className="tpl-cert-body">
              {c.name && <h3 className="tpl-cert-name">{c.name}</h3>}
              {c.meta && <p className="tpl-cert-meta">{c.meta}</p>}
              {c.href && (
                <a className="tpl-cert-verify" href={c.href} target="_blank" rel="noopener noreferrer">
                  <Icon name="shield" />
                  {L.verify}
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────────────────── Calls to action (call / WhatsApp) ───────────────────────── */

/** Prominent click-to-call and WhatsApp buttons; renders nothing when neither is set. */
export function ActionButtons({ view, className, email = false }: { view: PortfolioView; className?: string; email?: boolean }) {
  const L = view.labels;
  if (!view.callHref && !view.whatsappHref && !(email && view.email)) return null;
  return (
    <div className={className ? `tpl-actions ${className}` : "tpl-actions"}>
      {view.callHref && (
        <a className="tpl-act tpl-act-call" href={view.callHref}>
          <Icon name="phone" />
          <span>{L.call}</span>
        </a>
      )}
      {view.whatsappHref && (
        <a className="tpl-act tpl-act-wa" href={view.whatsappHref} target="_blank" rel="noopener noreferrer">
          <Icon name="whatsapp" />
          <span>{L.whatsapp}</span>
        </a>
      )}
      {email && view.email && (
        <a className="tpl-act tpl-act-mail" href={`mailto:${view.email}`}>
          <Icon name="email" />
          <span>{L.email}</span>
        </a>
      )}
    </div>
  );
}

export function HoursBadge({ view, className }: { view: PortfolioView; className?: string }) {
  if (!view.hours) return null;
  return (
    <p className={className ? `tpl-hours ${className}` : "tpl-hours"}>
      <Icon name="clock" />
      <span>
        <span className="tpl-hours-label">{view.labels.businessHours}</span>
        <span className="tpl-hours-text">{view.hours}</span>
      </span>
    </p>
  );
}

/* ───────────────────────── Services ───────────────────────── */

function ServiceCard({ item, index }: { item: ServiceView; index: number }) {
  const [failedUrl, setFailedUrl] = useState("");
  const L = useLabels();
  const hasImage = Boolean(item.imageUrl) && failedUrl !== item.imageUrl;
  return (
    <article className={`tpl-svc${hasImage ? " has-img" : " no-img"}`}>
      <div className={`tpl-svc-media${hasImage ? "" : " is-pattern"}`}>
        {hasImage ? (
          <img
            {...responsiveImageProps(item.imageUrl, IMAGE_SIZES.card)}
            alt={item.name || L.services}
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrl(item.imageUrl)}
          />
        ) : (
          <span className="tpl-svc-ico" aria-hidden="true">
            <Icon name={SERVICE_ICONS[index % SERVICE_ICONS.length]} />
          </span>
        )}
        {item.price && (
          <span className="tpl-svc-price">
            <span className="tpl-sr">{L.price}: </span>
            {item.price}
          </span>
        )}
      </div>
      <div className="tpl-svc-body">
        {item.name && <h3 className="tpl-svc-name">{item.name}</h3>}
        {item.description && <p className="tpl-svc-desc">{item.description}</p>}
      </div>
    </article>
  );
}

const SERVICE_ICONS: IconName[] = ["wrench", "zap", "star", "check", "layers", "award"];

export function ServiceGrid({ items, className }: { items: ServiceView[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={className ? `tpl-svcs ${className}` : "tpl-svcs"} data-count={items.length}>
      {items.map((it, i) => (
        <ServiceCard item={it} index={i} key={`${it.name}-${i}`} />
      ))}
    </div>
  );
}

/* ───────────────────────── Testimonials ───────────────────────── */

export function Testimonials({ items, className }: { items: TestimonialView[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={className ? `tpl-quotecards ${className}` : "tpl-quotecards"}>
      {items.map((t, i) => (
        <li className="tpl-qc" key={i}>
          <figure>
            <span className="tpl-qc-mark" aria-hidden="true">
              <Icon name="quote" />
            </span>
            <blockquote className="tpl-qc-text">{t.text}</blockquote>
            {(t.name || t.role) && (
              <figcaption className="tpl-qc-who">
                <span className="tpl-qc-avatar" aria-hidden="true">
                  {initials(t.name || t.role)}
                </span>
                <span className="tpl-qc-id">
                  {t.name && <span className="tpl-qc-name">{t.name}</span>}
                  {t.role && <span className="tpl-qc-role">{t.role}</span>}
                </span>
              </figcaption>
            )}
          </figure>
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Stats ───────────────────────── */

export function StatStrip({ stats, className }: { stats: StatView[]; className?: string }) {
  if (stats.length === 0) return null;
  return (
    <ul className={className ? `tpl-statstrip ${className}` : "tpl-statstrip"}>
      {stats.map((s) => (
        <li className="tpl-ss-item" key={s.label}>
          <span className="tpl-ss-ico" aria-hidden="true">
            <Icon name={s.icon} />
          </span>
          <strong className="tpl-ss-value">{s.value}</strong>
          <span className="tpl-ss-label">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function TextList({ items, icon, className }: { items: string[]; icon: IconName; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={className ? `tpl-list ${className}` : "tpl-list"}>
      {items.map((s, i) => (
        <li key={`${s}-${i}`}>
          <Icon name={icon} />
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

export function Footer({ view, className }: { view: PortfolioView; className?: string }) {
  return (
    <footer className={className ? `tpl-footer ${className}` : "tpl-footer"}>
      <span>
        © {new Date().getFullYear()}
        {view.hasName ? ` ${view.name}` : ""}
      </span>
      {view.headline && <span className="tpl-footer-sub">{view.headline}</span>}
    </footer>
  );
}

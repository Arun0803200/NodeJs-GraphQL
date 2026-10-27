import { useState } from "react";
import type { ReactNode } from "react";
import type { LayoutProps } from "../types";
import { IMAGE_SIZES, responsiveImageProps } from "../media";
import {
  ActionButtons,
  Avatar,
  CertGrid,
  ContactList,
  Cover,
  EduList,
  Gallery,
  HoursBadge,
  Icon,
  JobList,
  Root,
  Section,
  ServiceGrid,
  Testimonials,
} from "./shared";
import { buildView, initials } from "./view";

function Rules({ items }: { items: string[] }) {
  return (
    <ul className="tpl-m-rules">
      {items.map((s, i) => (
        <li key={`${s}-${i}`}>{s}</li>
      ))}
    </ul>
  );
}

function WorkMedia({ url, name, fallbackAlt }: { url: string; name: string; fallbackAlt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className="tpl-m-work-media is-pattern" aria-hidden="true">
        <span>{initials(name || fallbackAlt)}</span>
      </div>
    );
  }
  return (
    <div className="tpl-m-work-media">
      <img {...responsiveImageProps(url, IMAGE_SIZES.card)} alt={name || fallbackAlt} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </div>
  );
}

export function MinimalLayout({ content, theme, tier, lang }: LayoutProps) {
  const v = buildView(content, lang);
  const L = v.labels;
  const premium = tier === "premium";

  const anyWorkMedia = v.projects.some((p) => p.imageUrl);
  const sections: { title: string; body: ReactNode }[] = [];
  if (v.services.length > 0) sections.push({ title: L.services, body: <ServiceGrid items={v.services} /> });
  if (v.experience.length > 0) sections.push({ title: L.experience, body: <JobList items={v.experience} /> });
  if (v.projects.length > 0)
    sections.push({
      title: L.projects,
      body: (
        <div className="tpl-m-works">
          {v.projects.map((p, i) => (
            <article className={`tpl-m-work${anyWorkMedia ? " has-media" : ""}`} key={i}>
              {anyWorkMedia && <WorkMedia key={p.imageUrl} url={p.imageUrl} name={p.name} fallbackAlt={L.projects} />}
              <div className="tpl-m-work-text">
                <div className="tpl-m-work-head">
                  {p.name && <h3 className="tpl-m-work-name">{p.name}</h3>}
                  {p.href && (
                    <a className="tpl-m-work-link" href={p.href} target="_blank" rel="noopener noreferrer" aria-label={`${L.viewProject}: ${p.name}`}>
                      <span className="tpl-contact-text">{p.linkLabel}</span>
                      <Icon name="arrowUpRight" />
                    </a>
                  )}
                </div>
                {p.description && <p className="tpl-m-work-desc">{p.description}</p>}
                {p.tech.length > 0 && <p className="tpl-m-work-tech">{p.tech.join("  /  ")}</p>}
              </div>
            </article>
          ))}
        </div>
      ),
    });
  if (v.education.length > 0) sections.push({ title: L.education, body: <EduList items={v.education} /> });
  if (v.skills.length > 0) sections.push({ title: L.skills, body: <Rules items={v.skills} /> });
  if (v.certifications.length > 0) sections.push({ title: L.certifications, body: <CertGrid items={v.certifications} /> });
  if (v.album.length > 0) sections.push({ title: L.gallery, body: <Gallery items={v.album} look={premium ? "masonry" : "grid"} captions="below" /> });
  if (v.testimonials.length > 0) sections.push({ title: L.testimonials, body: <Testimonials items={v.testimonials} /> });
  if (v.achievements.length > 0) sections.push({ title: L.achievements, body: <Rules items={v.achievements} /> });
  if (v.languages.length > 0) sections.push({ title: L.languages, body: <Rules items={v.languages} /> });

  return (
    <Root layout="minimal" theme={theme} tier={tier} lang={lang}>
      <div className="tpl-m-wrap">
        <div className="tpl-m-topbar">
          <span className="tpl-m-mono">{v.initials}</span>
          {(v.location || v.email) && (
            <span className="tpl-m-topmeta">
              {v.location && <span>{v.location}</span>}
              {v.email && (
                <a href={`mailto:${v.email}`} className="tpl-contact-text">
                  {v.email}
                </a>
              )}
            </span>
          )}
        </div>

        <header className={`tpl-m-hero${premium ? " is-split" : ""}`}>
          <div className="tpl-m-hero-text">
            {!premium && v.photoUrl && <Avatar view={v} className="tpl-m-avatar" />}
            {premium && v.location && <p className="tpl-m-kicker">{v.location}</p>}
            <h1 className={`tpl-m-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
            {v.headline && <p className="tpl-m-headline">{v.headline}</p>}
            {v.summary && <p className="tpl-m-summary">{v.summary}</p>}
            <ActionButtons view={v} className="tpl-m-actions" />
            <HoursBadge view={v} className="tpl-m-hours" />
            <ContactList
              entries={v.contacts.filter((c) => c.kind !== "location" && c.kind !== "email" && c.kind !== "hours" && c.kind !== "whatsapp")}
              className="tpl-m-contact"
            />
          </div>
          {premium && (
            <div className="tpl-m-portrait">
              <span className="tpl-m-portrait-frame" aria-hidden="true" />
              <Avatar view={v} className="tpl-m-arch" />
            </div>
          )}
        </header>
      </div>

      {premium && (
        <div className="tpl-m-strip">
          <Cover url={v.coverUrl} className="tpl-m-cover" />
          {v.stats.length > 0 && (
            <ul className="tpl-m-figures">
              {v.stats.map((s) => (
                <li key={s.label}>
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="tpl-m-wrap">
        {sections.map((s, i) => (
          <Section key={s.title} title={s.title} num={i + 1} className="tpl-m-sec">
            {s.body}
          </Section>
        ))}

        <footer className="tpl-m-footer">
          {v.email || v.callHref || v.whatsappHref ? (
            <>
              <p className="tpl-m-cta">{L.getInTouch}</p>
              {v.email && (
                <a className="tpl-m-cta-link" href={`mailto:${v.email}`}>
                  <span className="tpl-contact-text">{v.email}</span>
                  <Icon name="arrowRight" />
                </a>
              )}
              <ActionButtons view={v} className="tpl-m-actions tpl-m-foot-actions" />
            </>
          ) : null}
          <p className="tpl-m-copy">
            © {new Date().getFullYear()}
            {v.hasName ? ` ${v.name}` : ""}
          </p>
        </footer>
      </div>
    </Root>
  );
}

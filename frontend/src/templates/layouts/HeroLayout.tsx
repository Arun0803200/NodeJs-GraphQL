import type { ReactNode } from "react";
import type { LayoutProps } from "../types";
import type { IconName } from "./shared";
import {
  ActionButtons,
  Avatar,
  CertGrid,
  Chips,
  Cover,
  EduList,
  Footer,
  Gallery,
  Icon,
  JobList,
  ProjectGrid,
  Root,
  ServiceGrid,
  Testimonials,
  TextList,
} from "./shared";
import { buildView } from "./view";

function Card({ title, icon, className, children }: { title: string; icon: IconName; className?: string; children: ReactNode }) {
  return (
    <section className={className ? `tpl-h-card ${className}` : "tpl-h-card"}>
      <header className="tpl-h-card-head">
        <span className="tpl-h-card-ico">
          <Icon name={icon} />
        </span>
        <h2 className="tpl-h-card-title">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export function HeroLayout({ content, theme, tier, lang }: LayoutProps) {
  const v = buildView(content, lang);
  const L = v.labels;
  const premium = tier === "premium";
  const linkText: Record<string, string> = { website: L.website, linkedin: "LinkedIn", github: "GitHub" };
  const hasSide = v.skills.length > 0 || v.education.length > 0;
  const hasDuo = v.achievements.length > 0 || v.languages.length > 0;
  const hasCta = Boolean(v.email || v.callHref || v.whatsappHref);

  return (
    <Root layout="hero" theme={theme} tier={tier} lang={lang}>
      <header className="tpl-h-hero">
        {premium && <Cover url={v.coverUrl} className="tpl-h-cover" />}
        <div className="tpl-h-hero-inner">
          <div className="tpl-h-intro">
            {(v.location || v.hours) && (
              <div className="tpl-h-eyebrows">
                {v.location && (
                  <span className="tpl-h-eyebrow">
                    <Icon name="location" />
                    <span className="tpl-contact-text">{v.location}</span>
                  </span>
                )}
                {v.hours && (
                  <span className="tpl-h-eyebrow">
                    <Icon name="clock" />
                    <span className="tpl-contact-text">{v.hours}</span>
                  </span>
                )}
              </div>
            )}
            <h1 className={`tpl-h-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
            {v.headline && <p className="tpl-h-headline">{v.headline}</p>}
            {(hasCta || v.links.length > 0) && (
              <div className="tpl-h-ctas">
                {v.callHref && (
                  <a className="tpl-h-btn tpl-h-btn-solid" href={v.callHref}>
                    <Icon name="phone" />
                    {L.call}
                  </a>
                )}
                {v.whatsappHref && (
                  <a className="tpl-h-btn tpl-h-btn-wa" href={v.whatsappHref} target="_blank" rel="noopener noreferrer">
                    <Icon name="whatsapp" />
                    {L.whatsapp}
                  </a>
                )}
                {v.email && (
                  <a className={`tpl-h-btn ${v.callHref ? "tpl-h-btn-ghost" : "tpl-h-btn-solid"}`} href={`mailto:${v.email}`}>
                    <Icon name="send" />
                    {L.getInTouch}
                  </a>
                )}
                {v.links.map((l) => (
                  <a key={l.kind} className="tpl-h-btn tpl-h-btn-ghost" href={l.href} target="_blank" rel="noopener noreferrer" title={l.label}>
                    <Icon name={l.kind} />
                    {linkText[l.kind]}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="tpl-h-portrait">
            <Avatar view={v} className="tpl-h-avatar" />
          </div>
        </div>
        {premium && v.stats.length > 0 && (
          <ul className="tpl-h-glass-stats">
            {v.stats.map((s) => (
              <li key={s.label}>
                <span className="tpl-h-gs-ico" aria-hidden="true">
                  <Icon name={s.icon} />
                </span>
                <span className="tpl-h-gs-text">
                  <strong>{s.value}</strong>
                  <span>{s.label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </header>

      <main className="tpl-h-body">
        {v.summary && (
          <Card title={L.about} icon="user" className="tpl-h-about">
            <p className="tpl-h-lead">{v.summary}</p>
          </Card>
        )}

        {v.services.length > 0 && (
          <Card title={L.services} icon="wrench" className="tpl-h-services">
            <ServiceGrid items={v.services} />
          </Card>
        )}

        {(v.experience.length > 0 || hasSide) && (
          <div className={`tpl-h-split${v.experience.length > 0 && hasSide ? "" : " is-single"}`}>
            {v.experience.length > 0 && (
              <Card title={L.experience} icon="briefcase">
                <JobList items={v.experience} logos />
              </Card>
            )}
            {hasSide && (
              <div className={`tpl-h-stack${v.experience.length > 0 ? "" : " is-row"}`}>
                {v.skills.length > 0 && (
                  <Card title={L.skills} icon="zap">
                    <Chips items={v.skills} />
                  </Card>
                )}
                {v.education.length > 0 && (
                  <Card title={L.education} icon="cap">
                    <EduList items={v.education} />
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {v.projects.length > 0 && (
          <Card title={L.projects} icon="layers">
            <ProjectGrid items={v.projects} numbered={premium} overlay={premium} />
          </Card>
        )}

        {v.album.length > 0 && (
          <Card title={L.gallery} icon="image" className="tpl-h-gallery">
            <Gallery items={v.album} look={premium ? "masonry" : "grid"} captions={premium ? "overlay" : "below"} />
          </Card>
        )}

        {v.testimonials.length > 0 && (
          <Card title={L.testimonials} icon="quote">
            <Testimonials items={v.testimonials} />
          </Card>
        )}

        {v.certifications.length > 0 && (
          <Card title={L.certifications} icon="award">
            <CertGrid items={v.certifications} />
          </Card>
        )}

        {hasDuo && (
          <div className="tpl-h-trio">
            {v.achievements.length > 0 && (
              <Card title={L.achievements} icon="star">
                <TextList items={v.achievements} icon="check" />
              </Card>
            )}
            {v.languages.length > 0 && (
              <Card title={L.languages} icon="chat">
                <Chips items={v.languages} />
              </Card>
            )}
          </div>
        )}

        {hasCta && (
          <section className="tpl-h-cta-band">
            <div>
              <h2 className="tpl-h-cta-title">{L.getInTouch}</h2>
              {(v.hours || v.headline) && <p className="tpl-h-cta-sub">{v.hours ? `${L.businessHours}: ${v.hours}` : v.headline}</p>}
            </div>
            <div className="tpl-h-cta-btns">
              <ActionButtons view={v} className="tpl-h-band-actions" />
              {v.email && (
                <a className="tpl-h-btn tpl-h-btn-solid" href={`mailto:${v.email}`}>
                  <Icon name="email" />
                  <span className="tpl-contact-text">{v.email}</span>
                </a>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer view={v} />
    </Root>
  );
}

import type { ReactNode } from "react";
import type { LayoutProps } from "../types";
import type { IconName } from "./shared";
import {
  ActionButtons,
  Avatar,
  CertGrid,
  Chips,
  ContactLink,
  Cover,
  EduList,
  Footer,
  Gallery,
  Icon,
  JobList,
  ProjectCard,
  Root,
  ServiceGrid,
  Testimonials,
  TextList,
} from "./shared";
import { buildView } from "./view";

function Tile({
  label,
  icon,
  size,
  className,
  children,
}: {
  label?: string;
  icon?: IconName;
  size: 2 | 3 | 4 | 6;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`tpl-b-tile tpl-b-w${size}${className ? ` ${className}` : ""}`}>
      {label && (
        <h2 className="tpl-b-label">
          {icon && <Icon name={icon} />}
          {label}
        </h2>
      )}
      {children}
    </section>
  );
}

export function BentoLayout({ content, theme, tier, lang }: LayoutProps) {
  const v = buildView(content, lang);
  const L = v.labels;
  const contacts = v.contacts.filter((c) => c.kind !== "whatsapp");
  const factCount = [v.skills, v.education, v.certifications, v.languages, v.achievements].filter((list) => list.length > 0).length;
  const premium = tier === "premium";
  const topStat = v.stats[0];
  const restStats = v.stats.slice(1);

  return (
    <Root layout="bento" theme={theme} tier={tier} lang={lang}>
      <div className="tpl-b-wrap">
        <div className="tpl-b-grid">
          <Tile size={4} className="tpl-b-intro">
            {premium && <Cover url={v.coverUrl} className="tpl-b-cover" />}
            <div className="tpl-b-intro-top">
              <Avatar view={v} className="tpl-b-avatar" />
              {v.location && (
                <span className="tpl-b-pill">
                  <Icon name="location" />
                  <span className="tpl-contact-text">{v.location}</span>
                </span>
              )}
            </div>
            <div className="tpl-b-intro-text">
              <h1 className={`tpl-b-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
              {v.headline && <p className="tpl-b-headline">{v.headline}</p>}
            </div>
            {(v.callHref || v.whatsappHref || v.email) && (
              <div className="tpl-b-ctarow">
                <ActionButtons view={v} className="tpl-b-actions" />
                {v.email && (
                  <a className="tpl-b-cta" href={`mailto:${v.email}`}>
                    {L.getInTouch}
                    <Icon name="arrowRight" />
                  </a>
                )}
              </div>
            )}
          </Tile>

          {contacts.length > 0 && (
            <Tile size={2} label={L.contact} icon="send" className="tpl-b-contact">
              <ul className="tpl-b-contact-list">
                {contacts.map((c) => (
                  <li key={c.kind}>
                    <ContactLink entry={c} />
                  </li>
                ))}
              </ul>
            </Tile>
          )}

          {topStat && (
            <Tile size={6} className="tpl-b-stats">
              <div className="tpl-b-bigstat">
                <span className="tpl-b-bigstat-value">{topStat.value}</span>
                <span className="tpl-b-bigstat-label">{topStat.label}</span>
              </div>
              {restStats.length > 0 && (
                <dl className="tpl-b-ministats">
                  {restStats.map((s) => (
                    <div key={s.label}>
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Tile>
          )}

          {v.summary && (
            <Tile size={6} label={L.about} icon="user" className="tpl-b-about">
              <p className="tpl-b-lead">{v.summary}</p>
            </Tile>
          )}

          {v.services.length > 0 && (
            <Tile size={6} label={L.services} icon="wrench" className="tpl-b-svctile">
              <ServiceGrid items={v.services} />
            </Tile>
          )}

          {v.experience.length > 0 && (
            <Tile size={6} label={L.experience} icon="briefcase">
              <JobList items={v.experience} />
            </Tile>
          )}

          {v.projects.length > 0 && (
            <div className="tpl-b-projects tpl-b-w6">
              {v.projects.map((p, i) => (
                <section className="tpl-b-tile tpl-b-projtile" key={i}>
                  <ProjectCard project={p} index={i} className="tpl-b-proj" overlay={premium} />
                </section>
              ))}
            </div>
          )}

          {v.album.length > 0 && (
            <Tile size={6} label={L.gallery} icon="image" className="tpl-b-galtile">
              <Gallery items={v.album} look={premium ? "bento" : "grid"} captions={premium ? "overlay" : "below"} />
            </Tile>
          )}

          {v.testimonials.length > 0 && (
            <Tile size={6} label={L.testimonials} icon="quote" className="tpl-b-quotetile">
              <Testimonials items={v.testimonials} />
            </Tile>
          )}

          {/* Small facts flow into balanced columns so no tile is stretched next to a taller one */}
          {factCount > 0 && (
            <div className="tpl-b-facts tpl-b-w6" data-count={factCount}>
              {v.skills.length > 0 && (
                <Tile size={2} label={L.skills} icon="zap">
                  <Chips items={v.skills} />
                </Tile>
              )}
              {v.education.length > 0 && (
                <Tile size={2} label={L.education} icon="cap">
                  <EduList items={v.education} />
                </Tile>
              )}
              {v.certifications.length > 0 && (
                <Tile size={2} label={L.certifications} icon="award" className="tpl-b-certtile">
                  <CertGrid items={v.certifications} />
                </Tile>
              )}
              {v.languages.length > 0 && (
                <Tile size={2} label={L.languages} icon="chat">
                  <Chips items={v.languages} className="tpl-b-langs" />
                </Tile>
              )}
              {v.achievements.length > 0 && (
                <Tile size={2} label={L.achievements} icon="star">
                  <TextList items={v.achievements} icon="check" />
                </Tile>
              )}
            </div>
          )}
        </div>
        <Footer view={v} />
      </div>
    </Root>
  );
}

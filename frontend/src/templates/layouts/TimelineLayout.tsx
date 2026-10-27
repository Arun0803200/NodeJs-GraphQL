import type { LayoutProps } from "../types";
import {
  ActionButtons,
  Avatar,
  Bullets,
  CertGrid,
  Chips,
  ContactList,
  Cover,
  Footer,
  Gallery,
  HoursBadge,
  ProjectGrid,
  Root,
  Section,
  ServiceGrid,
  StatStrip,
  Testimonials,
  TextList,
} from "./shared";
import { buildView, infoContacts } from "./view";

export function TimelineLayout({ content, theme, tier, lang }: LayoutProps) {
  const v = buildView(content, lang);
  const L = v.labels;
  const contacts = infoContacts(v);
  const premium = tier === "premium";
  const hasTrio = v.achievements.length > 0 || v.languages.length > 0;

  return (
    <Root layout="timeline" theme={theme} tier={tier} lang={lang}>
      <header className="tpl-t-header">
        {premium && (
          <div className="tpl-t-visual">
            <Cover url={v.coverUrl} className="tpl-t-cover" />
          </div>
        )}
        <div className="tpl-t-header-inner">
          <div className="tpl-t-intro">
            <div className="tpl-t-idrow">
              <Avatar view={v} className="tpl-t-avatar" />
              <div className="tpl-t-idtext">
                <h1 className={`tpl-t-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
                {v.headline && <p className="tpl-t-headline">{v.headline}</p>}
              </div>
            </div>
            {v.summary && <p className="tpl-t-summary">{v.summary}</p>}
            <ActionButtons view={v} className="tpl-t-actions" />
          </div>
          {(contacts.length > 0 || v.hours) && (
            <div className="tpl-t-contact-card">
              <p className="tpl-t-contact-label">{L.getInTouch}</p>
              <ContactList entries={contacts} className="tpl-t-contact" />
              <HoursBadge view={v} className="tpl-t-hours" />
            </div>
          )}
        </div>
      </header>

      {premium && v.stats.length > 0 && (
        <div className="tpl-t-statwrap">
          <StatStrip stats={v.stats} className="tpl-t-stats" />
        </div>
      )}

      <main className="tpl-t-main">
        {v.services.length > 0 && (
          <Section title={L.services} className="tpl-t-sec">
            <ServiceGrid items={v.services} />
          </Section>
        )}

        {v.experience.length > 0 && (
          <Section title={L.experience} className="tpl-t-sec">
            <ol className="tpl-tl">
              {v.experience.map((j, i) => (
                <li className={`tpl-tl-item${j.current ? " is-current" : ""}`} key={i}>
                  <div className="tpl-tl-when">
                    {j.dates && <span className="tpl-tl-date">{j.dates}</span>}
                    {j.current && <span className="tpl-tl-badge">{L.present}</span>}
                  </div>
                  <div className="tpl-tl-card">
                    {j.role && <h3 className="tpl-job-role">{j.role}</h3>}
                    {(j.company || j.location) && (
                      <p className="tpl-job-org">
                        {j.company && <span className="tpl-job-company">{j.company}</span>}
                        {j.company && j.location && (
                          <span className="tpl-sep" aria-hidden="true">
                            ·
                          </span>
                        )}
                        {j.location && <span className="tpl-job-loc">{j.location}</span>}
                      </p>
                    )}
                    <Bullets items={j.bullets} />
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {v.education.length > 0 && (
          <Section title={L.education} className="tpl-t-sec">
            <ol className="tpl-tl tpl-tl-edu">
              {v.education.map((e, i) => (
                <li className="tpl-tl-item" key={i}>
                  <div className="tpl-tl-when">{e.dates && <span className="tpl-tl-date">{e.dates}</span>}</div>
                  <div className="tpl-tl-card">
                    {e.degree && <h3 className="tpl-job-role">{e.degree}</h3>}
                    {e.school && (
                      <p className="tpl-job-org">
                        <span className="tpl-job-company">{e.school}</span>
                      </p>
                    )}
                    {e.details && <p className="tpl-edu-details">{e.details}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {v.projects.length > 0 && (
          <Section title={L.projects} className="tpl-t-sec">
            <ProjectGrid items={v.projects} numbered />
          </Section>
        )}

        {v.skills.length > 0 && (
          <Section title={L.skills} className="tpl-t-sec">
            <Chips items={v.skills} />
          </Section>
        )}

        {v.certifications.length > 0 && (
          <Section title={L.certifications} className="tpl-t-sec">
            <CertGrid items={v.certifications} />
          </Section>
        )}

        {v.album.length > 0 && (
          <Section title={L.gallery} className="tpl-t-sec">
            <Gallery items={v.album} look={premium ? "film" : "grid"} captions={premium ? "overlay" : "below"} />
          </Section>
        )}

        {v.testimonials.length > 0 && (
          <Section title={L.testimonials} className="tpl-t-sec">
            <Testimonials items={v.testimonials} />
          </Section>
        )}

        {hasTrio && (
          <div className="tpl-t-trio">
            {v.achievements.length > 0 && (
              <Section title={L.achievements} icon="star" className="tpl-t-mini">
                <TextList items={v.achievements} icon="check" />
              </Section>
            )}
            {v.languages.length > 0 && (
              <Section title={L.languages} icon="chat" className="tpl-t-mini">
                <TextList items={v.languages} icon="check" />
              </Section>
            )}
          </div>
        )}
      </main>
      <Footer view={v} />
    </Root>
  );
}

import type { LayoutProps } from "../types";
import {
  ActionButtons,
  Avatar,
  CertGrid,
  Chips,
  ContactList,
  Cover,
  EduList,
  Footer,
  Gallery,
  HoursBadge,
  Icon,
  JobList,
  ProjectGrid,
  Root,
  Section,
  ServiceGrid,
  Testimonials,
  TextList,
} from "./shared";
import { buildView, infoContacts } from "./view";

export function ExecutiveLayout({ content, theme, tier, lang }: LayoutProps) {
  const v = buildView(content, lang);
  const L = v.labels;
  const premium = tier === "premium";
  const hasMain =
    Boolean(v.summary) || v.services.length > 0 || v.experience.length > 0 || v.projects.length > 0 || v.album.length > 0 || v.testimonials.length > 0;
  const hasAside =
    v.skills.length > 0 || v.education.length > 0 || v.certifications.length > 0 || v.achievements.length > 0 || v.languages.length > 0;

  return (
    <Root layout="executive" theme={theme} tier={tier} lang={lang}>
      <header className="tpl-e-band">
        {premium && <Cover url={v.coverUrl} className="tpl-e-cover" />}
        <div className={`tpl-e-band-inner${v.stats.length > 0 ? "" : " is-nostats"}`}>
          <div className="tpl-e-id">
            <div className="tpl-e-avatar-wrap">
              <Avatar view={v} className="tpl-e-avatar" />
            </div>
            <div className="tpl-e-idtext">
              {v.headline && <p className="tpl-e-headline">{v.headline}</p>}
              <h1 className={`tpl-e-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
              <ContactList entries={infoContacts(v)} className="tpl-e-contact" />
              <HoursBadge view={v} className="tpl-e-hours" />
              <ActionButtons view={v} className="tpl-e-actions" />
            </div>
          </div>
          {v.stats.length > 0 && (
            <dl className="tpl-e-stats">
              {v.stats.map((s) => (
                <div className="tpl-e-stat" key={s.label}>
                  <dt className="tpl-e-stat-label">
                    {premium && <Icon name={s.icon} className="tpl-e-stat-ico" />}
                    {s.label}
                  </dt>
                  <dd className="tpl-e-stat-value">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </header>

      {(hasMain || hasAside) && (
        <div className={`tpl-e-body${hasMain && hasAside ? "" : " is-single"}`}>
          {hasMain && (
            <main className="tpl-e-main">
              {v.summary && (
                <Section title={L.about}>
                  <p className="tpl-e-lead">{v.summary}</p>
                </Section>
              )}
              {v.services.length > 0 && (
                <Section title={L.services}>
                  <ServiceGrid items={v.services} />
                </Section>
              )}
              {v.experience.length > 0 && (
                <Section title={L.experience}>
                  <JobList items={v.experience} />
                </Section>
              )}
              {v.projects.length > 0 && (
                <Section title={L.projects}>
                  <ProjectGrid items={v.projects} overlay={premium} />
                </Section>
              )}
              {v.album.length > 0 && (
                <Section title={L.gallery}>
                  <Gallery items={v.album} look={premium ? "bento" : "grid"} captions={premium ? "overlay" : "below"} />
                </Section>
              )}
              {v.testimonials.length > 0 && (
                <Section title={L.testimonials}>
                  <Testimonials items={v.testimonials} />
                </Section>
              )}
            </main>
          )}
          {hasAside && (
            <aside className="tpl-e-aside">
              {v.skills.length > 0 && (
                <Section title={L.skills} className="tpl-e-box">
                  <Chips items={v.skills} />
                </Section>
              )}
              {v.education.length > 0 && (
                <Section title={L.education} className="tpl-e-box">
                  <EduList items={v.education} />
                </Section>
              )}
              {v.certifications.length > 0 && (
                <Section title={L.certifications} className="tpl-e-box">
                  <CertGrid items={v.certifications} className="tpl-certs-compact" />
                </Section>
              )}
              {v.achievements.length > 0 && (
                <Section title={L.achievements} className="tpl-e-box">
                  <TextList items={v.achievements} icon="star" className={premium ? "tpl-quotes" : undefined} />
                </Section>
              )}
              {v.languages.length > 0 && (
                <Section title={L.languages} className="tpl-e-box">
                  <TextList items={v.languages} icon="chat" />
                </Section>
              )}
            </aside>
          )}
        </div>
      )}
      <Footer view={v} />
    </Root>
  );
}

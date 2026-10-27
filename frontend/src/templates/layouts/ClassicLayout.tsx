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
  JobList,
  ProjectGrid,
  Root,
  Section,
  ServiceGrid,
  StatStrip,
  Testimonials,
  TextList,
} from "./shared";
import { buildView, infoContacts } from "./view";

export function ClassicLayout({ content, theme, tier, lang }: LayoutProps) {
  const v = buildView(content, lang);
  const L = v.labels;
  const premium = tier === "premium";
  const hasDuo = v.achievements.length > 0 || v.languages.length > 0;

  return (
    <Root layout="classic" theme={theme} tier={tier} lang={lang}>
      <header className="tpl-c-header">
        {premium && (
          <div className="tpl-c-banner">
            <Cover url={v.coverUrl} className="tpl-c-cover" />
          </div>
        )}
        <div className="tpl-c-header-inner">
          <div className="tpl-c-avatar-wrap">
            <Avatar view={v} className="tpl-c-avatar" />
          </div>
          <h1 className={`tpl-c-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
          {v.headline && <p className="tpl-c-headline">{v.headline}</p>}
          <ActionButtons view={v} className="tpl-c-actions" />
          <HoursBadge view={v} className="tpl-c-hours" />
          <ContactList entries={infoContacts(v)} className="tpl-c-contact" />
        </div>
      </header>

      {premium && v.stats.length > 0 && (
        <div className="tpl-c-statwrap">
          <StatStrip stats={v.stats} className="tpl-c-stats" />
        </div>
      )}

      <main className="tpl-c-main">
        {v.summary && (
          <Section title={L.about}>
            <p className="tpl-c-lead">{v.summary}</p>
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
            <ProjectGrid items={v.projects} />
          </Section>
        )}
        {v.education.length > 0 && (
          <Section title={L.education}>
            <EduList items={v.education} />
          </Section>
        )}
        {v.skills.length > 0 && (
          <Section title={L.skills}>
            <Chips items={v.skills} />
          </Section>
        )}
        {v.certifications.length > 0 && (
          <Section title={L.certifications}>
            <CertGrid items={v.certifications} />
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
        {hasDuo && (
          <div className="tpl-c-trio">
            {v.achievements.length > 0 && (
              <Section title={L.achievements}>
                <TextList items={v.achievements} icon="star" />
              </Section>
            )}
            {v.languages.length > 0 && (
              <Section title={L.languages}>
                <TextList items={v.languages} icon="chat" />
              </Section>
            )}
          </div>
        )}
      </main>
      <Footer view={v} />
    </Root>
  );
}

import { useEffect, useRef } from "react";
import type { LayoutProps } from "../types";
import {
  ActionButtons,
  Avatar,
  CertGrid,
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

// Nearest ancestor that scrolls vertically (the builder preview pane), else the window
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

// Keeps the sidebar content on screen: it scrolls with the page until its end is visible, then stays pinned
// (sticky with a negative top when the content is taller than the viewport), so the side panel never shows empty.
function useStickySide() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const viewport = scrollParent(el)?.clientHeight ?? window.innerHeight;
      el.style.setProperty("--tpl-side-top", `${Math.min(0, viewport - el.offsetHeight)}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return ref;
}

export function SidebarLayout({ content, theme, tier, lang }: LayoutProps) {
  const sideRef = useStickySide();
  const v = buildView(content, lang);
  const L = v.labels;
  const premium = tier === "premium";
  const contacts = infoContacts(v);

  return (
    <Root layout="sidebar" theme={theme} tier={tier} lang={lang}>
      <div className="tpl-s-shell">
        <aside className="tpl-s-side">
          {premium && (
            <div className="tpl-s-banner">
              <Cover url={v.coverUrl} className="tpl-s-cover" />
            </div>
          )}
          <div className="tpl-s-side-inner" ref={sideRef}>
            <div className="tpl-s-id">
              <Avatar view={v} className="tpl-s-avatar" />
              <h1 className={`tpl-s-name${v.hasName ? "" : " is-placeholder"}`}>{v.name}</h1>
              {v.headline && <p className="tpl-s-headline">{v.headline}</p>}
              <ActionButtons view={v} className="tpl-s-actions" />
            </div>

            {(contacts.length > 0 || v.hours) && (
              <div className="tpl-s-block">
                <h2 className="tpl-s-label">{L.contact}</h2>
                <ContactList entries={contacts} className="tpl-s-contact" />
                <HoursBadge view={v} className="tpl-s-hours" />
              </div>
            )}
            {v.skills.length > 0 && (
              <div className="tpl-s-block">
                <h2 className="tpl-s-label">{L.skills}</h2>
                <ul className="tpl-s-skills">
                  {v.skills.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {v.languages.length > 0 && (
              <div className="tpl-s-block">
                <h2 className="tpl-s-label">{L.languages}</h2>
                <ul className="tpl-s-langs">
                  {v.languages.map((s, i) => (
                    <li key={`${s}-${i}`}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <main className="tpl-s-main">
          {premium && <StatStrip stats={v.stats} className="tpl-s-stats" />}
          {v.summary && (
            <Section title={L.about} icon="user">
              <p className="tpl-s-lead">{v.summary}</p>
            </Section>
          )}
          {v.services.length > 0 && (
            <Section title={L.services} icon="wrench">
              <ServiceGrid items={v.services} />
            </Section>
          )}
          {v.experience.length > 0 && (
            <Section title={L.experience} icon="briefcase">
              <JobList items={v.experience} />
            </Section>
          )}
          {v.projects.length > 0 && (
            <Section title={L.projects} icon="layers">
              <ProjectGrid items={v.projects} overlay={premium} />
            </Section>
          )}
          {v.education.length > 0 && (
            <Section title={L.education} icon="cap">
              <EduList items={v.education} />
            </Section>
          )}
          {v.certifications.length > 0 && (
            <Section title={L.certifications} icon="award">
              <CertGrid items={v.certifications} />
            </Section>
          )}
          {v.album.length > 0 && (
            <Section title={L.gallery} icon="image">
              <Gallery items={v.album} look={premium ? "bento" : "grid"} captions={premium ? "overlay" : "below"} />
            </Section>
          )}
          {v.testimonials.length > 0 && (
            <Section title={L.testimonials} icon="quote">
              <Testimonials items={v.testimonials} />
            </Section>
          )}
          {v.achievements.length > 0 && (
            <Section title={L.achievements} icon="star">
              <TextList items={v.achievements} icon="check" className={premium ? "tpl-quotes" : undefined} />
            </Section>
          )}
          <Footer view={v} />
        </main>
      </div>
    </Root>
  );
}

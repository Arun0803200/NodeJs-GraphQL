import { useMemo, type ReactNode } from "react";
import type { LayoutProps, PortfolioContent } from "../types";
import { Avatar, ContactList, Cover, Footer, Gallery, Icon, Root, Section, ServiceGrid, Testimonials, type IconName } from "./shared";
import { ReviewsProvider, ReviewsSection } from "../travel/Reviews";
import { DynamicForm } from "../travel/SiteForms";
import { isHidden, orderedSections } from "../travel/pageSections";
import { pick } from "../../lib/siteConfig";
import { buildView, type PortfolioView } from "./view";
import { travelText, type TravelT } from "../travel/labels";
import { BookingWidget } from "../travel/BookingWidget";
import { DriverGrid, FleetGrid, RateCards, WhyUs } from "../travel/Sections";
import { DriverCareers } from "../travel/DriverCareers";
import type { Lang } from "../types";
import "../travel/travel.css";


// Sticky call / WhatsApp / book bar for phones
function MobileBar({ v, t }: { v: PortfolioView; t: TravelT }) {
  return (
    <nav className="trv-mobilebar" aria-label={t("bookNow")}>
      {v.callHref && <a href={v.callHref}><Icon name="phone" />{v.labels.call}</a>}
      {v.whatsappHref && <a href={v.whatsappHref} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />{v.labels.whatsapp}</a>}
      <a href="#book" className="trv-mobilebar-primary">{t("bookNow")}</a>
    </nav>
  );
}

function Body({ content, v, t, sections, lang, owner }: { content: PortfolioContent; v: PortfolioView; t: TravelT; sections: "full" | "split"; lang: Lang; owner?: string }) {
  const preview = !owner;
  const contacts = v.contacts.filter((c) => c.kind !== "linkedin" && c.kind !== "github");
  const hasFleet = content.travel.vehicles.some((x) => x.name);
  const hasDrivers = content.travel.drivers.some((x) => x.name);
  const terms = content.travelTerms.split("\n").map((x) => x.trim()).filter(Boolean);
  const placeholder = (text: string) => <div className="trv-placeholder">{text}</div>;

  // Each section: whether its feature is switched on, whether it has content, and how to render it.
  // Empty sections show a placeholder in the builder preview and are left out of the live site.
  const render = (id: string): { title: string; icon: IconName; on: boolean; filled: boolean; body: ReactNode; empty?: string } | null => {
    switch (id) {
      case "rates": return { title: t("rates"), icon: "zap", on: content.travel.enabled, filled: true, body: <><p className="trv-sec-sub">{t("ratesSub")}</p><RateCards content={content} t={t} /></> };
      case "fleet": return { title: t("fleet"), icon: "layers", on: true, filled: hasFleet, empty: t("phFleet"), body: <><p className="trv-sec-sub">{t("fleetSub")}</p><FleetGrid content={content} t={t} /></> };
      case "drivers": return { title: t("drivers"), icon: "user", on: content.travel.showDrivers, filled: hasDrivers, empty: t("phDrivers"), body: <><p className="trv-sec-sub">{t("driversSub")}</p><DriverGrid content={content} t={t} /></> };
      case "reviews": return { title: t("reviews"), icon: "star", on: content.reviews.enabled && content.reviews.types.some((x) => x.enabled), filled: true, body: <><p className="trv-sec-sub">{t("reviewsSub")}</p><ReviewsSection /></> };
      case "careers": return { title: t("careers"), icon: "briefcase", on: content.travel.enabled && content.travel.driverHiring, filled: true, body: <DriverCareers content={content} lang={lang} owner={owner} /> };
      case "services": return { title: v.labels.services, icon: "check", on: true, filled: v.services.length > 0, empty: t("phServices"), body: <ServiceGrid items={v.services} /> };
      // The split layout already shows the story in its hero
      case "about": return { title: v.labels.about, icon: "building", on: sections === "full", filled: !!v.summary, empty: t("phAbout"), body: <p className="trv-about">{v.summary}</p> };
      case "testimonials": return { title: v.labels.testimonials, icon: "quote", on: true, filled: v.testimonials.length > 0, empty: t("phTestimonials"), body: <Testimonials items={v.testimonials} /> };
      case "gallery": return { title: v.labels.gallery, icon: "image", on: true, filled: v.album.length > 0, empty: t("phGallery"), body: <Gallery items={v.album} look="grid" /> };
      case "terms": return { title: t("terms"), icon: "shield", on: true, filled: terms.length > 0, empty: t("phTerms"), body: <ul className="trv-terms">{terms.map((x) => <li key={x}>{x}</li>)}</ul> };
      case "contact": return { title: v.labels.contact, icon: "phone", on: true, filled: contacts.length > 0, body: <ContactList entries={contacts} className="trv-contact-list" /> };
      default: {
        const form = id.startsWith("form:") ? content.forms.find((f) => `form:${f.id}` === id) : undefined;
        if (!form) return null;
        return { title: pick(form.title, lang) || "Form", icon: "send", on: form.enabled, filled: form.fields.length > 0 || preview,
          body: <DynamicForm form={form} lang={lang} owner={owner} ownerName={content.fullName || "us"} /> };
      }
    }
  };

  return (
    <>
      {orderedSections(content).filter((id) => !isHidden(content, id)).map((id) => {
        const sec = render(id);
        if (!sec || !sec.on || (!sec.filled && !preview)) return null;
        return (
          <div key={id} id={id.replace(":", "-")} className="trv-anchor">
            <Section title={sec.title} icon={sec.icon} className="trv-sec">
              {sec.filled ? sec.body : placeholder(sec.empty ?? "")}
            </Section>
          </div>
        );
      })}
    </>
  );
}

// Classic travels site: full-width cover hero with the booking card beside the headline
export function TravelLayout({ content, theme, tier, lang, owner }: LayoutProps) {
  const v = buildView(content, lang);
  const t = useMemo(() => travelText(lang), [lang]);
  const booking = content.travel.enabled;

  return (
    <Root layout="travel" theme={theme} tier={tier} lang={lang}>
      <ReviewsProvider content={content} lang={lang} owner={owner}>
      <header className="trv-topbar">
        <a className="trv-brand" href="#top">
          <Avatar view={v} className="trv-brand-logo" />
          <span>{v.name}</span>
        </a>
        <nav className="trv-nav">
          {/* Menu links follow the page layout: no link to a hidden section */}
          {content.travel.vehicles.some((x) => x.name) && !isHidden(content, "fleet") && <a href="#fleet">{t("fleet")}</a>}
          {booking && !isHidden(content, "rates") && <a href="#rates">{t("rates")}</a>}
          {booking && content.travel.driverHiring && !isHidden(content, "careers") && <a href="#careers">{t("careers")}</a>}
          {content.reviews.enabled && !isHidden(content, "reviews") && <a href="#reviews">{t("reviews")}</a>}
          {v.callHref && <a className="trv-nav-call" href={v.callHref}><Icon name="phone" />{v.phone}</a>}
        </nav>
      </header>

      <section className="trv-hero" id="top">
        <Cover url={v.coverUrl} className="trv-hero-cover" />
        <div className="trv-hero-inner">
          <div className="trv-hero-text">
            {(v.location || v.hours) && (
              <p className="trv-eyebrow">
                {v.location && <span><Icon name="location" />{v.location}</span>}
                {v.hours && <span><Icon name="clock" />{v.hours}</span>}
              </p>
            )}
            <h1 className={v.hasName ? "" : "is-placeholder"}>{v.name}</h1>
            {v.headline && <p className="trv-headline">{v.headline}</p>}
            <div className="trv-hero-ctas">
              {booking && <a className="trv-btn trv-btn-primary" href="#book">{t("bookNow")}</a>}
              {v.callHref && <a className="trv-btn trv-btn-light" href={v.callHref}><Icon name="phone" />{v.labels.call}</a>}
              {v.whatsappHref && <a className="trv-btn trv-btn-wa" href={v.whatsappHref} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />{v.labels.whatsapp}</a>}
            </div>
            <WhyUs t={t} />
          </div>
          {booking && <BookingWidget content={content} lang={lang} owner={owner} />}
        </div>
      </section>

      <main className="trv-main">
        <Body content={content} v={v} t={t} sections="full" lang={lang} owner={owner} />
      </main>

      <Footer view={v} className="trv-footer" />
      {booking && <MobileBar v={v} t={t} />}
      </ReviewsProvider>
    </Root>
  );
}

// Split layout: booking panel pinned on the left, the business story scrolling on the right
export function TravelSplitLayout({ content, theme, tier, lang, owner }: LayoutProps) {
  const v = buildView(content, lang);
  const t = useMemo(() => travelText(lang), [lang]);
  const booking = content.travel.enabled;
  const vehicles = content.travel.vehicles.filter((x) => x.name).length;
  const drivers = content.travel.drivers.filter((x) => x.name).length;

  return (
    <Root layout="travelsplit" theme={theme} tier={tier} lang={lang}>
      <ReviewsProvider content={content} lang={lang} owner={owner}>
      <div className="trs-shell">
        <aside className="trs-panel">
          <div className="trs-id">
            <Avatar view={v} className="trs-logo" />
            <div>
              <h1 className={v.hasName ? "" : "is-placeholder"}>{v.name}</h1>
              {v.headline && <p>{v.headline}</p>}
            </div>
          </div>
          {booking ? <BookingWidget content={content} lang={lang} owner={owner} compact /> : (
            <div className="trs-contact-card">
              {v.callHref && <a className="trv-btn trv-btn-primary trv-btn-full" href={v.callHref}><Icon name="phone" />{v.labels.call}</a>}
              {v.whatsappHref && <a className="trv-btn trv-btn-wa trv-btn-full" href={v.whatsappHref} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />{v.labels.whatsapp}</a>}
            </div>
          )}
        </aside>

        <div className="trs-content">
          <section className="trs-hero">
            <Cover url={v.coverUrl} className="trs-cover" />
            <div className="trs-hero-overlay">
              {(v.location || v.hours) && (
                <p className="trv-eyebrow">
                  {v.location && <span><Icon name="location" />{v.location}</span>}
                  {v.hours && <span><Icon name="clock" />{v.hours}</span>}
                </p>
              )}
              {v.summary && <p className="trs-summary">{v.summary}</p>}
              <div className="trv-hero-ctas">
                {v.callHref && <a className="trv-btn trv-btn-light" href={v.callHref}><Icon name="phone" />{v.phone}</a>}
                {v.whatsappHref && <a className="trv-btn trv-btn-wa" href={v.whatsappHref} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" />{v.labels.whatsapp}</a>}
              </div>
            </div>
          </section>

          {(vehicles > 0 || drivers > 0 || v.testimonials.length > 0) && (
            <ul className="trs-stats">
              {vehicles > 0 && <li><strong>{vehicles}</strong><span>{t("fleet")}</span></li>}
              {drivers > 0 && <li><strong>{drivers}</strong><span>{t("drivers")}</span></li>}
              {v.testimonials.length > 0 && <li><strong>{v.testimonials.length}+</strong><span>{v.labels.happyCustomers}</span></li>}
            </ul>
          )}
          <WhyUs t={t} />
          <Body content={content} v={v} t={t} sections="split" lang={lang} owner={owner} />
          <Footer view={v} className="trv-footer" />
        </div>
      </div>
      {booking && <MobileBar v={v} t={t} />}
      </ReviewsProvider>
    </Root>
  );
}

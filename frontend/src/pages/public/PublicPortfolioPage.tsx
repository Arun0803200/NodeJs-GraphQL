import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { PUBLIC_PORTFOLIO_BY_USER_NAME, PUBLIC_PORTFOLIO_SECTIONS, SEND_CONTACT_MESSAGE, PUBLISHED_SITE } from "../../api/queries";
import { TemplateRenderer } from "../../templates/TemplateRenderer";
import { ContactWidget } from "../../components/messages/ContactWidget";
import { PlatformContact } from "../../components/platform/PlatformContact";
import { parseSite, siteContentFor, LANGS } from "../../lib/templates";
import { LangSwitch, useUiLang } from "../../i18n/UiLang";
import type { Lang } from "../../templates/types";
import { Alert } from "../../components/ui/Alert";

const formatMonth = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";

// A published template website takes priority; otherwise fall back to the section-based portfolio
export function PublicPortfolioPage() {
  const { userName = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { lang: uiLang } = useUiLang();
  const { data: siteData, loading: siteLoading } = useQuery<any>(PUBLISHED_SITE, { variables: { userName } });
  const site = siteData?.publishedSite?.data;
  const state = siteData?.publishedSite?.message;

  if (siteLoading) return <div className="portfolio-page"><p className="text-muted">Loading...</p></div>;
  // Started a website that an admin hasn't approved yet: nothing of it is shown until it goes live
  if (state === "under_review") return <ComingSoon userName={userName} />;
  if (state === "unavailable") return <NotAvailable userName={userName} />;
  if (site) {
    const parsed = parseSite(site.contentJson);
    const available = LANGS.filter((l) => parsed.languages[l]);
    // ?lang= wins, then the visitor's chosen app language, then the owner's default
    const requested = (params.get("lang") as Lang | null) ?? (parsed.languages[uiLang] ? uiLang : null);
    const { lang, content } = siteContentFor(parsed, requested);
    return (
      <div className="published-site" lang={lang}>
        <TemplateRenderer designKey={site.designKey} content={content} lang={lang} owner={userName} />
        {/* Every website ends with a way to contact the platform (enquiries go to the admins, ADMIN_WHATSAPP) */}
        <PlatformContact source={userName} lang={lang} />
        <div className={`site-floats${content.travel?.enabled ? " site-floats-raised" : ""}`}>
          {/* Travel sites already have booking + WhatsApp; a second contact button would crowd the phone bar */}
          {!content.travel?.enabled && <ContactWidget userName={userName} ownerName={content.fullName || userName} lang={lang} />}
          {available.length > 1 && (
            <div className="site-lang-float">
              <LangSwitch value={lang} onChange={(l) => { const next = new URLSearchParams(params); next.set("lang", l); setParams(next, { replace: true }); }} />
            </div>
          )}
        </div>
      </div>
    );
  }
  return <SectionPortfolio userName={userName} />;
}

function ComingSoon({ userName }: { userName: string }) {
  const { t } = useUiLang();
  return (
    <div className="auth-page">
      <div className="auth-card soon-card">
        <div className="soon-icon" aria-hidden="true">⏳</div>
        <h1>{t("pub.soonTitle")}</h1>
        <p className="auth-subtitle">{t("pub.soonText", { name: userName })}</p>
        <Link to="/" className="btn btn-primary btn-full">{t("pub.browse")}</Link>
        <PlatformContact source={userName} variant="button" className="btn-full soon-contact" />
      </div>
    </div>
  );
}

function NotAvailable({ userName }: { userName: string }) {
  const { t } = useUiLang();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{t("pub.notFoundTitle")}</h1>
        <p className="auth-subtitle">{t("pub.notFoundText", { name: userName })}</p>
        <Link to="/" className="btn btn-primary btn-full">{t("pub.browse")}</Link>
        <PlatformContact source={userName} variant="button" className="btn-full soon-contact" />
      </div>
    </div>
  );
}

function SectionPortfolio({ userName }: { userName: string }) {
  const { data: profileData, loading: profileLoading } = useQuery<any>(PUBLIC_PORTFOLIO_BY_USER_NAME, {
    variables: { userName },
  });
  const profile = profileData?.getPublicProfileByUserName?.data;

  const { data: sections } = useQuery<any>(PUBLIC_PORTFOLIO_SECTIONS, {
    variables: { userUuid: profile?.userUuid },
    skip: !profile?.userUuid,
  });

  const [contact, setContact] = useState({ senderName: "", senderEmail: "", message: "" });
  const [alert, setAlert] = useState({ type: "success" as "success" | "error", message: "" });
  const [sendMessage, { loading: sending }] = useMutation<any>(SEND_CONTACT_MESSAGE);

  if (profileLoading) return <div className="portfolio-page"><p className="text-muted">Loading...</p></div>;

  if (!profile) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Portfolio not found</h1>
          <p className="auth-subtitle">No portfolio exists for "{userName}".</p>
          <Link to="/" className="btn btn-primary btn-full">Go to Home</Link>
        </div>
      </div>
    );
  }

  const about = sections?.getPublicAbout?.data;
  const experiences = sections?.getPublicExperiences?.data ?? [];
  const projects = sections?.getPublicProjects?.data ?? [];
  const skills = sections?.getPublicSkills?.data ?? [];
  const awards = sections?.getPublicAwards?.data ?? [];
  const education = sections?.getPublicEducation?.data ?? [];
  const images = sections?.getPublicImages?.data ?? [];

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await sendMessage({ variables: { input: { userName: profile.userName, ...contact, source: "portfolio" } } });
      const res = data?.sendContactMessage;
      if (res?.status === 1) {
        setAlert({ type: "success", message: "Message sent. Thank you!" });
        setContact({ senderName: "", senderEmail: "", message: "" });
      } else {
        setAlert({ type: "error", message: res?.message || "Failed to send message" });
      }
    } catch (err: any) {
      setAlert({ type: "error", message: err.message });
    }
  };

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setContact((c) => ({ ...c, [key]: e.target.value }));

  return (
    <div className="portfolio-page">
      <header className="portfolio-hero">
        <h1>{profile.fullName}</h1>
        <p className="portfolio-designation">{profile.designation}</p>
        {about?.description && <p className="portfolio-lead">{about.description}</p>}
        {profile.socialMedia?.length > 0 && (
          <div className="portfolio-links">
            {profile.socialMedia.map((s: any) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.name}</a>
            ))}
          </div>
        )}
      </header>

      {about && (
        <section className="portfolio-section">
          <h2>{about.title || "About"}</h2>
          {about.longDescription && <p>{about.longDescription}</p>}
          <div className="stats-grid" style={{ marginTop: 16 }}>
            <div className="stat-card"><h3>{about.totalExperience}</h3><p>Years Experience</p></div>
            <div className="stat-card"><h3>{about.totalProjects}</h3><p>Projects</p></div>
            <div className="stat-card"><h3>{about.totalAwards}</h3><p>Awards</p></div>
          </div>
        </section>
      )}

      {experiences.length > 0 && (
        <section className="portfolio-section">
          <h2>Experience</h2>
          {experiences.map((x: any) => (
            <article key={x.id} className="portfolio-item">
              <h3>{x.designation} · {x.companyUrl ? <a href={x.companyUrl} target="_blank" rel="noreferrer">{x.companyName}</a> : x.companyName}</h3>
              <p className="text-muted">
                {formatMonth(x.startDate)} – {x.isCurrentlyWorking ? "Present" : formatMonth(x.endDate)}
                {x.companyLocation && ` · ${x.companyLocation}`}
              </p>
              {x.jobDescription && <p>{x.jobDescription}</p>}
              {x.skills?.length > 0 && <div className="chips">{x.skills.map((s: string) => <span key={s} className="chip">{s}</span>)}</div>}
            </article>
          ))}
        </section>
      )}

      {projects.length > 0 && (
        <section className="portfolio-section">
          <h2>Projects</h2>
          <div className="portfolio-grid">
            {projects.map((p: any) => (
              <article key={p.id} className="portfolio-item">
                <h3>{p.projectUrl ? <a href={p.projectUrl} target="_blank" rel="noreferrer">{p.projectName}</a> : p.projectName}</h3>
                <p className="text-muted">{formatMonth(p.projectStartDate)} – {p.isCurrentProject ? "Present" : formatMonth(p.projectEndDate)}</p>
                {p.projectDescription && <p>{p.projectDescription}</p>}
                {p.technologiesSkills?.length > 0 && <div className="chips">{p.technologiesSkills.map((s: string) => <span key={s} className="chip">{s}</span>)}</div>}
              </article>
            ))}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section className="portfolio-section">
          <h2>Skills</h2>
          {skills.map((g: any) => (
            <div key={g.id} className="portfolio-item">
              <h3>{g.tittle}</h3>
              <div className="chips">{g.skills?.map((s: string) => <span key={s} className="chip">{s}</span>)}</div>
            </div>
          ))}
        </section>
      )}

      {education.length > 0 && (
        <section className="portfolio-section">
          <h2>Education</h2>
          {education.map((ed: any) => (
            <article key={ed.id} className="portfolio-item">
              <h3>{ed.degree}{ed.fieldOfStudy && `, ${ed.fieldOfStudy}`}</h3>
              <p className="text-muted">{ed.institution}{ed.institutionLocation && ` · ${ed.institutionLocation}`} · {ed.startYear} – {ed.endYear || "Present"}</p>
            </article>
          ))}
        </section>
      )}

      {awards.length > 0 && (
        <section className="portfolio-section">
          <h2>Awards</h2>
          {awards.map((a: any) => (
            <article key={a.id} className="portfolio-item">
              <h3>{a.title}</h3>
              {a.eventDate && <p className="text-muted">{a.eventDate}</p>}
              {a.description && <p>{a.description}</p>}
            </article>
          ))}
        </section>
      )}

      {images.length > 0 && (
        <section className="portfolio-section">
          <h2>Gallery</h2>
          <div className="image-grid">
            {images.map((img: any) => (
              <div key={img.id} className="image-card"><img src={img.imageUrl} alt={img.imageOriginalName || ""} loading="lazy" /></div>
            ))}
          </div>
        </section>
      )}

      <section className="portfolio-section">
        <h2>Contact</h2>
        {profile.contactUsDescription && <p style={{ marginBottom: 16 }}>{profile.contactUsDescription}</p>}
        <Alert type={alert.type} message={alert.message} onDismiss={() => setAlert({ ...alert, message: "" })} />
        <form onSubmit={handleContact} className="form-card">
          <div className="form-row">
            <div className="form-group"><label>Your Name</label><input value={contact.senderName} onChange={setField("senderName")} required /></div>
            <div className="form-group"><label>Your Email</label><input type="email" value={contact.senderEmail} onChange={setField("senderEmail")} required /></div>
          </div>
          <div className="form-group"><label>Message</label><textarea value={contact.message} onChange={setField("message")} rows={4} required /></div>
          <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? "Sending..." : "Send Message"}</button>
        </form>
      </section>
      <PlatformContact source={userName} />
    </div>
  );
}

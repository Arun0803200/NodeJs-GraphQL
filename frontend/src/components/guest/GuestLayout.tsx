import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PlatformContact } from "../platform/PlatformContact";
import { BRAND_NAME } from "../../lib/brand";
import { LangSwitch, useUiLang } from "../../i18n/UiLang";

export function GuestHeader() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { lang, setLang, t } = useUiLang();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const redirect = encodeURIComponent(location.pathname + location.search);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const initials = (user?.fullName || user?.userName || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="guest-header">
      <div className="guest-container guest-header-inner">
        <Link to="/" className="brand" aria-label={BRAND_NAME}><span className="brand-mark">{BRAND_NAME[0]}</span> <span className="brand-name">{BRAND_NAME}</span></Link>
        <nav className="guest-nav">
          <NavLink to="/" end>{t("nav.templates")}</NavLink>
          <NavLink to="/?category=free">{t("nav.free")}</NavLink>
          <NavLink to="/?category=premium">{t("nav.premium")}</NavLink>
          <PlatformContact source="storefront" lang={lang} variant="link" className="guest-nav-contact" />
        </nav>
        <div className="guest-actions">
          <LangSwitch value={lang} onChange={setLang} />
          {isAuthenticated ? (
            <div className="account-menu" ref={menuRef}>
              <button className="avatar-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Account menu">
                <span className="avatar">{initials}</span>
                <span className="avatar-name">{user?.userName || user?.fullName}</span>
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <div className="dropdown-head">
                    <strong>{user?.fullName}</strong>
                    <small>{user?.email}</small>
                  </div>
                  <Link to="/user/website">{t("nav.myWebsite")}</Link>
                  <Link to="/user">{t("nav.dashboard")}</Link>
                  {isAdmin && <Link to="/admin/templates">{t("nav.manageTemplates")}</Link>}
                  <button onClick={() => { logout(); navigate("/"); }}>{t("nav.signOut")}</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to={`/auth/login?redirect=${redirect}`} className="btn btn-ghost">{t("nav.signIn")}</Link>
              <Link to={`/auth/register?redirect=${redirect}`} className="btn btn-primary guest-cta">{t("nav.getStarted")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function GuestFooter() {
  const { t, lang } = useUiLang();
  return (
    <footer className="guest-footer">
      <div className="guest-container guest-footer-inner">
        <div>
          <Link to="/" className="brand brand-light"><span className="brand-mark">{BRAND_NAME[0]}</span> {BRAND_NAME}</Link>
          <p>{t("footer.tagline")}</p>
        </div>
        <div className="footer-links">
          <Link to="/?category=free">{t("footer.freeTemplates")}</Link>
          <Link to="/?category=premium">{t("footer.premiumTemplates")}</Link>
          <Link to="/auth/login">{t("nav.signIn")}</Link>
          <Link to="/auth/register">{t("footer.createAccount")}</Link>
          <PlatformContact source="storefront" lang={lang} variant="link" className="footer-contact" />
        </div>
      </div>
      <div className="guest-container footer-copy">© {new Date().getFullYear()} {BRAND_NAME}. {t("footer.rights")}</div>
    </footer>
  );
}

export function GuestLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="guest-app">
      <GuestHeader />
      <main><Outlet /></main>
      <GuestFooter />
    </div>
  );
}

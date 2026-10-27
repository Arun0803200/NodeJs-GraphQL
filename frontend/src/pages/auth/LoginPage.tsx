import { BRAND_NAME } from "../../lib/brand";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LoginForm, RegisterForm, ForgotPasswordForm, AUTH_TITLES, type AuthView } from "../../components/auth/AuthForms";
import { LangSwitch, useUiLang } from "../../i18n/UiLang";

const VIEW_PATHS: Record<AuthView, string> = {
  login: "/auth/login",
  register: "/auth/register",
  forgot: "/auth/forgot-password",
};

// One page for sign in / sign up / forgot password; `?redirect=` returns the visitor where they came from
export function AuthPage({ view }: { view: AuthView }) {
  const navigate = useNavigate();
  const { lang, setLang, t } = useUiLang();
  const [params] = useSearchParams();
  const redirect = params.get("redirect");
  const safeRedirect = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null;

  const onSwitch = (next: AuthView) => navigate(`${VIEW_PATHS[next]}${params.toString() ? `?${params}` : ""}`);
  const onSuccess = (role: string) => navigate(safeRedirect ?? (role === "admin" ? "/admin" : "/user"), { replace: true });

  const title = t(AUTH_TITLES[view].title);
  const subtitle = t(AUTH_TITLES[view].subtitle);

  return (
    <div className="auth-split">
      <aside className="auth-aside">
        <Link to="/" className="brand brand-light"><span className="brand-mark">{BRAND_NAME[0]}</span> {BRAND_NAME}</Link>
        <div className="auth-aside-body">
          <h2>{t("auth.asideTitle")}</h2>
          <p>{t("auth.asideText")}</p>
          <ul className="auth-benefits">
            <li>{t("auth.benefit1")}</li>
            <li>{t("auth.benefit2")}: {window.location.host}/you</li>
            <li>{t("auth.benefit3")}</li>
          </ul>
        </div>
        <p className="auth-aside-foot">© {new Date().getFullYear()} {BRAND_NAME}</p>
      </aside>
      <main className="auth-main">
        <div className="auth-panel">
          <LangSwitch value={lang} onChange={setLang} className="lang-switch-sm auth-lang" />
          <Link to="/" className="brand auth-mobile-brand"><span className="brand-mark">{BRAND_NAME[0]}</span> {BRAND_NAME}</Link>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {view === "login" && <LoginForm onSuccess={onSuccess} onSwitch={onSwitch} />}
          {view === "register" && <RegisterForm onSuccess={onSuccess} onSwitch={onSwitch} />}
          {view === "forgot" && <ForgotPasswordForm onSwitch={onSwitch} />}
        </div>
      </main>
    </div>
  );
}

export function LoginPage() {
  return <AuthPage view="login" />;
}

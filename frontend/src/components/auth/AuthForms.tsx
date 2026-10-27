import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { LOGIN, REGISTER, FORGOT_PASSWORD } from "../../api/queries";
import { useAuth } from "../../context/AuthContext";
import { Alert } from "../ui/Alert";
import { useUiLang, type UiKey } from "../../i18n/UiLang";

export type AuthView = "login" | "register" | "forgot";

interface FormProps {
  onSuccess?: (role: string) => void;
  onSwitch: (view: AuthView) => void;
}

const roleFromToken = (token: string) => {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role as string;
  } catch {
    return "user";
  }
};

function PasswordInput({ value, onChange, placeholder, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const { t } = useUiLang();
  return (
    <div className="password-field">
      <input type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
        required placeholder={placeholder} autoComplete={autoComplete} />
      <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? t("auth.hide") : t("auth.show")}
      </button>
    </div>
  );
}

// Social sign-in is planned; the buttons are shown disabled so the layout is ready for it
function SocialButtons() {
  const { t } = useUiLang();
  return (
    <>
      <div className="auth-divider"><span>{t("auth.orContinue")}</span></div>
      <div className="social-row">
        <button type="button" className="btn-social" disabled title="Coming soon">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Google
        </button>
        <button type="button" className="btn-social" disabled title="Coming soon">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
          Facebook
        </button>
      </div>
    </>
  );
}

export function LoginForm({ onSuccess, onSwitch }: FormProps) {
  const { login } = useAuth();
  const { t } = useUiLang();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginMutation, { loading }] = useMutation<any>(LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await loginMutation({ variables: { email: identifier, password } });
      const res = data.login;
      if (res.status === 1 && res.token) {
        login(res.token, res.data);
        onSuccess?.(roleFromToken(res.token));
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Alert type="error" message={error} onDismiss={() => setError("")} />
      <div className="form-group">
        <label>{t("auth.emailOrUser")}</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} required placeholder="you@company.com" autoComplete="username" autoFocus />
      </div>
      <div className="form-group">
        <div className="label-row">
          <label>{t("auth.password")}</label>
          <button type="button" className="link-button" onClick={() => onSwitch("forgot")}>{t("auth.forgot")}</button>
        </div>
        <PasswordInput value={password} onChange={setPassword} placeholder={t("auth.password")} autoComplete="current-password" />
      </div>
      <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
        {loading ? t("auth.signingIn") : t("auth.signIn")}
      </button>
      <SocialButtons />
      <p className="auth-footer">
        {t("auth.newHere")} <button type="button" className="link-button" onClick={() => onSwitch("register")}>{t("auth.createAccount")}</button>
      </p>
    </form>
  );
}

export function RegisterForm({ onSuccess, onSwitch }: FormProps) {
  const { login } = useAuth();
  const { t } = useUiLang();
  const [form, setForm] = useState({ email: "", userName: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [registerMutation, { loading }] = useMutation<any>(REGISTER);

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const passwordsMismatch = form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError(t("auth.mismatch"));
      return;
    }
    try {
      const { data } = await registerMutation({ variables: form });
      const res = data.register;
      if (res.status === 1 && res.token) {
        login(res.token, res.data);
        onSuccess?.(roleFromToken(res.token));
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Alert type="error" message={error} onDismiss={() => setError("")} />
      <div className="form-group">
        <label>{t("auth.email")} *</label>
        <input type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} required placeholder="you@company.com" autoComplete="email" autoFocus />
      </div>
      <div className="form-group">
        <label>{t("auth.username")} *</label>
        <div className="input-prefix">
          <span>{window.location.host}/</span>
          <input value={form.userName} onChange={(e) => set("userName")(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            required minLength={3} maxLength={50} placeholder="priya-raghavan" autoComplete="username" />
        </div>
        <small className="field-hint">{t("auth.usernameHint")}</small>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t("auth.password")} *</label>
          <PasswordInput value={form.password} onChange={set("password")} placeholder={t("auth.passwordHint")} autoComplete="new-password" />
        </div>
        <div className="form-group">
          <label>{t("auth.confirm")} *</label>
          <PasswordInput value={form.confirmPassword} onChange={set("confirmPassword")} placeholder={t("auth.reenter")} autoComplete="new-password" />
          {passwordsMismatch && <small className="field-error">{t("auth.mismatch")}</small>}
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || passwordsMismatch}>
        {loading ? t("auth.creating") : t("auth.createButton")}
      </button>
      <SocialButtons />
      <p className="auth-footer">
        {t("auth.haveAccount")} <button type="button" className="link-button" onClick={() => onSwitch("login")}>{t("auth.signInLink")}</button>
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ onSwitch }: FormProps) {
  const { t } = useUiLang();
  const [email, setEmail] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [error, setError] = useState("");
  const [forgot, { loading }] = useMutation<any>(FORGOT_PASSWORD);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await forgot({ variables: { email } });
      if (data.forgotPassword.status === 1) setSentMessage(data.forgotPassword.message);
      else setError(data.forgotPassword.message);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
  };

  if (sentMessage) {
    return (
      <div className="auth-form auth-success">
        <div className="auth-success-icon">✉</div>
        <p>{sentMessage}</p>
        <p className="text-muted">{t("auth.linkExpiry")}</p>
        <button type="button" className="btn btn-secondary btn-full" onClick={() => onSwitch("login")}>{t("auth.backButton")}</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <Alert type="error" message={error} onDismiss={() => setError("")} />
      <p className="text-muted" style={{ marginBottom: 16 }}>{t("auth.forgotText")}</p>
      <div className="form-group">
        <label>{t("auth.email")}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" autoComplete="email" autoFocus />
      </div>
      <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
        {loading ? t("auth.sending") : t("auth.sendLink")}
      </button>
      <p className="auth-footer">
        <button type="button" className="link-button" onClick={() => onSwitch("login")}>{t("auth.back")}</button>
      </p>
    </form>
  );
}

export const AUTH_TITLES: Record<AuthView, { title: UiKey; subtitle: UiKey }> = {
  login: { title: "auth.welcome", subtitle: "auth.welcomeSub" },
  register: { title: "auth.create", subtitle: "auth.createSub" },
  forgot: { title: "auth.forgot", subtitle: "auth.forgotSub" },
};

export { PasswordInput };

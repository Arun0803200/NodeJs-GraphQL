import { useEffect, useState } from "react";
import { LoginForm, RegisterForm, ForgotPasswordForm, AUTH_TITLES, type AuthView } from "./AuthForms";
import { LangSwitch, useUiLang } from "../../i18n/UiLang";

interface Props {
  isOpen: boolean;
  initialView?: AuthView;
  reason?: string;
  onClose: () => void;
  onAuthenticated: (role: string) => void;
}

export function AuthModal({ isOpen, initialView = "register", reason, onClose, onAuthenticated }: Props) {
  const [view, setView] = useState<AuthView>(initialView);
  const { lang, setLang, t } = useUiLang();

  useEffect(() => {
    if (isOpen) setView(initialView);
  }, [isOpen, initialView]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const title = t(AUTH_TITLES[view].title);
  const subtitle = t(AUTH_TITLES[view].subtitle);

  return (
    <div className="modal-overlay auth-modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close auth-modal-close" onClick={onClose} aria-label="Close">&times;</button>
        {view !== "forgot" && (
          <div className="auth-tabs" role="tablist">
            <button role="tab" aria-selected={view === "register"} className={view === "register" ? "active" : ""} onClick={() => setView("register")}>{t("auth.tabCreate")}</button>
            <button role="tab" aria-selected={view === "login"} className={view === "login" ? "active" : ""} onClick={() => setView("login")}>{t("auth.tabSignIn")}</button>
          </div>
        )}
        <div className="auth-modal-body">
          <LangSwitch value={lang} onChange={setLang} className="lang-switch-sm auth-lang" />
          {reason && <p className="auth-reason">{reason}</p>}
          <h2>{title}</h2>
          <p className="auth-subtitle">{subtitle}</p>
          {view === "login" && <LoginForm onSuccess={onAuthenticated} onSwitch={setView} />}
          {view === "register" && <RegisterForm onSuccess={onAuthenticated} onSwitch={setView} />}
          {view === "forgot" && <ForgotPasswordForm onSwitch={setView} />}
        </div>
      </div>
    </div>
  );
}

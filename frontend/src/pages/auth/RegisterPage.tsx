import { AuthPage } from "./LoginPage";

export function RegisterPage() {
  return <AuthPage view="register" />;
}

export function ForgotPasswordPage() {
  return <AuthPage view="forgot" />;
}

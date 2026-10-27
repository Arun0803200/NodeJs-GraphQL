import { useState } from "react";
import { BRAND_NAME } from "../../lib/brand";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { RESET_PASSWORD } from "../../api/queries";
import { Alert } from "../../components/ui/Alert";
import { PasswordInput } from "../../components/auth/AuthForms";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [reset, { loading }] = useMutation<any>(RESET_PASSWORD);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      const { data } = await reset({ variables: { token, password, confirmPassword } });
      if (data.resetPassword.status === 1) setDone(true);
      else setError(data.resetPassword.message);
    } catch (err: any) {
      setError(err.message || "Password reset failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="brand auth-card-brand"><span className="brand-mark">{BRAND_NAME[0]}</span> {BRAND_NAME}</Link>
        {!token ? (
          <>
            <h1>Invalid link</h1>
            <p className="auth-subtitle">This password reset link is missing its token.</p>
            <Link to="/auth/forgot-password" className="btn btn-primary btn-full">Request a new link</Link>
          </>
        ) : done ? (
          <div className="auth-success">
            <div className="auth-success-icon">✓</div>
            <h1>Password updated</h1>
            <p className="auth-subtitle">You can now sign in with your new password.</p>
            <Link to="/auth/login" className="btn btn-primary btn-full">Sign in</Link>
          </div>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p className="auth-subtitle">Use at least 8 characters with letters and numbers.</p>
            <Alert type="error" message={error} onDismiss={() => setError("")} />
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New password</label>
                <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label>Confirm new password</label>
                <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
            <p className="auth-footer"><Link to="/auth/forgot-password">Request a new link</Link></p>
          </>
        )}
      </div>
    </div>
  );
}

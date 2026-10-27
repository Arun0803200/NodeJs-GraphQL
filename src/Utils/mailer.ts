import nodemailer from "nodemailer";
import { env } from "../Config/env";

const transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
    : null;

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<void> {
    if (!transporter) {
        // Dev fallback: no SMTP configured, so surface the mail in the server log
        console.log(`\n[mail:dev] To: ${to}\n[mail:dev] Subject: ${subject}\n${text}\n`);
        return;
    }
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html, text });
}

export async function sendSiteReviewMail(to: string, approved: boolean, userName: string, note: string | null): Promise<void> {
    const url = `${env.FRONTEND_URL}/${userName}`;
    const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const subject = approved ? "Your website is live 🎉" : "Your website needs a few changes";
    const lead = approved
        ? `Great news — your website has been approved and is now live at ${url}`
        : "An admin reviewed your website and asked for a few changes before it can go live.";
    const text = `${lead}${note ? `\n\nNote from the reviewer: ${note}` : ""}\n\n${approved ? url : `${env.FRONTEND_URL}/user/website`}`;
    const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;color:#1e293b">
            <h2 style="margin:0 0 12px">${subject}</h2>
            <p>${escape(lead)}</p>
            ${note ? `<p style="background:#f1f5f9;padding:12px 16px;border-radius:8px"><strong>Reviewer note:</strong> ${escape(note)}</p>` : ""}
            <p style="margin:28px 0"><a href="${approved ? url : `${env.FRONTEND_URL}/user/website`}" style="background:#4f46e5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${approved ? "View my website" : "Review and resubmit"}</a></p>
        </div>`;
    await sendMail(to, subject, html, text);
}

export async function sendPasswordResetMail(to: string, resetUrl: string): Promise<void> {
    const text = `We received a request to reset your password.\n\nReset it here (valid for 30 minutes):\n${resetUrl}\n\nIf you didn't ask for this, you can ignore this email.`;
    const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;color:#1e293b">
            <h2 style="margin:0 0 12px">Reset your password</h2>
            <p>We received a request to reset your password. This link is valid for 30 minutes.</p>
            <p style="margin:28px 0"><a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
            <p style="color:#64748b;font-size:13px">If you didn't ask for this, you can ignore this email.</p>
        </div>`;
    await sendMail(to, "Reset your password", html, text);
}

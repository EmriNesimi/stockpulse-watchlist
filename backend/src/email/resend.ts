import { env } from "../env";

// Resend's HTTP API directly via fetch rather than their SDK - one POST
// request, not worth a dependency for. https://resend.com/docs/api-reference/emails/send-email
const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  // Same reasoning as the rate limiters skipping under NODE_ENV=test (see
  // app.ts): route tests sign up a lot of throwaway @example.com addresses,
  // which Resend's API rejects anyway - no reason to make real network
  // calls to a third-party service on every test run.
  if (process.env.NODE_ENV === "test") {
    console.log(`[email] Skipped under test. Would have sent "${subject}" to ${to}.`);
    return;
  }

  if (!env.resendApiKey) {
    console.log(`[email] RESEND_API_KEY not set, skipping send. Would have sent "${subject}" to ${to}.`);
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.resendFromEmail, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API request failed with status ${res.status}: ${body}`);
  }
}

export function verificationEmailHtml(verifyUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 20px;">Confirm your StockPulse account</h1>
      <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
      <p>
        <a href="${verifyUrl}" style="display: inline-block; background: #8044fe; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Verify email
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">If you didn't create a StockPulse account, you can ignore this email.</p>
    </div>
  `;
}

// Sent when someone tries to sign up with an address that already has an
// account. Signup answers identically either way, so this email is the only
// thing that differs - and it goes to the address's real owner, not to
// whoever submitted the form.
export function accountExistsEmailHtml(loginUrl: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px;">
      <h2 style="margin: 0 0 16px;">Someone tried to sign up with this email</h2>
      <p style="margin: 0 0 16px; line-height: 1.6;">
        You already have a StockPulse account, so we didn't create a second one.
        If this was you, just log in instead:
      </p>
      <p style="margin: 0 0 16px;">
        <a href="${loginUrl}" style="background: #8044fe; color: #ffffff; padding: 12px 20px; border-radius: 999px; text-decoration: none; display: inline-block;">Log in</a>
      </p>
      <p style="margin: 0; line-height: 1.6; color: #6b6b7a; font-size: 14px;">
        If it wasn't you, you can ignore this - nothing has changed on your account.
      </p>
    </div>
  `;
}

// The reset link carries a token that can take over the account, so the copy
// says plainly what to do if it wasn't requested — that notice is the only
// signal the real owner gets that someone tried.
export function passwordResetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
      <h1 style="font-size: 20px;">Reset your StockPulse password</h1>
      <p>Click the link below to choose a new password. This link expires in an hour and can only be used once.</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; background: #8044fe; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">If you didn't ask to reset your password, you can ignore this email — your password hasn't changed.</p>
    </div>
  `;
}

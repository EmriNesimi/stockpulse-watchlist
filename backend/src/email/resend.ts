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
        <a href="${verifyUrl}" style="display: inline-block; background: #16a34a; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Verify email
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">If you didn't create a StockPulse account, you can ignore this email.</p>
    </div>
  `;
}

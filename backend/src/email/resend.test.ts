import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// NODE_ENV=test short-circuits sendEmail before it ever touches env.resendApiKey
// or fetch (see resend.ts) - these tests exist to verify that short-circuit
// itself, so they override NODE_ENV back to something else, same pattern as
// auth.ratelimit.test.ts.
describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("does not call fetch when NODE_ENV is 'test'", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendEmail } = await import("./resend");

    await sendEmail("someone@example.com", "Subject", "<p>hi</p>");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not call fetch when RESEND_API_KEY isn't set, even outside test", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.resetModules();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendEmail } = await import("./resend");

    await sendEmail("someone@example.com", "Subject", "<p>hi</p>");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to the Resend API with the right payload when configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "Test <test@example.com>");
    vi.resetModules();
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
    const { sendEmail } = await import("./resend");

    await sendEmail("someone@example.com", "Subject", "<p>hi</p>");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      })
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toEqual({
      from: "Test <test@example.com>",
      to: "someone@example.com",
      subject: "Subject",
      html: "<p>hi</p>",
    });
  });

  it("throws when the Resend API responds with a non-ok status", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "bad request" })
    );
    const { sendEmail } = await import("./resend");

    await expect(sendEmail("someone@example.com", "Subject", "<p>hi</p>")).rejects.toThrow(
      "Resend API request failed with status 422"
    );
  });
});

describe("verificationEmailHtml", () => {
  beforeEach(() => vi.resetModules());

  it("embeds the verify URL as a link", async () => {
    const { verificationEmailHtml } = await import("./resend");
    const html = verificationEmailHtml("https://example.com/verify-email?token=abc123");
    expect(html).toContain("https://example.com/verify-email?token=abc123");
    expect(html).toContain("<a href=");
  });
});

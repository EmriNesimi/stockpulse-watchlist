import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_API_URL = "http://localhost:4000";

// The API and WebSocket origins have to be in connect-src, and they're only
// known at build time (both derive from VITE_API_URL, same as src/lib/api.ts
// and src/lib/ws.ts). Hence a plugin rather than a hand-written meta tag in
// index.html, which would either hard-code localhost or go stale.
function contentSecurityPolicy(apiUrl: string): Plugin {
  const api = new URL(apiUrl).origin;
  const ws = api.replace(/^http/, "ws");

  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    // Google Fonts, imported at the top of src/index.css.
    "font-src 'self' https://fonts.gstatic.com",
    // 'unsafe-inline' is needed for the <style> tags Vite injects in dev and
    // for React's style attributes. Kept off script-src, which is the
    // directive that actually stops injected code from running.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self'",
    `connect-src 'self' ${api} ${ws}`,
  ].join("; ");

  return {
    name: "stockpulse-csp",
    // Build only. The dev server injects its own inline module scripts (the
    // HMR client and React Refresh preamble), which script-src 'self' blocks
    // outright - it renders a blank page. Production is where the policy
    // needs to hold anyway.
    apply: "build",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: { "http-equiv": "Content-Security-Policy", content: policy },
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

export default defineConfig(() => {
  // Read straight from the environment rather than loadEnv's full set - this
  // is the one var the policy depends on, and it mirrors the runtime default
  // in src/lib/api.ts so dev and prod agree.
  const apiUrl = process.env.VITE_API_URL ?? DEFAULT_API_URL;

  return {
    plugins: [react(), contentSecurityPolicy(apiUrl)],
    server: {
      port: 5173,
    },
  };
});

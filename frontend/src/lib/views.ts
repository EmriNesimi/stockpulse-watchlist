// The app has four screens but no router - navigation is plain state held in
// Dashboard.tsx. Keeping the shape here (rather than inline) so the Sidebar
// and the screens can share it without importing each other.
// The screens that carry no extra state are grouped into one variant so that
// `setView({ name })` type-checks against a plain ViewName - TypeScript won't
// distribute an object literal over separate single-name variants.
export type View = { name: "dashboard" | "wallet" | "profile" } | { name: "stock"; symbol: string };

export type ViewName = View["name"];

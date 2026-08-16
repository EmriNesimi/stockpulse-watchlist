// The app has four screens but no router - navigation is plain state held in
// Dashboard.tsx. Keeping the shape here (rather than inline) so the Sidebar
// and the screens can share it without importing each other.
export type View =
  | { name: "dashboard" }
  | { name: "wallet" }
  | { name: "profile" }
  | { name: "stock"; symbol: string };

export type ViewName = View["name"];

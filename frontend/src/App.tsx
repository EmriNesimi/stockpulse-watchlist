export default function App() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          padding: "var(--space-3) var(--space-5)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-primary)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "1.125rem", letterSpacing: "-0.01em" }}>
          StockPulse
        </span>
        {/* Search input and connection badge land here in upcoming commits */}
      </header>

      <main
        style={{
          flex: 1,
          padding: "var(--space-5)",
        }}
      >
        <p style={{ color: "var(--color-foreground)", opacity: 0.7 }}>
          Watchlist UI coming together over the next few commits.
        </p>
      </main>
    </div>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { installUncaughtErrorReporting } from "./lib/uncaught";
import "./index.css";

// Before render, so a failure while the tree is first mounting is reported
// rather than being the one class of crash that still goes unseen.
installUncaughtErrorReporting();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

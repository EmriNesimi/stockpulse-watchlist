import { useEffect, useRef, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";
import { resendVerificationEmail } from "../lib/api";
import styles from "./VerificationBanner.module.css";

interface VerificationBannerProps {
  onError: (message: string) => void;
}

type SendState = "idle" | "sending" | "sent";

// Signup already fired one verification email - this banner is what lets a
// user get another if it didn't arrive, without blocking anything else in
// the app while they're unverified.
export default function VerificationBanner({ onError }: VerificationBannerProps) {
  const [sendState, setSendState] = useState<SendState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The banner unmounts as soon as the address is verified, which can easily
  // land inside this 30s window — leaving a timer armed to set state on a
  // component that's gone.
  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);


  async function handleResend() {
    setSendState("sending");
    try {
      await resendVerificationEmail();
      setSendState("sent");
      // Back to a clickable state after a bit, in case it still didn't
      // arrive - "Sent" forever would leave no way to try again.
      resetTimer.current = setTimeout(() => setSendState("idle"), 30_000);
    } catch (err) {
      setSendState("idle");
      onError(err instanceof Error ? err.message : "Couldn't resend the verification email — try again.");
    }
  }

  return (
    <div className={styles.banner} role="status">
      <EnvelopeSimple size={18} weight="fill" aria-hidden className={styles.icon} />
      <span className={styles.message}>
        {sendState === "sent"
          ? "Verification email sent — check your inbox."
          : "Please verify your email address to secure your account."}
      </span>
      <button
        onClick={handleResend}
        disabled={sendState !== "idle"}
        className={styles.resendButton}
      >
        {sendState === "sending" ? "Sending…" : sendState === "sent" ? "Sent" : "Resend email"}
      </button>
    </div>
  );
}

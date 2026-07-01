"use client";

import { useEffect } from "react";

function isTrackingAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const consentRaw = localStorage.getItem("sendly-cookie-consent");
  if (!consentRaw) return false;
  try {
    const consent = JSON.parse(consentRaw);
    return consent.analytical === true;
  } catch {
    return false;
  }
}

export function initErrorTracking() {
  if (typeof window === "undefined") return;

  const handleGlobalError = (event: ErrorEvent) => {
    if (!isTrackingAllowed()) return;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          message: event.message,
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch (e) {
      console.error("Error reporting failed:", e);
    }
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isTrackingAllowed()) return;
    try {
      const reason = event.reason;
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "unhandledrejection",
          message: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    } catch (e) {
      console.error("Promise rejection reporting failed:", e);
    }
  };

  window.addEventListener("error", handleGlobalError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  return () => {
    window.removeEventListener("error", handleGlobalError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  };
}

export function ErrorTrackerInitializer() {
  useEffect(() => {
    const cleanup = initErrorTracking();
    return cleanup;
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#070708",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Background orbs */}
      <div style={{
        position: "absolute",
        top: "15%",
        left: "20%",
        width: "250px",
        height: "250px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(199,243,60,0.06) 0%, transparent 70%)",
        animation: "errFloat1 7s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "15%",
        right: "15%",
        width: "350px",
        height: "350px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(199,243,60,0.04) 0%, transparent 70%)",
        animation: "errFloat2 9s ease-in-out infinite",
      }} />

      <div style={{
        textAlign: "center",
        zIndex: 10,
        padding: "40px 24px",
        maxWidth: "480px",
      }}>
        {/* Logo */}
        <div style={{
          width: "56px",
          height: "56px",
          margin: "0 auto 24px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 0 24px rgba(199,243,60,0.3)",
        }}>
          <img
            src="/logo.png"
            alt="Sendly"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Animated error icon */}
        <div style={{
          width: "80px",
          height: "80px",
          margin: "0 auto 24px",
          borderRadius: "50%",
          border: "2px solid rgba(199,243,60,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "errPulse 2s ease-in-out infinite",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C7F33C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" opacity="0.3" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h1 style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 10px",
        }}>
          Xatolik yuz berdi
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "14px",
          lineHeight: 1.7,
          margin: "0 0 32px",
        }}>
          Sahifani yuklashda kutilmagan muammo paydo boʻldi.
          <br />
          Iltimos qayta urinib koʻring yoki bosh sahifaga qayting.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "linear-gradient(135deg, #C7F33C 0%, #A5D621 100%)",
              color: "#070708",
              border: "none",
              borderRadius: "14px",
              padding: "13px 28px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 0 24px rgba(199,243,60,0.2)",
            }}
          >
            ↻ Qayta urinish
          </button>
          <button
            onClick={() => window.location.href = "/"}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              padding: "13px 28px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            ⌂ Bosh sahifa
          </button>
        </div>

        {error?.message && (
          <div style={{
            marginTop: "32px",
            padding: "10px 16px",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            maxWidth: "400px",
            margin: "32px auto 0",
          }}>
            <p style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: "11px",
              fontFamily: "monospace",
              margin: 0,
              wordBreak: "break-word",
            }}>
              {error.message.length > 120 ? error.message.slice(0, 120) + "..." : error.message}
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes errFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, -35px) scale(1.08); }
        }
        @keyframes errFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-18px, 25px) scale(1.04); }
        }
        @keyframes errPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(199,243,60,0.15); }
          50% { box-shadow: 0 0 0 14px rgba(199,243,60,0); }
        }
      `}} />
    </div>
  );
}

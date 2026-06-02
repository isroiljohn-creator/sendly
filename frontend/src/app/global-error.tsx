"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="uz">
      <body style={{ margin: 0, padding: 0, background: "#070708", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Animated background orbs */}
          <div style={{
            position: "absolute",
            top: "20%",
            left: "15%",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(199,243,60,0.08) 0%, transparent 70%)",
            animation: "float1 8s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(199,243,60,0.05) 0%, transparent 70%)",
            animation: "float2 10s ease-in-out infinite",
          }} />

          <div style={{
            textAlign: "center",
            zIndex: 10,
            padding: "40px 24px",
            maxWidth: "520px",
          }}>
            {/* Glitch-style error code */}
            <div style={{
              fontSize: "120px",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-4px",
              background: "linear-gradient(135deg, #C7F33C 0%, #A5D621 50%, #7FB800 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "8px",
              animation: "glitch 3s ease-in-out infinite",
              position: "relative",
            }}>
              Oops!
            </div>

            {/* Decorative line */}
            <div style={{
              width: "80px",
              height: "4px",
              borderRadius: "2px",
              background: "linear-gradient(90deg, #C7F33C, transparent)",
              margin: "0 auto 28px",
            }} />

            {/* Description */}
            <h2 style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "22px",
              fontWeight: 600,
              margin: "0 0 12px",
              lineHeight: 1.3,
            }}>
              Kutilmagan xatolik yuz berdi
            </h2>
            <p style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: "15px",
              lineHeight: 1.6,
              margin: "0 0 36px",
            }}>
              Tizimda vaqtinchalik uzilish yuz berdi. Xavotir olmang — jamoamiz bu muammoni hal qilish ustida ishlayapti.
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{
                  background: "linear-gradient(135deg, #C7F33C 0%, #A5D621 100%)",
                  color: "#070708",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px 32px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 0 30px rgba(199,243,60,0.2)",
                  letterSpacing: "0.3px",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 0 40px rgba(199,243,60,0.35)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 0 30px rgba(199,243,60,0.2)";
                }}
              >
                ↻ Qayta urinish
              </button>
              <button
                onClick={() => window.location.href = "/"}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  padding: "14px 32px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  backdropFilter: "blur(10px)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                ⌂ Bosh sahifa
              </button>
            </div>

            {/* Error details badge */}
            {error?.digest && (
              <div style={{
                marginTop: "40px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px", fontFamily: "monospace" }}>
                  ID: {error.digest}
                </span>
              </div>
            )}
          </div>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes float1 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(30px, -40px) scale(1.1); }
            }
            @keyframes float2 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-20px, 30px) scale(1.05); }
            }
            @keyframes glitch {
              0%, 100% { opacity: 1; }
              92% { opacity: 1; }
              93% { opacity: 0.8; transform: translate(2px, 0); }
              94% { opacity: 1; transform: translate(-2px, 0); }
              95% { opacity: 0.9; transform: translate(0, 0); }
            }
          `}} />
        </div>
      </body>
    </html>
  );
}

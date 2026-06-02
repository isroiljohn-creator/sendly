"use client";

import Link from "next/link";

export default function NotFound() {
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
      {/* Animated background elements */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "10%",
        width: "300px",
        height: "300px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(199,243,60,0.07) 0%, transparent 70%)",
        animation: "nfFloat1 8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        bottom: "5%",
        right: "8%",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(199,243,60,0.04) 0%, transparent 70%)",
        animation: "nfFloat2 11s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute",
        top: "50%",
        right: "25%",
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(199,243,60,0.05) 0%, transparent 70%)",
        animation: "nfFloat3 6s ease-in-out infinite",
      }} />

      <div style={{
        textAlign: "center",
        zIndex: 10,
        padding: "40px 24px",
        maxWidth: "520px",
      }}>
        {/* Big 404 */}
        <div style={{
          fontSize: "160px",
          fontWeight: 900,
          lineHeight: 0.9,
          letterSpacing: "-6px",
          background: "linear-gradient(180deg, #C7F33C 0%, rgba(199,243,60,0.15) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "16px",
          position: "relative",
        }}>
          404
          <div style={{
            position: "absolute",
            bottom: "-10px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120px",
            height: "40px",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(199,243,60,0.15) 0%, transparent 70%)",
            filter: "blur(8px)",
          }} />
        </div>

        {/* Decorative dots */}
        <div style={{
          display: "flex",
          gap: "6px",
          justifyContent: "center",
          marginBottom: "28px",
        }}>
          {[0.3, 0.5, 1, 0.5, 0.3].map((opacity, i) => (
            <div key={i} style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: `rgba(199,243,60,${opacity})`,
            }} />
          ))}
        </div>

        <h1 style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 10px",
        }}>
          Sahifa topilmadi
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.4)",
          fontSize: "15px",
          lineHeight: 1.7,
          margin: "0 0 36px",
        }}>
          Siz izlayotgan sahifa oʻchirilgan, nomi oʻzgartirilgan
          <br />
          yoki vaqtincha mavjud boʻlmagan boʻlishi mumkin.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/"
            style={{
              background: "linear-gradient(135deg, #C7F33C 0%, #A5D621 100%)",
              color: "#070708",
              textDecoration: "none",
              borderRadius: "14px",
              padding: "14px 32px",
              fontSize: "14px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 0 30px rgba(199,243,60,0.2)",
              transition: "all 0.3s ease",
            }}
          >
            ⌂ Bosh sahifaga qaytish
          </Link>
          <button
            onClick={() => window.history.back()}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.7)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "14px",
              padding: "14px 32px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            ← Orqaga
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes nfFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.1); }
        }
        @keyframes nfFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, 35px) scale(1.06); }
        }
        @keyframes nfFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, -20px); }
        }
      `}} />
    </div>
  );
}

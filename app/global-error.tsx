"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: "#faf8f4", color: "#141311", fontFamily: "Georgia, serif" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "40px" }}>
          <div style={{ maxWidth: 720 }}>
            <p style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: "#b08d57" }}>TWOK STUDIO</p>
            <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", fontWeight: 400, lineHeight: 1, marginTop: 24 }}>
              Une erreur inattendue est survenue.
            </h1>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 28, border: "1px solid #141311", background: "#141311", color: "#faf8f4", padding: "14px 22px", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", cursor: "pointer" }}
            >
              Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

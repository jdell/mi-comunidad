"use client";

// Last-resort error boundary: replaces the root layout, so it must render <html> and inline styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fbf7f0", color: "#3b2a20" }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center" }}>
          <p style={{ fontSize: 56, fontWeight: 700, color: "#c2623f", margin: 0 }}>500</p>
          <h1 style={{ fontSize: 22, margin: 0 }}>Algo ha fallado</h1>
          <p style={{ maxWidth: 420, color: "#7a6656" }}>Ha ocurrido un error inesperado. Prueba de nuevo en unos segundos.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#7a6656" }}>Referencia: {error.digest}</p>}
          <button onClick={reset} style={{ background: "#c2623f", color: "#fff", border: 0, borderRadius: 10, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="site-shell">
          <section className="auth-shell">
            <h1>Application error</h1>
            <p>
              {error.message || "An unexpected error occurred."}
            </p>
            {error.digest ? <p className="muted">Reference: {error.digest}</p> : null}
            <div className="actions">
              <button className="button-primary" type="button" onClick={reset}>
                Retry
              </button>
              <Link className="button-secondary" href="/">
                Return home
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

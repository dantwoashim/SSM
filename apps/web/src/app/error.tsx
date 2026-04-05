"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="auth-shell">
      <h1>Something broke</h1>
      <p>
        {error.message || "A server-side error occurred while processing the page."}
      </p>
      {error.digest ? <p className="muted">Reference: {error.digest}</p> : null}
      <div className="actions">
        <button className="button-primary" type="button" onClick={reset}>
          Try again
        </button>
        <Link className="button-secondary" href="/app">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}

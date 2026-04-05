import Link from "next/link";

export default function NotFound() {
  return (
    <section className="auth-shell">
      <h1>Not found</h1>
      <p>
        The route may have changed, the invite may be invalid, or the requested engagement is no longer available.
      </p>
      <div className="actions">
        <Link className="button-primary" href="/">
          Go home
        </Link>
        <Link className="button-secondary" href="/login">
          Open portal
        </Link>
      </div>
    </section>
  );
}

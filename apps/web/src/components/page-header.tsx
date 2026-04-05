export function PageHeader({
  label,
  eyebrow,
  title,
  description,
}: {
  label?: string;
  eyebrow?: string;
  title: string;
  description: string;
}) {
  const displayLabel = label || eyebrow;
  return (
    <section className="page-header">
      {displayLabel ? <span className="page-label">{displayLabel}</span> : null}
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

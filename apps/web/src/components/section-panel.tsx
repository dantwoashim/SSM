export function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="panel">
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
      {children}
    </article>
  );
}

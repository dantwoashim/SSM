import clsx from "clsx";

export function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <span
      className={clsx("pill", {
        "pill-accent": tone === "accent",
      })}
    >
      {children}
    </span>
  );
}

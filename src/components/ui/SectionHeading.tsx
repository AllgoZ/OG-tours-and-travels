interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  id?: string;
  intro?: string;
  tone?: "light" | "dark";
  className?: string;
}

/** tone = the surrounding surface: "dark" on midnight/graphite, "light" on the light sections. */
export function SectionHeading({
  eyebrow,
  title,
  id,
  intro,
  tone = "dark",
  className = "",
}: SectionHeadingProps) {
  const dark = tone === "dark";
  return (
    <div className={className}>
      {eyebrow && (
        <p className="text-eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-coral" />
          <span className={dark ? "text-slate" : "text-ink/72"}>{eyebrow}</span>
        </p>
      )}
      <h2 id={id} className={`text-h2 mt-5 text-ink`}>
        {title}
      </h2>
      {intro && (
        <p className={`text-lead mt-5 max-w-2xl ${dark ? "text-slate" : "text-ink/70"}`}>{intro}</p>
      )}
    </div>
  );
}

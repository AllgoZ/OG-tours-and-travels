/** Minimal road-inspired brand mark: a road narrowing to the horizon with an amber centre line. */
export function LogoMark({ className = "size-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="13" fill="#ffffff" />
      <rect x="1" y="1" width="62" height="62" rx="12" fill="none" stroke="rgba(33,56,67,0.14)" />
      <path d="M19 55 29.5 10h5L45 55Z" fill="#0e4f66" />
      <path
        d="M32 14v8M32 27.5v10M32 43v12"
        stroke="#F5B50A"
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Wordmark({ tone = "light" }: { tone?: "dark" | "light" }) {
  const main = "text-ink";
  const sub = tone === "light" ? "text-slate" : "text-ink/70";
  return (
    <span className="flex flex-col leading-none">
      <span className={`font-heading text-[1.0625rem] font-bold tracking-[0.02em] ${main}`}>
        OG TOURS
      </span>
      <span className={`mt-1 text-[0.625rem] font-semibold tracking-[0.3em] ${sub}`}>
        AND TRAVELS
      </span>
    </span>
  );
}

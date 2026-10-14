export type ButtonVariant = "lime" | "light" | "dark" | "outline-dark" | "outline-light";
export type ButtonSize = "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-control font-semibold uppercase tracking-[0.04em] " +
  "leading-none whitespace-nowrap select-none transition-[background-color,color,border-color,transform] " +
  "duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  lime: "bg-lime text-ink border border-transparent hover:bg-[#d4ff82]",
  light: "bg-soft text-ink border border-transparent hover:bg-white",
  dark: "bg-ink text-soft border border-transparent hover:bg-graphite-2",
  "outline-dark": "bg-transparent text-soft border border-white/25 hover:border-lime hover:text-lime",
  "outline-light": "bg-transparent text-ink border border-ink/25 hover:border-ink hover:bg-ink/[0.04]",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-[0.78rem]",
  lg: "min-h-13 px-7 text-[0.82rem]",
};

export function buttonClass(
  variant: ButtonVariant = "lime",
  size: ButtonSize = "lg",
  extra = "",
): string {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

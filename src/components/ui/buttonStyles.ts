export type ButtonVariant = "accent" | "whatsapp" | "light" | "dark" | "outline-dark" | "outline-light";
export type ButtonSize = "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-control font-semibold uppercase tracking-[0.04em] " +
  "leading-none whitespace-nowrap select-none transition-[background-color,color,border-color,transform] " +
  "duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  accent: "bg-accent text-navy border border-transparent hover:bg-accent-hover",
  whatsapp: "bg-wa text-white border border-transparent hover:bg-wa-hover",
  light: "bg-white text-ink border border-ink/10 hover:bg-soft",
  dark: "bg-ink text-white border border-transparent hover:bg-ink/90",
  "outline-dark": "bg-transparent text-ink border border-ink/30 hover:border-ink hover:bg-ink/[0.05]",
  "outline-light": "bg-transparent text-ink border border-ink/25 hover:border-ink hover:bg-ink/[0.04]",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-[0.78rem]",
  lg: "min-h-13 px-7 text-[0.82rem]",
};

export function buttonClass(
  variant: ButtonVariant = "accent",
  size: ButtonSize = "lg",
  extra = "",
): string {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

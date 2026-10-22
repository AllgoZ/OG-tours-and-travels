/** Shared Tailwind class strings for the admin UI (kept in one place so forms stay consistent). */
export const field =
  "block w-full rounded-control border border-ink/25 bg-white px-3.5 py-2.5 text-base text-ink " +
  "placeholder:text-slate/70 focus-visible:border-accent-deep aria-[invalid=true]:border-red-600";

export const labelCls = "mb-1.5 block text-sm font-semibold text-ink";
export const hintCls = "mt-1.5 text-sm text-slate";
export const errorCls = "mt-1.5 text-sm font-medium text-red-700";
export const card = "rounded-xl border border-ink/10 bg-white p-5 sm:p-6";

export const btn = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-accent px-5 text-sm font-semibold text-navy " +
    "transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-55",
  dark:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-ink px-5 text-sm font-semibold text-white " +
    "transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-55",
  outline:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-ink/30 bg-white px-5 text-sm font-semibold text-ink " +
    "transition-colors hover:border-ink hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:opacity-55",
  danger:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-red-700 bg-white px-5 text-sm font-semibold text-red-700 " +
    "transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55",
} as const;

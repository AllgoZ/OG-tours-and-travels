"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "@/app/admin/actions";
import { btn, card, field, labelCls } from "./styles";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form action={action} className={`${card} mt-6 space-y-5`} noValidate>
      <input type="hidden" name="next" value={next} />

      {state.formError && (
        <p role="alert" className="rounded-control border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {state.formError}
        </p>
      )}

      <div>
        <label htmlFor="email" className={labelCls}>
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={field} />
      </div>

      <div>
        <label htmlFor="password" className={labelCls}>
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={field} />
      </div>

      <button type="submit" disabled={pending} className={`${btn.primary} w-full`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-slate">
        Access is limited to authorised administrators.
      </p>
    </form>
  );
}

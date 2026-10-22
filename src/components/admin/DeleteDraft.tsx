"use client";

import { useActionState, useRef } from "react";
import { deletePostAction, type ActionState } from "@/app/admin/actions";
import { btn, card, errorCls } from "./styles";

/** Delete a DRAFT after an explicit confirmation dialog. Live posts must be unpublished first. */
export function DeleteDraft({ id, title }: { id: string; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(deletePostAction, {});

  return (
    <section aria-labelledby="delete-heading" className={`${card} space-y-3`}>
      <h2 id="delete-heading" className="font-heading text-lg font-bold text-ink">
        Delete draft
      </h2>
      <p className="text-sm text-slate">Permanently removes this draft. This cannot be undone.</p>
      <button type="button" className={btn.danger} onClick={() => dialog.current?.showModal()}>
        Delete this draft…
      </button>
      {state.formError && (
        <p role="alert" className={errorCls}>
          {state.formError}
        </p>
      )}

      <dialog ref={dialog} aria-labelledby="delete-title" className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-ink/20 p-0 backdrop:bg-ink/50">
        <form action={action} className="space-y-4 p-6">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="confirm" value="yes" />
          <h3 id="delete-title" className="font-heading text-xl font-bold text-ink">
            Delete “{title || "Untitled"}”?
          </h3>
          <p className="text-slate">The draft and its content will be deleted for good.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btn.outline} onClick={() => dialog.current?.close()}>
              Keep draft
            </button>
            <button type="submit" disabled={pending} className={btn.danger}>
              {pending ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}

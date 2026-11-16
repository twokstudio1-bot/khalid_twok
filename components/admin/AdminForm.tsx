"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { adminInitialState, type AdminActionState } from "@/lib/admin-types";
import { cn } from "@/lib/utils";

export type AdminFormAction = (
  previous: AdminActionState,
  formData: FormData,
) => Promise<AdminActionState>;

export function AdminForm({
  action,
  children,
  submitLabel = "Enregistrer",
  pendingLabel = "Enregistrement…",
  cancelHref,
  className,
  encType,
  compact = false,
  id,
}: {
  action: AdminFormAction;
  children: React.ReactNode;
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
  className?: string;
  encType?: "multipart/form-data";
  compact?: boolean;
  id?: string;
}) {
  const [state, formAction, pending] = useActionState(action, adminInitialState);

  return (
    <form id={id} action={formAction} encType={encType} className={cn("space-y-5", className)}>
      {state.status === "error" && state.message && (
        <div role="alert" className="flex items-start gap-2.5 border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-800">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0"  />
          <span>{state.message}</span>
        </div>
      )}
      {state.status === "success" && state.message && (
        <div role="status" className="flex items-start gap-2.5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] leading-relaxed text-emerald-800">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0"  />
          <span>{state.message}</span>
        </div>
      )}
      {children}
      <div className={cn("flex flex-wrap items-center gap-3 border-t border-line/80 pt-4", compact && "border-0 pt-1")}>
        <button type="submit" disabled={pending} className="admin-btn disabled:cursor-wait disabled:opacity-60">
          {pending && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin"  />}
          {pending ? pendingLabel : submitLabel}
        </button>
        {cancelHref && (
          <Link href={cancelHref} className="link-quiet">
            Annuler
          </Link>
        )}
      </div>
    </form>
  );
}

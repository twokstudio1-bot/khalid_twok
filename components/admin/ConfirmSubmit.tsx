"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";

export function ConfirmSubmit({
  label = "Supprimer",
  confirmMessage = "Confirmer cette action ?",
  className,
  icon = true,
}: {
  label?: string;
  confirmMessage?: string;
  className?: string;
  icon?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className={className ?? "inline-flex min-h-10 items-center gap-1.5 text-[11px] text-red-700 underline-offset-2 hover:underline disabled:opacity-50"}
    >
      {pending ? <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin"  /> : icon ? <Trash2 aria-hidden className="h-3.5 w-3.5"  /> : null}
      {label}
    </button>
  );
}

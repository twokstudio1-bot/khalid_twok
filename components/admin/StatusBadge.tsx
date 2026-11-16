import { cn } from "@/lib/utils";

const styles: Record<string, { badge: string; dot: string; label: string }> = {
  PUBLISHED: { badge: "border-emerald-700/20 bg-emerald-50/70 text-emerald-900", dot: "bg-emerald-600", label: "Publié" },
  DRAFT: { badge: "border-amber-700/20 bg-amber-50/70 text-amber-900", dot: "bg-amber-600", label: "Brouillon" },
  SCHEDULED: { badge: "border-sky-700/20 bg-sky-50/70 text-sky-900", dot: "bg-sky-600", label: "Programmé" },
  ARCHIVED: { badge: "border-stone-400/30 bg-stone-100 text-stone-700", dot: "bg-stone-400", label: "Archivé" },
  PENDING: { badge: "border-amber-700/20 bg-amber-50/70 text-amber-900", dot: "bg-amber-600", label: "En attente" },
  CONFIRMED: { badge: "border-emerald-700/20 bg-emerald-50/70 text-emerald-900", dot: "bg-emerald-600", label: "Confirmée" },
  RESCHEDULED: { badge: "border-sky-700/20 bg-sky-50/70 text-sky-900", dot: "bg-sky-600", label: "Reprogrammée" },
  COMPLETED: { badge: "border-line bg-stone/70 text-muted", dot: "bg-graphite", label: "Terminée" },
  CANCELLED: { badge: "border-stone-400/30 bg-stone-100 text-stone-700", dot: "bg-stone-400", label: "Annulée" },
  REJECTED: { badge: "border-red-700/20 bg-red-50/70 text-red-900", dot: "bg-red-600", label: "Refusée" },
  NEW: { badge: "border-champagne/40 bg-[#fbf4e8] text-[#6d4c22]", dot: "bg-champagne", label: "Nouveau" },
  IN_PROGRESS: { badge: "border-sky-700/20 bg-sky-50/70 text-sky-900", dot: "bg-sky-600", label: "En cours" },
  RESOLVED: { badge: "border-emerald-700/20 bg-emerald-50/70 text-emerald-900", dot: "bg-emerald-600", label: "Résolu" },
  ACTIVE: { badge: "border-emerald-700/20 bg-emerald-50/70 text-emerald-900", dot: "bg-emerald-600", label: "Actif" },
  DISABLED: { badge: "border-stone-400/30 bg-stone-100 text-stone-700", dot: "bg-stone-400", label: "Désactivé" },
  SENT: { badge: "border-emerald-700/20 bg-emerald-50/70 text-emerald-900", dot: "bg-emerald-600", label: "Envoyé" },
  SKIPPED: { badge: "border-stone-400/30 bg-stone-100 text-stone-700", dot: "bg-stone-400", label: "Ignoré" },
  FAILED: { badge: "border-red-700/20 bg-red-50/70 text-red-900", dot: "bg-red-600", label: "Échec" },
  PENDING_NOTIFICATION: { badge: "border-amber-700/20 bg-amber-50/70 text-amber-900", dot: "bg-amber-600", label: "En attente" },
  IMAGE: { badge: "border-line bg-stone text-muted", dot: "bg-champagne", label: "Image" },
  VIDEO: { badge: "border-line bg-stone text-muted", dot: "bg-graphite", label: "Vidéo" },
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  const style = styles[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-1 text-[8.5px] font-medium uppercase tracking-[0.13em]",
        style?.badge ?? "border-line bg-white text-muted",
      )}
    >
      <span className={cn("h-1 w-1 shrink-0", style?.dot ?? "bg-muted-light")} aria-hidden />
      {label ?? style?.label ?? value}
    </span>
  );
}

export function statusLabel(value: string) {
  return styles[value]?.label ?? value;
}


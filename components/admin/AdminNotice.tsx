import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function AdminNotice({
  tone = "success",
  title,
  children,
  actionHref,
  actionLabel,
}: {
  tone?: "success" | "warning" | "error";
  title: string;
  children?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-700/15 border-l-emerald-700/60 bg-emerald-50/60 text-emerald-950"
      : tone === "warning"
        ? "border-amber-700/15 border-l-amber-600/70 bg-amber-50/70 text-amber-950"
        : "border-red-700/15 border-l-red-600/70 bg-red-50/70 text-red-950";
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-5 flex items-start gap-3 border border-l-2 px-4 py-3 text-[12.5px] leading-relaxed ${toneClass}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 opacity-85">{children}</div>}
        {actionHref && actionLabel && (
          <Link href={actionHref} className="mt-1 inline-block text-[10px] uppercase tracking-[0.14em] underline underline-offset-2">
            {actionLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

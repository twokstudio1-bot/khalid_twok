import type { ReactNode } from "react";

export function AdminPageHeader({
  eyebrow = "Administration",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="min-w-0">
        <p className="eyebrow-gold">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-[2.2rem] leading-[1] tracking-[-0.02em] text-ink sm:text-[2.75rem] lg:text-[3.1rem]">{title}</h1>
        {description && <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

import Link from "next/link";

export function PreviewBar({ context = "cette page" }: { context?: string }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[90] flex flex-wrap items-center justify-center gap-3 border-t border-gold/40 bg-charcoal px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-cream/80">
      <span aria-hidden className="h-1.5 w-1.5 bg-gold" />
      Prévisualisation — {context} peut inclure des brouillons.
      <Link href="/admin" className="underline decoration-gold underline-offset-4 hover:text-cream">Administration</Link>
    </div>
  );
}

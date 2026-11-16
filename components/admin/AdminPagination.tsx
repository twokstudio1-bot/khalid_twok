import Link from "next/link";

export function AdminPagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between border-t border-line pt-4 text-[11px] uppercase tracking-[0.12em] text-muted" aria-label="Pagination">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="link-quiet">← Précédent</Link>
      ) : (
        <span className="inline-flex min-h-10 items-center opacity-40">← Précédent</span>
      )}
      <span>Page {page} / {totalPages}</span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="link-quiet">Suivant →</Link>
      ) : (
        <span className="inline-flex min-h-10 items-center opacity-40">Suivant →</span>
      )}
    </nav>
  );
}

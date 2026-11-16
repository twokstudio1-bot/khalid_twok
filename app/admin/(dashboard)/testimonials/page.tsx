import type { Metadata } from "next";
import Link from "next/link";
import { Quote, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { SmartImage } from "@/components/media/SmartImage";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Témoignages" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.TESTIMONIALS_MANAGE);
  const search = await searchParams;
  const testimonials = await prisma.testimonial.findMany({
    include: { photo: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Témoignages."
        description={`${testimonials.length} témoignage(s). Gérez les citations affichées sur le site.`}
        actions={<Link href="/admin/testimonials/new" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Nouveau témoignage</Link>}
      />

      {search.created === "1" && <AdminNotice tone="success" title="Témoignage créé." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Témoignage enregistré." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Témoignage supprimé." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Témoignage introuvable." />}

      {testimonials.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="admin-card p-5">
              <div className="flex items-start gap-3">
                {testimonial.photo?.url ? (
                  <span className="relative block h-12 w-12 shrink-0 overflow-hidden bg-stone">
                    <SmartImage src={testimonial.photo.thumbnailUrl ?? testimonial.photo.url} alt="" fill sizes="48px" />
                  </span>
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-stone font-serif text-lg text-muted">
                    {testimonial.author.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{testimonial.author}</p>
                  {testimonial.role && <p className="text-[10.5px] text-muted">{testimonial.role}</p>}
                  <p className="mt-2 font-serif text-[1.05rem] leading-relaxed text-ink">“{testimonial.quoteFr}”</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.12em] text-muted">
                    <StatusBadge value={testimonial.active ? "ACTIVE" : "DISABLED"} />
                    {testimonial.featured && <span className="text-champagne">Mis en avant</span>}
                    <Link href={`/admin/testimonials/${testimonial.id}`} className="ml-auto inline-flex min-h-10 items-center text-ink hover:underline">Modifier</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <Quote aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun témoignage.</p>
          <p className="mt-2 text-[12px] text-muted">Ajoutez une citation client.</p>
          <Link href="/admin/testimonials/new" className="admin-btn mt-5">Nouveau témoignage</Link>
        </div>
      )}
    </div>
  );
}

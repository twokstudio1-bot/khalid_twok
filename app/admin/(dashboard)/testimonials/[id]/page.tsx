import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { TestimonialForm } from "@/components/admin/TestimonialForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteTestimonialAction } from "@/app/admin/actions/testimonials";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un témoignage" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditTestimonialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.TESTIMONIALS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const testimonial = await prisma.testimonial.findUnique({
    where: { id },
    include: { photo: true },
  });
  if (!testimonial) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow="Contenu"
        title={testimonial.author}
        description={`Créé le ${formatDateTime(testimonial.createdAt)} · Dernière modification le ${formatDateTime(testimonial.updatedAt)}.`}
      />
      {search.saved === "1" && <AdminNotice tone="success" title="Témoignage enregistré." />}
      <TestimonialForm testimonial={testimonial} />
      <section className="admin-card mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Supprimer le témoignage</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">La suppression est définitive.</p>
        <form action={deleteTestimonialAction} className="mt-4">
          <input type="hidden" name="id" value={testimonial.id} />
          <ConfirmSubmit label="Supprimer définitivement" confirmMessage={`Supprimer le témoignage de « ${testimonial.author} » ?`} />
        </form>
      </section>
    </div>
  );
}

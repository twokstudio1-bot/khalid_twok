import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteCategoryAction } from "@/app/admin/actions/categories";
import { categoryParentOptions } from "@/lib/admin-content";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier une catégorie" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [category, parents] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
      include: { translations: true, coverMedia: true },
    }),
    categoryParentOptions(id),
  ]);
  if (!category || category.deletedAt) notFound();

  const fr = category.translations.find((row) => row.locale === "FR");
  const error = typeof search.error === "string" ? search.error : null;

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Catégories"
        title={fr?.name ?? "Catégorie"}
        description={`Créée le ${formatDateTime(category.createdAt)} · Dernière modification le ${formatDateTime(category.updatedAt)}.`}
      />

      {search.created === "1" && <AdminNotice tone="success" title="Catégorie créée. Complétez les traductions et vérifiez la publication." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Modifications enregistrées." />}
      {error && <AdminNotice tone="error" title="Action impossible.">{error}</AdminNotice>}

      <CategoryForm category={category} parents={parents} />

      <section className="admin-card mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Archiver la catégorie</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          L&apos;archivage retire la catégorie du site public sans supprimer son historique. Les sous-catégories et projets liés doivent être déplacés au préalable.
        </p>
        <form action={deleteCategoryAction} className="mt-4">
          <input type="hidden" name="id" value={category.id} />
          <ConfirmSubmit
            label="Archiver cette catégorie"
            confirmMessage={`Archiver « ${fr?.name ?? category.id} » ? Elle ne sera plus visible sur le site.`}
          />
        </form>
      </section>
    </div>
  );
}

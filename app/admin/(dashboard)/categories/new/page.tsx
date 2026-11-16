import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { categoryParentOptions } from "@/lib/admin-content";

export const metadata: Metadata = { title: "Nouvelle catégorie" };
export const dynamic = "force-dynamic";

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const search = await searchParams;
  const defaultService =
    search.service === "PHOTO" || search.service === "VIDEO" || search.service === "DRONE" ? search.service : "PHOTO";
  const parents = await categoryParentOptions();

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Catégories"
        title="Nouvelle catégorie."
        description="Créez un univers ou une sous-catégorie. La page reste brouillon jusqu'à sa publication."
      />
      <CategoryForm parents={parents} defaultService={defaultService} />
    </div>
  );
}

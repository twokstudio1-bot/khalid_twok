import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArticleForm } from "@/components/admin/ArticleForm";

export const metadata: Metadata = { title: "Nouvel article" };
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requirePermission(PERMISSIONS.ARTICLES_MANAGE);
  const [categories, tags, authors] = await Promise.all([
    prisma.articleCategory.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.articleTag.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Journal"
        title="Nouvel article."
        description="Rédigez en français et en anglais. Le contenu Markdown est nettoyé côté serveur à l'affichage."
      />
      <ArticleForm
        categories={categories.map((category) => ({ id: category.id, nameFr: category.nameFr, nameEn: category.nameEn }))}
        tags={tags.map((tag) => ({ id: tag.id, nameFr: tag.nameFr, nameEn: tag.nameEn }))}
        authors={authors.map((author) => ({ id: author.id, name: author.name }))}
      />
    </div>
  );
}

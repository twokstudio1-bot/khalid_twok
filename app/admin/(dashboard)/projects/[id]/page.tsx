import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteProjectAction } from "@/app/admin/actions/projects";
import { toMediaView, projectFormOptions } from "@/lib/admin-content";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un projet" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.PROJECTS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [project, options] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        translations: { include: { seoImage: true } },
        coverMedia: true,
        categories: true,
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
        relatedFrom: true,
      },
    }),
    projectFormOptions(id),
  ]);
  if (!project || project.deletedAt) notFound();

  const fr = project.translations.find((row) => row.locale === "FR");
  const error = typeof search.error === "string" ? search.error : null;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Projets"
        title={fr?.title ?? "Projet"}
        description={`Créé le ${formatDateTime(project.createdAt)} · Dernière modification le ${formatDateTime(project.updatedAt)}.`}
        actions={
          fr?.slug ? (
            <a href={`/fr/project/${fr.slug}`} target="_blank" rel="noreferrer" className="admin-btn-ghost">
              Voir sur le site <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Projet créé. Complétez les médias et les traductions si nécessaire." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Projet enregistré." />}
      {error && <AdminNotice tone="error" title="Action impossible.">{error}</AdminNotice>}

      <ProjectForm
        project={project}
        {...options}
        selectedCategoryIds={project.categories.map((row) => row.categoryId)}
        galleryMedia={project.media.map((row) => toMediaView(row.media)).filter((value) => value !== null)}
        selectedRelatedIds={project.relatedFrom.map((row) => row.relatedProjectId)}
      />

      <section className="admin-card mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Archiver le projet</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          Le projet quitte le site public mais reste consultable dans l&apos;administration. La galerie et les traductions sont conservées.
        </p>
        <form action={deleteProjectAction} className="mt-4">
          <input type="hidden" name="id" value={project.id} />
          <ConfirmSubmit
            label="Archiver ce projet"
            confirmMessage={`Archiver « ${fr?.title ?? project.id} » ? Il ne sera plus visible sur le site.`}
          />
        </form>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { projectFormOptions } from "@/lib/admin-content";

export const metadata: Metadata = { title: "Nouveau projet" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requirePermission(PERMISSIONS.PROJECTS_MANAGE);
  const options = await projectFormOptions();

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Projets"
        title="Nouveau projet."
        description="Créez une étude de cas complète : couverture, galerie, classification et traductions."
      />
      <ProjectForm {...options} />
    </div>
  );
}

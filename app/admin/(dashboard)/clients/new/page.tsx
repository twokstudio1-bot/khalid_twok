import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ClientForm } from "@/components/admin/ClientForm";

export const metadata: Metadata = { title: "Nouveau client" };
export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  await requirePermission(PERMISSIONS.CLIENTS_MANAGE);
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    include: { translations: { where: { locale: "FR" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader eyebrow="Clients" title="Nouveau client." description="Ajoutez une marque ou un partenaire et associez ses projets." />
      <ClientForm
        projects={projects.filter((project) => project.translations[0]?.title).map((project) => ({ id: project.id, title: project.translations[0].title }))}
      />
    </div>
  );
}

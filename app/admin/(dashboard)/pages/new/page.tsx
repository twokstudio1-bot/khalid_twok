import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PageForm } from "@/components/admin/PageForm";
import { pageParentOptions } from "@/lib/admin-content";

export const metadata: Metadata = { title: "Nouvelle page" };
export const dynamic = "force-dynamic";

export default async function NewPage() {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const parents = await pageParentOptions();
  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader eyebrow="Pages" title="Nouvelle page." description="Créez une page puis ajoutez-y des blocs." />
      <PageForm parents={parents} />
    </div>
  );
}

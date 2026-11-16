import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TestimonialForm } from "@/components/admin/TestimonialForm";

export const metadata: Metadata = { title: "Nouveau témoignage" };
export const dynamic = "force-dynamic";

export default async function NewTestimonialPage() {
  await requirePermission(PERMISSIONS.TESTIMONIALS_MANAGE);
  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader eyebrow="Contenu" title="Nouveau témoignage." description="Ajoutez une citation client affichée sur le site." />
      <TestimonialForm />
    </div>
  );
}

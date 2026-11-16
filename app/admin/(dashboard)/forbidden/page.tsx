import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage() {
  await requireAdmin();
  return (
    <div>
      <AdminPageHeader eyebrow="Accès refusé" title="Permission insuffisante." description="Votre rôle ne permet pas d'ouvrir cette section. Contactez un super administrateur si vous pensez qu'il s'agit d'une erreur." />
      <div className="admin-card max-w-xl p-6">
        <p className="text-[13px] leading-relaxed text-muted">
          Les permissions sont vérifiées côté serveur pour chaque page et chaque action. Aucun contrôle d&apos;interface ne remplace cette vérification.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/admin" className="admin-btn">Retour au tableau de bord</Link>
          <Link href="/fr" className="admin-btn-ghost">Site public</Link>
        </div>
      </div>
    </div>
  );
}

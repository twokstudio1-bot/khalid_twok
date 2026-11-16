import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, Field, SelectField } from "@/components/admin/Fields";
import { createUserAction } from "@/app/admin/actions/users";

export const metadata: Metadata = { title: "Nouvel utilisateur" };
export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const roles = await prisma.role.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader eyebrow="Système" title="Nouvel utilisateur." description="Créez un compte et attribuez des rôles." />
      <AdminForm action={createUserAction} submitLabel="Créer l'utilisateur" pendingLabel="Création…" cancelHref="/admin/users">
        <AdminPanel title="Compte">
          <div className="space-y-5">
            <Field label="Nom" name="name" required />
            <Field label="E-mail" name="email" type="email" required />
            <Field label="Mot de passe" name="password" type="password" required help="Au moins 12 caractères." />
            <SelectField label="Statut" name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Actif</option>
              <option value="DISABLED">Désactivé</option>
            </SelectField>
            <div>
              <span className="admin-label">Rôles</span>
              <div className="mt-2 flex flex-wrap gap-4">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                    <input type="checkbox" name="roleIds" value={role.id} className="h-3.5 w-3.5 accent-[#b08d57]" />
                    {role.key}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </AdminPanel>
      </AdminForm>
    </div>
  );
}

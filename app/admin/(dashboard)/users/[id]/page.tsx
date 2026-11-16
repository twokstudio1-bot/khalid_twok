import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, Field, SelectField } from "@/components/admin/Fields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { updateUserAction, disableUserAction, resetUserPasswordAction } from "@/app/admin/actions/users";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un utilisateur" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [user, roles] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { roles: true } }),
    prisma.role.findMany({ orderBy: { key: "asc" } }),
  ]);
  if (!user || user.deletedAt) notFound();
  const assigned = new Set(user.roles.map((row) => row.roleId));

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow="Système"
        title={user.name}
        description={`Créé le ${formatDateTime(user.createdAt)} · Dernière connexion ${user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}.`}
      />
      {search.saved === "1" && <AdminNotice tone="success" title="Utilisateur enregistré." />}
      {search.passwordReset === "1" && <AdminNotice tone="success" title="Mot de passe réinitialisé et sessions fermées." />}

      <AdminForm action={updateUserAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" cancelHref="/admin/users">
        <input type="hidden" name="id" value={user.id} />
        <AdminPanel title="Compte">
          <div className="space-y-5">
            <Field label="Nom" name="name" defaultValue={user.name} required />
            <Field label="E-mail" name="email" type="email" defaultValue={user.email} required />
            <SelectField label="Statut" name="status" defaultValue={user.status}>
              <option value="ACTIVE">Actif</option>
              <option value="DISABLED">Désactivé</option>
            </SelectField>
            <div>
              <span className="admin-label">Rôles</span>
              <div className="mt-2 flex flex-wrap gap-4">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                    <input
                      type="checkbox"
                      name="roleIds"
                      value={role.id}
                      defaultChecked={assigned.has(role.id)}
                      className="h-3.5 w-3.5 accent-[#b08d57]"
                    />
                    {role.key}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </AdminPanel>
      </AdminForm>

      <AdminPanel title="Réinitialiser le mot de passe" description="Les sessions actives seront fermées.">
        <AdminForm action={resetUserPasswordAction} submitLabel="Réinitialiser" pendingLabel="Réinitialisation…" compact>
          <input type="hidden" name="id" value={user.id} />
          <Field label="Nouveau mot de passe" name="password" type="password" required help="Au moins 12 caractères." />
        </AdminForm>
      </AdminPanel>

      <section className="admin-card mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Désactiver le compte</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          Le compte est désactivé et ses sessions sont fermées. Vous ne pouvez pas désactiver votre propre compte.
        </p>
        <form action={disableUserAction} className="mt-4">
          <input type="hidden" name="id" value={user.id} />
          <ConfirmSubmit label="Désactiver ce compte" confirmMessage={`Désactiver « ${user.email} » ?`} />
        </form>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Utilisateurs" };
export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const search = await searchParams;
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Système"
        title="Utilisateurs."
        description={`${users.length} utilisateur(s) actif(s) ou désactivé(s).`}
        actions={
          <>
            <Link href="/admin/roles" className="admin-btn-ghost">Rôles & permissions</Link>
            <Link href="/admin/users/new" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Nouvel utilisateur</Link>
          </>
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Utilisateur créé." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Utilisateur enregistré." />}
      {search.disabled === "1" && <AdminNotice tone="success" title="Utilisateur désactivé." />}
      {search.passwordReset === "1" && <AdminNotice tone="success" title="Mot de passe réinitialisé." />}
      {search.error === "self" && <AdminNotice tone="error" title="Vous ne pouvez pas désactiver votre propre compte." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Utilisateur introuvable." />}

      <div className="admin-table-wrap">
        <table className="admin-table min-w-[760px]">
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead>
            <tr>
              <th scope="col">Utilisateur</th>
              <th scope="col">Rôles</th>
              <th scope="col">Statut</th>
              <th scope="col">Dernière connexion</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td data-label="Utilisateur">
                  <p className="text-ink">{user.name}</p>
                  <p className="text-[10.5px] text-muted">{user.email}</p>
                </td>
                <td data-label="Rôles" className="text-muted">{user.roles.map((row) => row.role.key).join(", ") || "—"}</td>
                <td data-label="Statut"><StatusBadge value={user.status} /></td>
                <td data-label="Dernière connexion" className="text-muted">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</td>
                <td data-label="Actions" data-actions className="text-right">
                  <Link href={`/admin/users/${user.id}`} className="link-quiet">
                    Modifier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

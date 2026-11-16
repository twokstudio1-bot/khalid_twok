import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel } from "@/components/admin/Fields";
import { updateRolePermissionsAction } from "@/app/admin/actions/users";

export const metadata: Metadata = { title: "Rôles & permissions" };
export const dynamic = "force-dynamic";

export default async function RolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.USERS_MANAGE);
  const search = await searchParams;
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, users: { select: { userId: true } } },
      orderBy: { key: "asc" },
    }),
    prisma.permission.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] }),
  ]);

  const grouped = permissions.reduce<Record<string, typeof permissions>>((acc, permission) => {
    acc[permission.group] = acc[permission.group] ?? [];
    acc[permission.group].push(permission);
    return acc;
  }, {});

  return (
    <div>
      <AdminPageHeader
        eyebrow="Système"
        title="Rôles & permissions."
        description="Définissez les permissions accordées à chaque rôle. Les rôles système sont conservés."
      />
      {search.saved === "1" && <AdminNotice tone="success" title="Permissions enregistrées." />}

      <div className="space-y-6">
        {roles.map((role) => {
          const assigned = new Set(role.permissions.map((row) => row.permission.key));
          return (
            <AdminPanel
              key={role.id}
              title={`${role.key} — ${role.name}`}
              description={`${role.users.length} utilisateur(s) · ${role.isSystem ? "Rôle système" : "Rôle personnalisé"}`}
            >
              <AdminForm action={updateRolePermissionsAction} submitLabel="Enregistrer les permissions" pendingLabel="Enregistrement…" compact>
                <input type="hidden" name="roleId" value={role.id} />
                <div className="space-y-5">
                  {Object.entries(grouped).map(([group, items]) => (
                    <div key={group}>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">{group}</p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((permission) => (
                          <label key={permission.id} className="flex items-start gap-2 py-1.5 text-[12px] text-ink">
                            <input
                              type="checkbox"
                              name="permissionKeys"
                              value={permission.key}
                              defaultChecked={assigned.has(permission.key)}
                              className="mt-0.5 h-4 w-4 accent-[#b08d57]"
                            />
                            <span>
                              {permission.label}
                              <span className="block font-mono text-[9.5px] text-muted">{permission.key}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AdminForm>
            </AdminPanel>
          );
        })}
      </div>
    </div>
  );
}

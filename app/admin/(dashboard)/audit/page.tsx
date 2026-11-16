import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Journal d'audit" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const entityType = typeof search.entityType === "string" ? search.entityType.trim() : "";
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.AuditLogWhereInput = {
    ...(entityType ? { entityType } : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, logs, entityTypes] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.auditLog.findMany({ select: { entityType: true }, distinct: ["entityType"], orderBy: { entityType: "asc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (entityType) params.set("entityType", entityType);
    if (targetPage > 1) params.set("page", String(targetPage));
    const value = params.toString();
    return `/admin/audit${value ? `?${value}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Système"
        title="Journal d'audit."
        description={`${total} événement(s). Toutes les actions sensibles sont journalisées.`}
      />

      <form method="get" action="/admin/audit" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Action, résumé…" className="admin-input" />
        </label>
        <label>
          <span className="admin-label">Type d&apos;entité</span>
          <select name="entityType" defaultValue={entityType} className="admin-input">
            <option value="">Tous</option>
            {entityTypes.map((row) => (
              <option key={row.entityType} value={row.entityType}>{row.entityType}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-btn">Filtrer</button>
        {(q || entityType) && <Link href="/admin/audit" className="admin-btn-ghost">Réinitialiser</Link>}
      </form>

      {logs.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[820px]">
            <caption className="sr-only">Journal d&apos;audit</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Acteur</th>
                <th scope="col">Action</th>
                <th scope="col">Entité</th>
                <th scope="col">Résumé</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td data-label="Date" className="text-muted">{formatDateTime(log.createdAt)}</td>
                  <td data-label="Acteur" className="text-ink">{log.actor?.name ?? "Système"}</td>
                  <td data-label="Action" className="font-mono text-[10.5px] text-muted">{log.action}</td>
                  <td data-label="Entité" className="text-muted">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</td>
                  <td data-label="Résumé" className="text-ink">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <BarChart3 aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun événement.</p>
          <p className="mt-2 text-[12px] text-muted">Les actions administratives apparaîtront ici.</p>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

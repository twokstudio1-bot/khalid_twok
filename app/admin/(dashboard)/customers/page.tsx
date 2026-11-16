import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Contact } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Clients CRM" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { _count: { select: { bookings: true, messages: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const value = params.toString();
    return `/admin/customers${value ? `?${value}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Activité"
        title="Clients CRM."
        description={`${total} client(s) enregistré(s). Fiches créées depuis les formulaires publics.`}
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Client CRM mis à jour." />}

      <form method="get" action="/admin/customers" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Nom, e-mail, téléphone…" className="admin-input" />
        </label>
        <button type="submit" className="admin-btn">Rechercher</button>
        {q && <Link href="/admin/customers" className="admin-btn-ghost">Réinitialiser</Link>}
      </form>

      {customers.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[760px]">
            <caption className="sr-only">Liste des clients CRM</caption>
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">Téléphone</th>
                <th scope="col" className="text-center">Réservations</th>
                <th scope="col" className="text-center">Messages</th>
                <th scope="col">Créé le</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td data-label="Client">
                    <p className="text-ink">{customer.name}</p>
                    <p className="text-[10.5px] text-muted">{customer.email}</p>
                  </td>
                  <td data-label="Téléphone" className="text-muted">{customer.phone ?? "—"}</td>
                  <td data-label="Réservations" className="text-center text-muted">{customer._count.bookings}</td>
                  <td data-label="Messages" className="text-center text-muted">{customer._count.messages}</td>
                  <td data-label="Créé le" className="text-muted">{formatDateTime(customer.createdAt)}</td>
                  <td data-label="Actions" data-actions className="text-right">
                    <Link href={`/admin/customers/${customer.id}`} className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline">
                      Fiche
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <Contact aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun client CRM.</p>
          <p className="mt-2 text-[12px] text-muted">Les fiches sont créées automatiquement lors des réservations et messages.</p>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}

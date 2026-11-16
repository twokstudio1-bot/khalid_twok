import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Mail } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge, statusLabel } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

const STATUS_TABS = ["NEW", "IN_PROGRESS", "RESOLVED", "ARCHIVED"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function isStatusTab(value: unknown): value is StatusTab {
  return typeof value === "string" && (STATUS_TABS as readonly string[]).includes(value);
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.MESSAGES_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const status = isStatusTab(search.status) ? search.status : undefined;
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.ContactMessageWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { message: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, messages, statusGroups] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.contactMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const allCount = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = Boolean(q || status);

  const buildHref = (options: { status?: StatusTab | null; page?: number } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const targetStatus = options.status === null ? undefined : (options.status ?? status);
    if (targetStatus) params.set("status", targetStatus);
    if (options.page && options.page > 1) params.set("page", String(options.page));
    const value = params.toString();
    return `/admin/messages${value ? `?${value}` : ""}`;
  };

  const activeLabel = status ? statusLabel(status) : "Tous";

  return (
    <div>
      <AdminPageHeader
        eyebrow="Activité"
        title="Messages."
        description={`${total} message${total > 1 ? "s" : ""} ${hasFilters ? "correspondant aux filtres" : "reçus via le formulaire de contact"}. Chaque message est horodaté et conservé jusqu'à son archivage.`}
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Message mis à jour." />}

      <nav aria-label="Filtrer les messages par statut" className="mb-3 overflow-x-auto">
        <ul className="flex w-max min-w-full gap-px border border-line bg-line">
          <li>
            <Link
              href={buildHref({ status: null, page: 1 })}
              aria-current={!status ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-2 px-3.5 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors",
                !status ? "bg-ink text-cream" : "bg-white text-muted hover:text-ink",
              )}
            >
              Tous
              <span className={cn("text-[9px]", !status ? "text-gold" : "text-muted-light")}>{allCount}</span>
            </Link>
          </li>
          {STATUS_TABS.map((value) => {
            const active = status === value;
            return (
              <li key={value}>
                <Link
                  href={buildHref({ status: value, page: 1 })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-2 px-3.5 py-2 text-[10px] uppercase tracking-[0.12em] transition-colors",
                    active ? "bg-ink text-cream" : "bg-white text-muted hover:text-ink",
                  )}
                >
                  {statusLabel(value)}
                  <span className={cn("text-[9px]", active ? "text-gold" : "text-muted-light")}>
                    {counts.get(value) ?? 0}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <form method="get" action="/admin/messages" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Nom, e-mail, téléphone, message…"
            className="admin-input"
          />
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="admin-btn">
          Filtrer
        </button>
        {hasFilters && (
          <Link href="/admin/messages" className="admin-btn-ghost">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
          {activeLabel}
          {q ? ` · « ${q} »` : ""}
        </p>
        <p className="text-[10px] text-muted-light">
          {total} résultat{total > 1 ? "s" : ""}
        </p>
      </div>

      {messages.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[760px]">
            <caption className="sr-only">Liste des messages, {activeLabel.toLowerCase()}</caption>
            <thead>
              <tr>
                <th scope="col">Contact</th>
                <th scope="col">Service</th>
                <th scope="col">Message</th>
                <th scope="col">Statut</th>
                <th scope="col">Reçu le</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td data-label="Contact">
                    <p className="text-ink">{message.name}</p>
                    <p className="text-[10.5px] text-muted">{message.email}</p>
                    {message.phone && <p className="text-[10.5px] text-muted">{message.phone}</p>}
                  </td>
                  <td data-label="Service" className="text-muted">
                    {message.serviceType ?? "—"}
                  </td>
                  <td data-label="Message" className="text-muted">
                    <p className="line-clamp-2 max-w-[320px]">{message.message}</p>
                  </td>
                  <td data-label="Statut">
                    <StatusBadge value={message.status} />
                  </td>
                  <td data-label="Reçu le" className="text-muted">
                    {formatDateTime(message.createdAt)}
                  </td>
                  <td data-label="Actions" data-actions className="text-right">
                    <Link
                      href={`/admin/messages/${message.id}`}
                      className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline"
                    >
                      Détail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <Mail aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">{hasFilters ? "Aucun résultat." : "Aucun message."}</p>
          <p className="mt-2 text-[12px] text-muted">
            {hasFilters
              ? "Aucun message ne correspond à ces filtres."
              : "Les messages du formulaire de contact apparaîtront ici."}
          </p>
          {hasFilters && (
            <Link href="/admin/messages" className="admin-btn mt-5">
              Effacer les filtres
            </Link>
          )}
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={(target) => buildHref({ page: target })} />
    </div>
  );
}

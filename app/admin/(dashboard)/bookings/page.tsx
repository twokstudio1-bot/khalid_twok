import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge, statusLabel } from "@/components/admin/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Réservations" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;

const STATUS_TABS = ["PENDING", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "REJECTED"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

function isStatusTab(value: unknown): value is StatusTab {
  return typeof value === "string" && (STATUS_TABS as readonly string[]).includes(value);
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.BOOKINGS_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const status = isStatusTab(search.status) ? search.status : undefined;
  const serviceId = typeof search.service === "string" ? search.service : "";
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.BookingWhereInput = {
    ...(status ? { status } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" } },
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, bookings, services, statusGroups] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: { service: true, customer: true },
      orderBy: [{ preferredDate: "asc" }, { preferredTime: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.bookingService.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const counts = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const allCount = statusGroups.reduce((sum, group) => sum + group._count._all, 0);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = Boolean(q || status || serviceId);

  const buildHref = (options: { status?: StatusTab | null; page?: number } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (serviceId) params.set("service", serviceId);
    const targetStatus = options.status === null ? undefined : (options.status ?? status);
    if (targetStatus) params.set("status", targetStatus);
    if (options.page && options.page > 1) params.set("page", String(options.page));
    const value = params.toString();
    return `/admin/bookings${value ? `?${value}` : ""}`;
  };

  const activeLabel = status ? statusLabel(status) : "Toutes";

  return (
    <div>
      <AdminPageHeader
        eyebrow="Activité"
        title="Réservations."
        description={`${total} demande${total > 1 ? "s" : ""} ${hasFilters ? "correspondant aux filtres" : "au total"}. Une réservation reste en attente jusqu'à votre décision : elle ne bloque aucun créneau avant confirmation.`}
        actions={
          <>
            <Link href="/admin/bookings/calendar" className="admin-btn-ghost">
              <CalendarDays aria-hidden className="h-3.5 w-3.5" /> Calendrier
            </Link>
            <Link href="/admin/bookings/settings" className="admin-btn-ghost">
              Disponibilités
            </Link>
          </>
        }
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Réservation mise à jour." />}
      {typeof search.error === "string" && (
        <AdminNotice tone="error" title={decodeURIComponent(search.error)} />
      )}

      <nav aria-label="Filtrer les réservations par statut" className="mb-3 overflow-x-auto">
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
              Toutes
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

      <form method="get" action="/admin/bookings" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Référence, nom, e-mail, téléphone…"
            className="admin-input"
          />
        </label>
        <label className="min-w-[180px]">
          <span className="admin-label">Service</span>
          <select name="service" defaultValue={serviceId} className="admin-input">
            <option value="">Tous les services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.nameFr}
              </option>
            ))}
          </select>
        </label>
        {status && <input type="hidden" name="status" value={status} />}
        <button type="submit" className="admin-btn">
          Filtrer
        </button>
        {hasFilters && (
          <Link href="/admin/bookings" className="admin-btn-ghost">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
          {activeLabel}
          {serviceId ? " · service filtré" : ""}
          {q ? ` · « ${q} »` : ""}
        </p>
        <p className="text-[10px] text-muted-light">
          {total} résultat{total > 1 ? "s" : ""}
        </p>
      </div>

      {bookings.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[900px]">
            <caption className="sr-only">Liste des réservations, {activeLabel.toLowerCase()}</caption>
            <thead>
              <tr>
                <th scope="col">Référence</th>
                <th scope="col">Client</th>
                <th scope="col">Service</th>
                <th scope="col">Date / heure</th>
                <th scope="col">Statut</th>
                <th scope="col">Créée le</th>
                <th scope="col" className="text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td data-label="Référence" className="font-mono text-[11px] text-ink">
                    {booking.reference}
                  </td>
                  <td data-label="Client">
                    <p className="text-ink">{booking.fullName}</p>
                    <p className="text-[10.5px] text-muted">{booking.email}</p>
                  </td>
                  <td data-label="Service" className="text-muted">
                    {booking.service?.nameFr ?? booking.projectType ?? "—"}
                  </td>
                  <td data-label="Date / heure" className="text-muted">
                    {formatDate(booking.preferredDate)} · {booking.preferredTime}
                  </td>
                  <td data-label="Statut">
                    <StatusBadge value={booking.status} />
                  </td>
                  <td data-label="Créée le" className="text-muted">
                    {formatDateTime(booking.createdAt)}
                  </td>
                  <td data-label="Actions" data-actions className="text-right">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
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
          <CalendarDays aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">
            {hasFilters ? "Aucun résultat." : "Aucune réservation."}
          </p>
          <p className="mt-2 text-[12px] text-muted">
            {hasFilters
              ? "Aucune réservation ne correspond à ces filtres."
              : "Les demandes envoyées depuis le site apparaîtront ici."}
          </p>
          {hasFilters && (
            <Link href="/admin/bookings" className="admin-btn mt-5">
              Effacer les filtres
            </Link>
          )}
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={(target) => buildHref({ page: target })} />
    </div>
  );
}

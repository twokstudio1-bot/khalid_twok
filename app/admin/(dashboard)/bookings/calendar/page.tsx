import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Calendrier des réservations" };
export const dynamic = "force-dynamic";

export default async function BookingCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.BOOKINGS_MANAGE);
  const search = await searchParams;
  const now = new Date();
  const monthParam = typeof search.month === "string" ? search.month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = monthParam.split("-").map((value) => Number.parseInt(value, 10));
  const safeYear = Number.isFinite(year) ? year : now.getFullYear();
  const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const start = new Date(Date.UTC(safeYear, safeMonth - 1, 1));
  const end = new Date(Date.UTC(safeYear, safeMonth, 1));

  const bookings = await prisma.booking.findMany({
    where: { preferredDate: { gte: start, lt: end } },
    include: { service: true },
    orderBy: [{ preferredDate: "asc" }, { preferredTime: "asc" }],
  });

  const daysInMonth = new Date(Date.UTC(safeYear, safeMonth, 0)).getUTCDate();
  const firstDay = start.getUTCDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday first
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<number, typeof bookings>();
  for (const booking of bookings) {
    const day = booking.preferredDate.getUTCDate();
    const list = byDay.get(day) ?? [];
    list.push(booking);
    byDay.set(day, list);
  }

  const prevMonth = safeMonth === 1 ? `${safeYear - 1}-12` : `${safeYear}-${String(safeMonth - 1).padStart(2, "0")}`;
  const nextMonth = safeMonth === 12 ? `${safeYear + 1}-01` : `${safeYear}-${String(safeMonth + 1).padStart(2, "0")}`;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Activité"
        title="Calendrier."
        description="Vue mensuelle des demandes de réservation."
        actions={<Link href="/admin/bookings" className="admin-btn-ghost">← Liste</Link>}
      />

      <div className="mb-5 flex items-center justify-between">
        <Link href={`/admin/bookings/calendar?month=${prevMonth}`} className="admin-btn-ghost">← Mois précédent</Link>
        <p className="font-serif text-2xl text-ink">
          {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(start)}
        </p>
        <Link href={`/admin/bookings/calendar?month=${nextMonth}`} className="admin-btn-ghost">Mois suivant →</Link>
      </div>

      <div className="admin-card mb-6 overflow-x-auto p-4">
        <div className="grid min-w-[700px] grid-cols-7 gap-px bg-line text-center text-[10px] uppercase tracking-[0.14em] text-muted">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <div key={day} className="bg-stone px-2 py-2">{day}</div>
          ))}
        </div>
        <div className="grid min-w-[700px] grid-cols-7 gap-px bg-line">
          {cells.map((day, index) => {
            const dayBookings = day ? byDay.get(day) ?? [] : [];
            return (
              <div key={index} className="min-h-[92px] bg-white p-2">
                {day && (
                  <>
                    <p className="text-[11px] font-medium text-ink">{day}</p>
                    <div className="mt-1 space-y-1">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <Link
                          key={booking.id}
                          href={`/admin/bookings/${booking.id}`}
                          className="block truncate border border-line bg-cream px-1.5 py-0.5 text-[9.5px] text-ink hover:border-champagne"
                        >
                          {booking.preferredTime} · {booking.fullName}
                        </Link>
                      ))}
                      {dayBookings.length > 3 && (
                        <p className="text-[9px] text-muted">+{dayBookings.length - 3} autres</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-card p-5">
        <h2 className="font-serif text-xl text-ink">Réservations du mois</h2>
        {bookings.length ? (
          <ul className="mt-4 divide-y divide-line/70">
            {bookings.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px]">
                <div>
                  <p className="font-medium text-ink">{booking.reference} · {booking.fullName}</p>
                  <p className="text-[10.5px] text-muted">{booking.service?.nameFr ?? "—"} · {booking.preferredTime}</p>
                </div>
                <StatusBadge value={booking.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[12px] text-muted">Aucune réservation ce mois-ci.</p>
        )}
      </div>
    </div>
  );
}

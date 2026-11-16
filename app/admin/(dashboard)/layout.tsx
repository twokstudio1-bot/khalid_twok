import { hasPermission, requireAdmin } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminFrame } from "@/components/admin/AdminFrame";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const failedSince = new Date();
  failedSince.setDate(failedSince.getDate() - 7);
  const [pendingBookings, newMessages, failedNotifications] = await Promise.all([
    hasPermission(session, PERMISSIONS.BOOKINGS_MANAGE)
      ? prisma.booking.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
    hasPermission(session, PERMISSIONS.MESSAGES_MANAGE)
      ? prisma.contactMessage.count({ where: { status: "NEW" } })
      : Promise.resolve(0),
    hasPermission(session, PERMISSIONS.SYSTEM_VIEW)
      ? prisma.bookingNotification.count({
          where: {
            status: { in: ["FAILED", "SKIPPED"] },
            createdAt: { gte: failedSince },
          },
        })
      : Promise.resolve(0),
  ]);

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <AdminFrame
      session={session}
      counts={{ pendingBookings, newMessages, failedNotifications }}
      todayLabel={todayLabel}
    >
      {children}
    </AdminFrame>
  );
}

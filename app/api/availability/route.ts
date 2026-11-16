import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAvailableSlots } from "@/lib/booking";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date") ?? "",
    serviceId: url.searchParams.get("serviceId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", slots: [], closed: true }, { status: 400 });
  }

  const now = new Date();
  const requested = new Date(`${parsed.data.date}T00:00:00.000Z`);
  if (Number.isNaN(requested.getTime()) || requested.getUTCFullYear() < now.getUTCFullYear() - 2) {
    return NextResponse.json({ error: "invalid_date", slots: [], closed: true }, { status: 400 });
  }
  if (requested.getTime() > now.getTime() + 1000 * 60 * 60 * 24 * 400) {
    return NextResponse.json({ error: "date_too_far", slots: [], closed: true }, { status: 400 });
  }

  let durationMinutes: number | undefined;
  if (parsed.data.serviceId) {
    const service = await prisma.bookingService.findUnique({
      where: { id: parsed.data.serviceId },
      select: { durationMinutes: true, active: true },
    });
    if (!service?.active) {
      return NextResponse.json({ error: "service_unavailable", slots: [], closed: true }, { status: 200 });
    }
    durationMinutes = service.durationMinutes;
  }

  const result = await getAvailableSlots(parsed.data.date, durationMinutes);
  return NextResponse.json(
    { ...result, date: parsed.data.date },
    { headers: { "Cache-Control": "no-store" } },
  );
}

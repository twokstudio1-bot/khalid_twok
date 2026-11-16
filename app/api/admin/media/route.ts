import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasPermission(session, PERMISSIONS.MEDIA_MANAGE)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const kindParam = searchParams.get("kind");
  const kind = kindParam === "IMAGE" || kindParam === "VIDEO" ? kindParam : undefined;
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") ?? "30", 10) || 30, 1), 60);

  const items = await prisma.media.findMany({
    where: {
      deletedAt: null,
      ...(kind ? { kind } : {}),
      ...(query
        ? {
            OR: [
              { originalName: { contains: query, mode: "insensitive" } },
              { altFr: { contains: query, mode: "insensitive" } },
              { altEn: { contains: query, mode: "insensitive" } },
              { folder: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      kind: true,
      url: true,
      thumbnailUrl: true,
      mimeType: true,
      originalName: true,
      altFr: true,
      altEn: true,
      width: true,
      height: true,
    },
  });

  return NextResponse.json({ items });
}

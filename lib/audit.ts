import "server-only";
import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue;
};

export async function logAudit(input: AuditInput) {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null;
    const userAgent = headerList.get("user-agent")?.slice(0, 500) ?? null;
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata,
        ip,
        userAgent,
      },
    });
  } catch {
    // Audit failures must never break the operation, but are intentionally silent.
  }
}

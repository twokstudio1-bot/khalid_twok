import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

function hashKey(namespace: string, value: string) {
  return createHash("sha256")
    .update(`${namespace}:${env.authSecret}:${value}`)
    .digest("hex");
}

export async function clientIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    headerList.get("cf-connecting-ip") ||
    "unknown"
  ).slice(0, 120);
}

export async function consumeRateLimit(options: {
  namespace: string;
  identifier: string;
  limit: number;
  windowMs: number;
}) {
  const key = hashKey(options.namespace, options.identifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + options.windowMs);

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limits" ("key", "count", "expiresAt", "updatedAt")
    VALUES (${key}, 1, ${expiresAt}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."expiresAt" <= ${now} THEN 1 ELSE "rate_limits"."count" + 1 END,
      "expiresAt" = CASE WHEN "rate_limits"."expiresAt" <= ${now} THEN ${expiresAt} ELSE "rate_limits"."expiresAt" END,
      "updatedAt" = ${now}
    RETURNING "count"
  `;

  // Opportunistic cleanup, never on the critical path.
  prisma.rateLimit
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } })
    .catch(() => undefined);

  const count = Number(rows[0]?.count ?? 1);
  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
  };
}

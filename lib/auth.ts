import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";

const SESSION_COOKIE = "twok_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type AdminSession = {
  sessionId: string;
  user: { id: string; email: string; name: string };
  roles: string[];
  permissions: string[];
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null;
  const userAgent = headerList.get("user-agent")?.slice(0, 500) ?? null;

  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      ip,
      userAgent,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });

  // Opportunistic cleanup; never blocks login on failure.
  prisma.session
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } })
    .catch(() => undefined);

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export function hasPermission(session: AdminSession | null, permission: string): boolean {
  if (!session) return false;
  if (session.permissions.includes(PERMISSIONS.ALL)) return true;
  return session.permissions.includes(permission);
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.status !== "ACTIVE" || session.user.deletedAt) return null;

  if (Date.now() - session.lastUsedAt.getTime() > 1000 * 60 * 15) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  const roles = session.user.roles.map((entry) => entry.role.key);
  const permissions = Array.from(
    new Set(
      session.user.roles.flatMap((entry) =>
        entry.role.permissions.map((rolePermission) => rolePermission.permission.key),
      ),
    ),
  );

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    roles,
    permissions,
  };
});

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requirePermission(permission: string): Promise<AdminSession> {
  const session = await requireAdmin();
  if (!hasPermission(session, permission)) redirect("/admin/forbidden");
  return session;
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { email: email.toLowerCase(), ip, success } });
}

export async function isLoginThrottled(email: string, ip: string) {
  const since = new Date(Date.now() - 1000 * 60 * 15);
  const failures = await prisma.loginAttempt.count({
    where: {
      createdAt: { gte: since },
      success: false,
      OR: [{ email: email.toLowerCase() }, { ip }],
    },
  });
  return failures >= 8;
}

export async function pruneLoginAttempts() {
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } },
  }).catch(() => undefined);
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  return token;
}

export async function consumePasswordResetToken(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) return false;
  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return true;
}

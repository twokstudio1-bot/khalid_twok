"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  createPasswordResetToken,
  createSession,
  consumePasswordResetToken,
  destroySession,
  getAdminSession,
  hashPassword,
  isLoginThrottled,
  recordLoginAttempt,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";
import { adminError, actionText, type AdminActionState } from "@/lib/admin";

const DUMMY_HASH = "$2b$12$9x2H/TYPi9JMz6bKfO3nOeHbZuXA95Br54Hpo2uAY06bOIfikQjNy";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Mot de passe requis.").max(200),
});

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
});

const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .max(200)
  .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre.");

const resetSchema = z
  .object({
    token: z.string().min(10, "Lien de réinitialisation invalide."),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirm"],
  });

function formError(message: string): AdminActionState {
  return { status: "error", message };
}

export async function loginAdmin(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = loginSchema.safeParse({
    email: actionText(formData, "email"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Identifiants invalides.");
  }

  const ip = await clientIp();
  if (await isLoginThrottled(parsed.data.email, ip)) {
    return formError("Trop de tentatives. Réessayez dans quelques minutes.");
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { roles: { include: { role: true } } },
  });

  const passwordOk = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  const active = Boolean(user && user.status === "ACTIVE" && !user.deletedAt);
  await recordLoginAttempt(parsed.data.email, ip, passwordOk && active);

  if (!user || !passwordOk || !active) {
    return formError("E-mail ou mot de passe incorrect.");
  }

  await createSession(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({
    actorId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    summary: `Connexion de ${user.email}`,
    metadata: { roles: user.roles.map((entry) => entry.role.key), ip },
  });

  redirect("/admin");
}

export async function logoutAdmin() {
  const session = await getAdminSession();
  if (session) {
    await logAudit({
      actorId: session.user.id,
      action: "auth.logout",
      entityType: "User",
      entityId: session.user.id,
      summary: `Déconnexion de ${session.user.email}`,
    });
  }
  await destroySession();
  redirect("/admin/login");
}

export async function requestPasswordReset(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = forgotSchema.safeParse({ email: actionText(formData, "email") });
  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Adresse e-mail invalide.");
  }

  const genericSuccess =
    "Si un compte correspond à cette adresse, un lien de réinitialisation a été préparé. Le service e-mail doit être configuré pour recevoir ce lien.";

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user && user.status === "ACTIVE" && !user.deletedAt) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${env.siteUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;

      if (env.smtp.host) {
        try {
          const transport = nodemailer.createTransport({
            host: env.smtp.host,
            port: env.smtp.port,
            secure: env.smtp.secure,
            auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
          });
          const info = await transport.sendMail({
            from: env.smtp.from,
            to: user.email,
            subject: "Réinitialisation de votre mot de passe — TWOK STUDIO",
            text: [
              `Bonjour ${user.name},`,
              "",
              "Une réinitialisation de mot de passe a été demandée pour votre compte TWOK STUDIO.",
              "Ce lien expire dans 60 minutes et ne peut être utilisé qu'une fois :",
              resetUrl,
              "",
              "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
            ].join("\n"),
          });
          await logAudit({
            actorId: user.id,
            action: "auth.password_reset.email",
            entityType: "User",
            entityId: user.id,
            summary: "E-mail de réinitialisation envoyé.",
            metadata: { providerRef: info.messageId, status: "SENT" },
          });
        } catch (error) {
          await logAudit({
            actorId: user.id,
            action: "auth.password_reset.email",
            entityType: "User",
            entityId: user.id,
            summary: "Échec de l'envoi de l'e-mail de réinitialisation.",
            metadata: {
              status: "FAILED",
              error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
            },
          });
        }
      } else {
        await logAudit({
          actorId: user.id,
          action: "auth.password_reset.email",
          entityType: "User",
          entityId: user.id,
          summary: "E-mail de réinitialisation non envoyé : SMTP non configuré.",
          metadata: { status: "SKIPPED" },
        });
      }
    }
  } catch (error) {
    console.error("[auth] password reset request failed", error);
  }

  return { status: "success", message: genericSuccess };
}

export async function resetPassword(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = resetSchema.safeParse({
    token: actionText(formData, "token"),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return formError(parsed.error.issues[0]?.message ?? "Lien ou mot de passe invalide.");
  }

  let ok = false;
  try {
    ok = await consumePasswordResetToken(parsed.data.token, parsed.data.password);
  } catch (error) {
    console.error("[auth] password reset failed", error);
    return formError("Impossible de réinitialiser le mot de passe. Réessayez.");
  }
  if (!ok) {
    return formError("Ce lien est invalide, déjà utilisé ou expiré. Demandez un nouveau lien.");
  }
  await logAudit({
    action: "auth.password_reset.completed",
    entityType: "User",
    summary: "Mot de passe réinitialisé via un lien sécurisé.",
  });
  redirect("/admin/login?reset=1");
}

export async function updateOwnPassword(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getAdminSession();
  if (!session) return adminError("Session expirée.");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current || !next || next !== confirm) {
    return adminError("Vérifiez le mot de passe actuel et la confirmation.");
  }
  const passwordCheck = passwordSchema.safeParse(next);
  if (!passwordCheck.success) {
    return adminError(passwordCheck.error.issues[0]?.message ?? "Mot de passe trop faible.");
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return adminError("Mot de passe actuel incorrect.");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });
  await prisma.session.deleteMany({ where: { userId: user.id, id: { not: session.sessionId } } });
  await logAudit({
    actorId: user.id,
    action: "auth.password_changed",
    entityType: "User",
    entityId: user.id,
    summary: "Mot de passe modifié par l'utilisateur.",
  });
  return { status: "success", message: "Mot de passe mis à jour. Les autres sessions ont été déconnectées." };
}

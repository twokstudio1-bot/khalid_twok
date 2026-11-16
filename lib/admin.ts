import "server-only";
import { z } from "zod";
import { getAdminSession, hasPermission, type AdminSession } from "@/lib/auth";

export type AdminActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const adminInitialState: AdminActionState = { status: "idle" };

export function adminError(message: string): AdminActionState {
  return { status: "error", message };
}

export function adminSuccess(message: string): AdminActionState {
  return { status: "success", message };
}

export function actionText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function actionRawText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function actionBool(formData: FormData, key: string) {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function actionInt(formData: FormData, key: string, fallback = 0) {
  const value = Number.parseInt(actionText(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

export function actionIds(formData: FormData, key: string) {
  return Array.from(
    new Set(
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export function actionDate(formData: FormData, key: string) {
  const value = actionText(formData, key);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function actionNullableText(formData: FormData, key: string) {
  const value = actionText(formData, key);
  return value || null;
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function zodMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Vérifiez les champs du formulaire.";
  const path = issue.path.filter((value) => typeof value === "string").join(".");
  return path ? `${path} : ${issue.message}` : issue.message;
}

export async function actionGuard(permission?: string): Promise<
  | { ok: true; session: AdminSession }
  | { ok: false; state: AdminActionState }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      state: adminError("Session expirée. Reconnectez-vous pour continuer."),
    };
  }
  if (permission && !hasPermission(session, permission)) {
    return {
      ok: false,
      state: adminError("Votre rôle ne dispose pas de la permission requise pour cette action."),
    };
  }
  return { ok: true, session };
}

export function databaseErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  if (code === "P2002") {
    return "Cette valeur existe déjà (slug ou e-mail en doublon). Choisissez-en une autre.";
  }
  if (code === "P2003") {
    return "Ce contenu est encore lié à d'autres éléments et ne peut pas être supprimé.";
  }
  if (code === "P2025") {
    return "L'élément demandé est introuvable.";
  }
  console.error("[admin] database error", error);
  return "Une erreur base de données est survenue. Réessayez ou consultez le journal système.";
}

export function formatDateTime(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(value);
}

export function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Africa/Casablanca",
  }).format(value);
}

export function formatDateInput(value: Date | null | undefined, withTime = false) {
  if (!value) return "";
  const iso = value.toISOString();
  return withTime ? iso.slice(0, 16) : iso.slice(0, 10);
}

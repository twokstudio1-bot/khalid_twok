import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { resetPassword } from "@/app/admin/actions/auth";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const metadata: Metadata = { title: "Réinitialiser le mot de passe" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  const search = await searchParams;
  const token = typeof search.token === "string" ? search.token : "";

  if (!token) {
    return (
      <div>
        <p className="eyebrow-gold">Accès au compte</p>
        <h1 className="mt-3 font-serif text-[2.6rem] leading-[1.02] text-ink">Lien invalide.</h1>
        <div className="mt-6">
          <AdminNotice tone="warning" title="Ce lien de réinitialisation est incomplet.">
            Demandez un nouveau lien depuis la page de connexion.
          </AdminNotice>
        </div>
        <Link href="/admin/forgot-password" className="text-[10.5px] uppercase tracking-[0.14em] text-muted hover:text-ink">
          Demander un nouveau lien →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow-gold">Accès au compte</p>
      <h1 className="mt-3 font-serif text-[2.6rem] leading-[1.02] text-ink">Nouveau mot de passe.</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Choisissez un mot de passe d&apos;au moins 12 caractères, avec lettres et chiffres. Toutes les sessions existantes seront déconnectées.
      </p>

      <div className="mt-7">
        <AdminForm action={resetPassword} submitLabel="Réinitialiser" pendingLabel="Mise à jour…">
          <input type="hidden" name="token" value={token} />
          <Field label="Nouveau mot de passe" name="password" type="password" autoComplete="new-password" required />
          <Field label="Confirmer le mot de passe" name="confirm" type="password" autoComplete="new-password" required />
        </AdminForm>
      </div>

      <Link href="/admin/login" className="mt-6 inline-block text-[10.5px] uppercase tracking-[0.14em] text-muted hover:text-ink">
        ← Retour à la connexion
      </Link>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { requestPasswordReset } from "@/app/admin/actions/auth";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";

export const metadata: Metadata = { title: "Mot de passe oublié" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <div>
      <p className="eyebrow-gold">Accès au compte</p>
      <h1 className="mt-3 font-serif text-[2.6rem] leading-[1.02] text-ink">Mot de passe oublié.</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Indiquez l&apos;adresse associée à votre compte. Un lien de réinitialisation valable une heure sera préparé.
      </p>

      <div className="mt-7">
        <AdminForm action={requestPasswordReset} submitLabel="Demander un lien" pendingLabel="Préparation…">
          <Field label="Adresse e-mail" name="email" type="email" autoComplete="email" required />
        </AdminForm>
      </div>

      <p className="mt-6 border border-line bg-white p-4 text-[11px] leading-relaxed text-muted">
        L&apos;envoi dépend du service e-mail (SMTP). S&apos;il n&apos;est pas configuré, aucun e-mail ne part : contactez le super administrateur ou utilisez la procédure documentée sur le serveur.
      </p>

      <Link href="/admin/login" className="mt-6 inline-block text-[10.5px] uppercase tracking-[0.14em] text-muted hover:text-ink">
        ← Retour à la connexion
      </Link>
    </div>
  );
}

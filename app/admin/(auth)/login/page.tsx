import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { loginAdmin } from "@/app/admin/actions/auth";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  const search = await searchParams;
  const reset = search.reset === "1";

  return (
    <div>
      <p className="eyebrow-gold">Connexion sécurisée</p>
      <h1 className="mt-3 font-serif text-[2.8rem] leading-[1.02] text-ink">Administration.</h1>
      <p className="mt-3 text-[13px] leading-relaxed text-muted">
        Identifiez-vous pour gérer le contenu, les médias et l&apos;activité du studio.
      </p>

      {reset && (
        <div className="mt-6">
          <AdminNotice tone="success" title="Mot de passe réinitialisé. Vous pouvez vous connecter." />
        </div>
      )}

      <div className="mt-7">
        <AdminForm action={loginAdmin} submitLabel="Se connecter" pendingLabel="Connexion…">
          <Field label="Adresse e-mail" name="email" type="email" autoComplete="username" required />
          <Field label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
          <div className="flex items-center justify-between text-[10.5px] uppercase tracking-[0.12em]">
            <Link href="/admin/forgot-password" className="text-muted hover:text-ink">
              Mot de passe oublié ?
            </Link>
            <Link href="/fr" className="text-muted hover:text-ink">
              Site public →
            </Link>
          </div>
        </AdminForm>
      </div>

      <p className="mt-8 border-t border-line pt-5 text-[10.5px] leading-relaxed text-muted-light">
        Les tentatives de connexion sont limitées et journalisées. Utilisez uniquement un accès nominatif.
      </p>
    </div>
  );
}

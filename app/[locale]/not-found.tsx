import Link from "next/link";
import { headers } from "next/headers";
import { ArrowRight } from "lucide-react";

export default async function LocaleNotFound() {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/fr";
  const locale = pathname.split("/")[1] === "en" ? "en" : "fr";
  return (
    <section className="bg-cream py-28 sm:py-40">
      <div className="container-editorial">
        <p className="eyebrow-gold">404</p>
        <h1 className="mt-6 max-w-4xl font-serif text-[clamp(3.4rem,9vw,8rem)] leading-[0.9] tracking-[-0.03em] text-ink">
          {locale === "fr" ? "Cette page\nn'existe pas." : "This page\ndoesn't exist."}
        </h1>
        <p className="mt-7 max-w-lg text-sm leading-relaxed text-muted">
          {locale === "fr"
            ? "La page recherchée a peut-être été déplacée ou son adresse a changé. Explorez nos univers ou revenez à l'accueil."
            : "The page you are looking for may have moved or its address has changed. Explore our worlds or go back home."}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href={`/${locale}`} className="btn-primary">
            {locale === "fr" ? "Retour à l'accueil" : "Back home"}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
          <Link href={`/${locale}/photo`} className="btn-outline">Photo</Link>
          <Link href={`/${locale}/blog`} className="btn-outline">{locale === "fr" ? "Le journal" : "The journal"}</Link>
        </div>
      </div>
    </section>
  );
}

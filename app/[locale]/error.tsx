"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="bg-cream py-28 sm:py-40">
      <div className="container-editorial">
        <p className="eyebrow-gold">Erreur</p>
        <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.8rem,7vw,6rem)] leading-[0.95] text-ink">
          Une erreur inattendue est survenue.
        </h1>
        <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">
          L&apos;incident a été enregistré. Vous pouvez réessayer ou revenir à l&apos;accueil.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-primary">Réessayer</button>
          <Link href="/fr" className="btn-outline">Accueil</Link>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center bg-cream">
      <div className="container-editorial py-24">
        <p className="eyebrow-gold">404</p>
        <h1 className="mt-6 font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.94] text-ink">Page introuvable.</h1>
        <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">
          La page demandée n&apos;existe pas. <Link href="/fr" className="underline decoration-champagne underline-offset-4">Retour à l&apos;accueil</Link>.
        </p>
        <div className="mt-8">
          <Link href="/fr" className="btn-primary">Accueil</Link>
        </div>
      </div>
    </main>
  );
}

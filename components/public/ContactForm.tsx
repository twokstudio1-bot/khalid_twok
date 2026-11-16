"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { submitContactMessage } from "@/app/actions/public";
import { initialFormState } from "@/lib/form-state";
import type { AppLocale } from "@/lib/i18n";

type ServiceOption = { id: string; name: string };

export function ContactForm({
  locale,
  services = [],
  privacyHref,
  sourcePage,
}: {
  locale: AppLocale;
  services?: ServiceOption[];
  privacyHref?: string | null;
  sourcePage?: string;
}) {
  const [state, formAction, pending] = useActionState(submitContactMessage, initialFormState);

  if (state.status === "success") {
    return (
      <div role="status" className="flex min-h-[420px] flex-col items-start justify-center border border-line bg-white p-8 sm:p-12">
        <CheckCircle2 aria-hidden className="h-7 w-7 text-champagne"  />
        <h2 className="mt-6 font-serif text-[2.2rem] leading-tight text-ink">
          {locale === "fr" ? "Message reçu." : "Message received."}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{state.message}</p>
        <Link href={`/${locale}`} className="link-line mt-8 text-ink">
          {locale === "fr" ? "Retour à l'accueil" : "Back home"}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-line bg-white p-6 sm:p-9" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {sourcePage && <input type="hidden" name="sourcePage" value={sourcePage} />}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mb-7 flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow-gold">{locale === "fr" ? "Formulaire" : "Form"}</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">{locale === "fr" ? "Écrivez-nous" : "Write to us"}</h2>
        </div>
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted">* {locale === "fr" ? "Requis" : "Required"}</span>
      </div>

      {state.status === "error" && state.message && (
        <div role="alert" className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="field-label">{locale === "fr" ? "Nom complet *" : "Full name *"}</label>
          <input id="contact-name" name="name" required autoComplete="name" className="field" />
        </div>
        <div>
          <label htmlFor="contact-email" className="field-label">E-mail *</label>
          <input id="contact-email" name="email" type="email" required autoComplete="email" className="field" />
        </div>
        <div>
          <label htmlFor="contact-phone" className="field-label">{locale === "fr" ? "Téléphone" : "Phone"}</label>
          <input id="contact-phone" name="phone" type="tel" autoComplete="tel" className="field" />
        </div>
        <div>
          <label htmlFor="contact-service" className="field-label">{locale === "fr" ? "Type de projet" : "Project type"}</label>
          <select id="contact-service" name="serviceType" className="field">
            <option value="">{locale === "fr" ? "Sélectionner" : "Select"}</option>
            {services.map((service) => (
              <option key={service.id} value={service.name}>{service.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact-date" className="field-label">{locale === "fr" ? "Date envisagée" : "Target date"}</label>
          <input id="contact-date" name="preferredDate" type="date" className="field" />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className="field-label">{locale === "fr" ? "Votre message *" : "Your message *"}</label>
        <textarea id="contact-message" name="message" rows={6} required className="field resize-y" placeholder={locale === "fr" ? "Décrivez votre projet, le lieu, le format recherché…" : "Tell us about your project, location, desired format…"} />
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[11.5px] leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#b08d57]" />
        <span>
          {locale === "fr"
            ? "J'accepte que mes informations soient utilisées uniquement pour traiter ma demande, conformément à la politique de confidentialité."
            : "I agree that my information will be used only to process this request, in line with the privacy policy."}
          {privacyHref && (
            <>
              {" "}
              <Link href={privacyHref} className="underline decoration-champagne underline-offset-2 hover:text-ink">
                {locale === "fr" ? "En savoir plus" : "Learn more"}
              </Link>
            </>
          )}
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary mt-7 w-full disabled:cursor-wait disabled:opacity-60">
        {pending ? (
          <>
            <Loader2 aria-hidden className="h-4 w-4 animate-spin"  />
            {locale === "fr" ? "Envoi en cours…" : "Sending…"}
          </>
        ) : (
          <>
            {locale === "fr" ? "Envoyer le message" : "Send message"}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </>
        )}
      </button>
      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-light">
        {locale === "fr"
          ? "Aucun paiement n'est demandé pour envoyer ce formulaire."
          : "No payment is requested to send this form."}
      </p>
    </form>
  );
}

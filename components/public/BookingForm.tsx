"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { submitBookingRequest } from "@/app/actions/public";
import { useActionState } from "react";
import { initialFormState } from "@/lib/form-state";
import type { AppLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";

export type BookingServiceView = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceFrom: string | null;
};

type AvailabilityResponse = {
  slots?: string[];
  closed?: boolean;
  reason?: string | null;
  timezone?: string;
  error?: string;
};

const reasonLabels: Record<string, { fr: string; en: string }> = {
  "Date invalide.": { fr: "Date invalide.", en: "Invalid date." },
  "Disponibilités non configurées.": { fr: "Les disponibilités ne sont pas encore configurées.", en: "Availability has not been configured yet." },
  "Fermé ce jour-là.": { fr: "Le studio est fermé ce jour-là.", en: "The studio is closed on this day." },
  "Aucun créneau disponible.": { fr: "Aucun créneau disponible pour cette date.", en: "No available slots for this date." },
  "Date indisponible.": { fr: "Cette date n'est pas disponible.", en: "This date is unavailable." },
};

function localReason(reason: string | null | undefined, locale: AppLocale) {
  if (!reason) return locale === "fr" ? "Aucun créneau disponible pour cette date." : "No available slots for this date.";
  return reasonLabels[reason]?.[locale] ?? (locale === "fr" ? reason : "No available slots for this date.");
}

export function BookingForm({
  locale,
  services,
  privacyHref,
}: {
  locale: AppLocale;
  services: BookingServiceView[];
  privacyHref?: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitBookingRequest, initialFormState);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Africa/Casablanca");

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services],
  );
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [lastDate, setLastDate] = useState<string | null>(null);
  if (lastDate !== date) {
    setLastDate(date);
    setSelectedTime("");
    if (!date) {
      setSlots([]);
      setClosedReason(null);
      setAvailabilityError(null);
    } else {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
    }
  }

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ date });
    if (serviceId) params.set("serviceId", serviceId);
    fetch(`/api/availability?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as AvailabilityResponse;
        if (!response.ok) throw new Error(payload.error ?? "request_failed");
        setSlots(Array.isArray(payload.slots) ? payload.slots : []);
        setClosedReason(payload.closed ? localReason(payload.reason, locale) : null);
        if (payload.timezone) setTimezone(payload.timezone);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSlots([]);
        setClosedReason(null);
        setAvailabilityError(
          locale === "fr"
            ? "Impossible de charger les créneaux. Merci de réessayer."
            : "Unable to load available slots. Please try again.",
        );
      })
      .finally(() => setAvailabilityLoading(false));
    return () => controller.abort();
  }, [date, serviceId, locale]);

  if (state.status === "success") {
    return (
      <div role="status" className="border border-line bg-white p-8 sm:p-12">
        <CheckCircle2 aria-hidden className="h-8 w-8 text-champagne"  />
        <p className="mt-6 eyebrow-gold">{locale === "fr" ? "Demande enregistrée" : "Request recorded"}</p>
        <h2 className="mt-3 font-serif text-[2.6rem] leading-[1.02] text-ink">
          {locale === "fr" ? "Merci, votre demande est reçue." : "Thank you, your request is received."}
        </h2>
        {state.reference && (
          <div className="mt-7 border border-line bg-stone px-5 py-4">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted">
              {locale === "fr" ? "Référence de la demande" : "Request reference"}
            </p>
            <p className="mt-1 font-mono text-lg tracking-wide text-ink">{state.reference}</p>
          </div>
        )}
        <p className="mt-6 max-w-lg text-sm leading-relaxed text-muted">{state.message}</p>
        <p className="mt-4 max-w-lg text-xs leading-relaxed text-muted">
          {locale === "fr"
            ? "Aucun paiement n'a été demandé. Cette demande ne bloque pas encore la date : notre équipe reviendra vers vous avec une confirmation."
            : "No payment has been requested. This request does not yet block the date: our team will come back to you with a confirmation."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}`} className="btn-outline">
            {locale === "fr" ? "Retour à l'accueil" : "Back home"}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
          <Link href={`/${locale}/contact`} className="btn-primary">
            {locale === "fr" ? "Nous contacter" : "Contact us"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="border border-line bg-white p-6 sm:p-9" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="preferredTime" value={selectedTime} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="booking-website">Website</label>
        <input id="booking-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mb-7 flex items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow-gold">{locale === "fr" ? "Demande de réservation" : "Booking request"}</p>
          <h2 className="mt-2 font-serif text-3xl text-ink">{locale === "fr" ? "Votre projet" : "Your project"}</h2>
        </div>
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted">* {locale === "fr" ? "Requis" : "Required"}</span>
      </div>

      {state.status === "error" && state.message && (
        <div role="alert" className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="booking-service" className="field-label">{locale === "fr" ? "Prestation *" : "Service *"}</label>
          <select
            id="booking-service"
            name="projectType"
            value={selectedService?.name ?? ""}
            onChange={(event) => {
              const found = services.find((service) => service.name === event.target.value);
              setServiceId(found?.id ?? "");
            }}
            className="field"
          >
            {services.map((service) => (
              <option key={service.id} value={service.name}>
                {service.name} · {service.durationMinutes} min
                {service.priceFrom ? ` · ${formatMoney(service.priceFrom)}` : ""}
              </option>
            ))}
          </select>
          {selectedService?.description && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{selectedService.description}</p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="booking-date" className="field-label">{locale === "fr" ? "Date souhaitée *" : "Preferred date *"}</label>
            <div className="relative">
              <CalendarDays aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <input
                id="booking-date"
                name="preferredDate"
                type="date"
                min={today}
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="field pr-9"
              />
            </div>
          </div>
          <div>
            <span className="field-label">{locale === "fr" ? "Créneau souhaité *" : "Preferred slot *"}</span>
            <div className="min-h-[46px] border border-line bg-stone/60 px-3.5 py-3 text-[11.5px] text-muted" aria-live="polite">
              {!date && (locale === "fr" ? "Choisissez d'abord une date." : "Choose a date first.")}
              {date && availabilityLoading && (
                <span className="inline-flex items-center gap-2">
                  <Loader2 aria-hidden className="h-3 w-3 animate-spin"  />
                  {locale === "fr" ? "Vérification…" : "Checking…"}
                </span>
              )}
              {date && !availabilityLoading && availabilityError && <span className="text-red-700">{availabilityError}</span>}
              {date && !availabilityLoading && !availabilityError && slots.length === 0 && <span>{closedReason ?? localReason(null, locale)}</span>}
              {date && !availabilityLoading && slots.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 aria-hidden className="h-3 w-3 text-champagne" />
                  {slots.length} {locale === "fr" ? "créneau(x) disponible(s)" : "slot(s) available"} · {timezone}
                </span>
              )}
            </div>
          </div>
        </div>

        {date && slots.length > 0 && (
          <fieldset>
            <legend className="field-label">{locale === "fr" ? "Choisissez un créneau *" : "Select a slot *"}</legend>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  aria-pressed={selectedTime === slot}
                  className={`min-h-10 border px-4 py-2.5 text-[11px] tracking-[0.08em] transition-colors ${
                    selectedTime === slot
                      ? "border-ink bg-ink text-cream"
                      : "border-line bg-white text-ink hover:border-champagne"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
            {!selectedTime && (
              <p className="mt-2 text-[10px] text-muted-light">
                {locale === "fr" ? "Sélectionnez une heure pour continuer." : "Select a time to continue."}
              </p>
            )}
          </fieldset>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="booking-name" className="field-label">{locale === "fr" ? "Nom complet *" : "Full name *"}</label>
            <input id="booking-name" name="fullName" required autoComplete="name" className="field" />
          </div>
          <div>
            <label htmlFor="booking-email" className="field-label">E-mail *</label>
            <input id="booking-email" name="email" type="email" required autoComplete="email" className="field" />
          </div>
          <div>
            <label htmlFor="booking-phone" className="field-label">{locale === "fr" ? "Téléphone *" : "Phone *"}</label>
            <input id="booking-phone" name="phone" type="tel" required autoComplete="tel" className="field" />
          </div>
          <div>
            <label htmlFor="booking-whatsapp" className="field-label">WhatsApp</label>
            <input id="booking-whatsapp" name="whatsapp" type="tel" className="field" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="booking-location" className="field-label">{locale === "fr" ? "Lieu du projet" : "Project location"}</label>
            <input id="booking-location" name="location" className="field" placeholder="Marrakech" />
          </div>
          <div>
            <label htmlFor="booking-budget" className="field-label">{locale === "fr" ? "Budget indicatif" : "Indicative budget"}</label>
            <input id="booking-budget" name="budget" className="field" placeholder={locale === "fr" ? "En MAD, si connu" : "In MAD, if known"} />
          </div>
        </div>

        <div>
          <label htmlFor="booking-description" className="field-label">{locale === "fr" ? "Décrivez votre projet *" : "Describe your project *"}</label>
          <textarea id="booking-description" name="description" rows={5} required className="field resize-y" placeholder={locale === "fr" ? "Contexte, objectifs, formats, nombre de jours, livrables attendus…" : "Context, goals, formats, number of days, expected deliverables…"} />
        </div>

        <div>
          <label htmlFor="booking-notes" className="field-label">{locale === "fr" ? "Informations complémentaires" : "Additional information"}</label>
          <textarea id="booking-notes" name="notes" rows={3} className="field resize-y" />
        </div>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[11.5px] leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#b08d57]" />
        <span>
          {locale === "fr"
            ? "J'accepte que mes informations soient utilisées uniquement pour traiter cette demande, conformément à la politique de confidentialité."
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

      <button type="submit" disabled={pending || !selectedTime} className="btn-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? (
          <>
            <Loader2 aria-hidden className="h-4 w-4 animate-spin"  />
            {locale === "fr" ? "Envoi en cours…" : "Sending…"}
          </>
        ) : (
          <>
            {locale === "fr" ? "Envoyer la demande" : "Send request"}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </>
        )}
      </button>
      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-light">
        {locale === "fr"
          ? "Demande sans engagement. La réservation est confirmée uniquement après validation par le studio."
          : "No-commitment request. The booking is confirmed only after the studio validates it."}
      </p>
    </form>
  );
}

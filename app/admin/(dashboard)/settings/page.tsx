import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import {
  createContactPhoneAction,
  createSocialLinkAction,
  deleteContactPhoneAction,
  deleteSocialLinkAction,
  updateContactSettingsAction,
  updateMapSettingsAction,
  updateSiteSettingsAction,
} from "@/app/admin/actions/settings";

export const metadata: Metadata = { title: "Réglages" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { id: "site", label: "Identité" },
  { id: "contact", label: "Coordonnées" },
  { id: "phones", label: "Téléphones" },
  { id: "socials", label: "Réseaux" },
  { id: "map", label: "Carte" },
  { id: "whatsapp", label: "WhatsApp" },
];

function SettingsToc({ className }: { className?: string }) {
  return (
    <nav aria-label="Sommaire des réglages" className={className}>
      <p className="eyebrow-gold">Sommaire</p>
      <ol className="mt-3 border-t border-line">
        {SECTIONS.map((section, index) => (
          <li key={section.id} className="border-b border-line">
            <a
              href={`#${section.id}`}
              className="flex min-h-10 items-center gap-3 py-2 text-[11.5px] text-muted transition-colors hover:text-ink"
            >
              <span className="text-[9px] tabular-nums text-muted-light">{String(index + 1).padStart(2, "0")}</span>
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const search = await searchParams;
  const [site, contact, map, phones, socials] = await Promise.all([
    prisma.siteSetting.findUnique({
      where: { id: 1 },
      include: { logoMedia: true, logoLightMedia: true, faviconMedia: true },
    }),
    prisma.contactSetting.findUnique({ where: { id: 1 } }),
    prisma.mapSetting.findUnique({ where: { id: 1 } }),
    prisma.contactPhone.findMany({ orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.socialLink.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);

  const readiness = [
    {
      label: "Identité visuelle",
      ok: Boolean(site?.logoMediaId),
      detail: site?.logoMediaId ? "Logo publié" : "Aucun logo publié",
    },
    {
      label: "Coordonnées",
      ok: Boolean(contact?.email || phones.some((phone) => phone.active)),
      detail: contact?.email
        ? contact.email
        : phones.some((phone) => phone.active)
          ? "Téléphone publié"
          : "E-mail et téléphone non renseignés",
    },
    {
      label: "Carte",
      ok: Boolean(map?.publicUrl || map?.embedUrl),
      detail: map?.embedUrl ? "Carte intégrée" : map?.publicUrl ? "Lien externe seulement" : "Aucune URL renseignée",
    },
    {
      label: "WhatsApp",
      ok: Boolean(site?.whatsappEnabled && site?.whatsappNumber),
      detail: site?.whatsappEnabled
        ? site.whatsappNumber
          ? "Bouton actif"
          : "Activé sans numéro"
        : "Bouton désactivé",
    },
  ];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Site"
        title="Réglages."
        description="Identité, coordonnées, WhatsApp, réseaux sociaux et carte. Les champs laissés vides restent absents du site public : aucune valeur de remplacement n'est inventée."
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Réglages du site enregistrés." />}
      {search.contactSaved === "1" && <AdminNotice tone="success" title="Coordonnées enregistrées." />}
      {search.mapSaved === "1" && <AdminNotice tone="success" title="Carte enregistrée." />}
      {search.phoneCreated === "1" && <AdminNotice tone="success" title="Numéro ajouté." />}
      {search.phoneDeleted === "1" && <AdminNotice tone="success" title="Numéro supprimé." />}
      {search.socialCreated === "1" && <AdminNotice tone="success" title="Réseau social ajouté." />}
      {search.socialDeleted === "1" && <AdminNotice tone="success" title="Réseau social supprimé." />}
      {typeof search.error === "string" && <AdminNotice tone="error" title={decodeURIComponent(search.error)} />}

      <section aria-label="État de la configuration" className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {readiness.map((item) => (
          <div key={item.label} className="bg-white px-4 py-3.5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted">{item.label}</p>
            <p className={item.ok ? "mt-1.5 text-[12px] text-emerald-800" : "mt-1.5 text-[12px] text-amber-800"}>
              {item.ok ? "Configuré" : "À compléter"}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted-light">{item.detail}</p>
          </div>
        ))}
      </section>

      <SettingsToc className="mb-6 xl:hidden" />

      <div className="grid gap-8 xl:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-[90px]">
            <SettingsToc />
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <AdminPanel
            id="site"
            className="scroll-mt-24"
            title="Identité du site"
            description="Nom publié, raison sociale, accroches et préférences globales."
          >
            <AdminForm action={updateSiteSettingsAction} submitLabel="Enregistrer le site" pendingLabel="Enregistrement…" compact>
              <FormGrid cols={2}>
                <Field label="Nom de l'entreprise" name="companyName" defaultValue={site?.companyName} required />
                <Field
                  label="Nom légal"
                  name="legalName"
                  defaultValue={site?.legalName}
                  help="Renseignez uniquement la raison sociale réelle. Laissez vide si elle ne doit pas être publiée."
                />
                <Field label="Accroche FR" name="taglineFr" defaultValue={site?.taglineFr} />
                <Field label="Accroche EN" name="taglineEn" defaultValue={site?.taglineEn} />
                <Field label="Description FR" name="descriptionFr" defaultValue={site?.descriptionFr} />
                <Field label="Description EN" name="descriptionEn" defaultValue={site?.descriptionEn} />
                <Field label="Fuseau horaire" name="timezone" defaultValue={site?.timezone ?? "Africa/Casablanca"} />
                <Field label="Devise" name="currency" defaultValue={site?.currency ?? "MAD"} />
                <Field
                  label="Rétention clients (jours)"
                  name="customerRetentionDays"
                  type="number"
                  defaultValue={site?.customerRetentionDays ?? 730}
                />
              </FormGrid>
              <div className="grid gap-5 sm:grid-cols-3">
                <MediaPicker name="logoMediaId" label="Logo" kind="IMAGE" selected={site?.logoMedia ?? null} />
                <MediaPicker name="logoLightMediaId" label="Logo clair" kind="IMAGE" selected={site?.logoLightMedia ?? null} />
                <MediaPicker name="faviconMediaId" label="Favicon" kind="IMAGE" selected={site?.faviconMedia ?? null} />
              </div>
              <div className="flex flex-wrap gap-5">
                <CheckboxField label="Mode maintenance" name="maintenanceMode" defaultChecked={site?.maintenanceMode} />
                <CheckboxField
                  label="Confirmation automatique des réservations"
                  name="bookingAutoConfirm"
                  defaultChecked={site?.bookingAutoConfirm}
                />
              </div>

              <div id="whatsapp" className="scroll-mt-24 border-t border-line/80 pt-5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">WhatsApp</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Le bouton public reste masqué tant que l&apos;option est désactivée ou que le numéro est vide.
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-5">
                    <CheckboxField label="Activer WhatsApp" name="whatsappEnabled" defaultChecked={site?.whatsappEnabled} />
                  </div>
                  <FormGrid cols={2}>
                    <Field
                      label="Numéro international"
                      name="whatsappNumber"
                      defaultValue={site?.whatsappNumber}
                      placeholder="+212…"
                      help="Format international complet, sans espace."
                    />
                    <SelectField label="Position" name="whatsappPosition" defaultValue={site?.whatsappPosition ?? "RIGHT"}>
                      <option value="LEFT">Gauche</option>
                      <option value="RIGHT">Droite</option>
                    </SelectField>
                    <Field
                      label="Pages (JSON array)"
                      name="whatsappPages"
                      defaultValue={JSON.stringify(site?.whatsappPages ?? ["all"])}
                      help='Exemple : ["all"] ou ["/fr","/fr/photo"]'
                    />
                  </FormGrid>
                  <FormGrid cols={2}>
                    <Field label="Message photo FR" name="whatsappPhotoFr" defaultValue={site?.whatsappPhotoFr} />
                    <Field label="Message photo EN" name="whatsappPhotoEn" defaultValue={site?.whatsappPhotoEn} />
                    <Field label="Message vidéo FR" name="whatsappVideoFr" defaultValue={site?.whatsappVideoFr} />
                    <Field label="Message vidéo EN" name="whatsappVideoEn" defaultValue={site?.whatsappVideoEn} />
                    <Field label="Message drone FR" name="whatsappDroneFr" defaultValue={site?.whatsappDroneFr} />
                    <Field label="Message drone EN" name="whatsappDroneEn" defaultValue={site?.whatsappDroneEn} />
                    <Field label="Message général FR" name="whatsappMessageFr" defaultValue={site?.whatsappMessageFr} />
                    <Field label="Message général EN" name="whatsappMessageEn" defaultValue={site?.whatsappMessageEn} />
                  </FormGrid>
                </div>
              </div>

              <div className="border-t border-line/80 pt-5">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">Pied de page</h3>
                <div className="mt-4 space-y-4">
                  <FormGrid>
                    <TextareaField label="Intro pied de page FR" name="footerIntroFr" defaultValue={site?.footerIntroFr} rows={2} />
                    <TextareaField label="Intro pied de page EN" name="footerIntroEn" defaultValue={site?.footerIntroEn} rows={2} />
                    <Field label="Copyright FR" name="copyrightFr" defaultValue={site?.copyrightFr} />
                    <Field label="Copyright EN" name="copyrightEn" defaultValue={site?.copyrightEn} />
                  </FormGrid>
                </div>
              </div>
            </AdminForm>
          </AdminPanel>

          <AdminPanel
            id="contact"
            className="scroll-mt-24"
            title="Coordonnées"
            description="E-mail, adresse et horaires affichés sur le site. Laissez vide ce qui n'est pas confirmé."
          >
            <AdminForm
              action={updateContactSettingsAction}
              submitLabel="Enregistrer les coordonnées"
              pendingLabel="Enregistrement…"
              compact
            >
              <FormGrid cols={2}>
                <Field label="E-mail" name="email" type="email" defaultValue={contact?.email} />
                <Field label="Adresse FR" name="addressFr" defaultValue={contact?.addressFr} />
                <Field label="Adresse EN" name="addressEn" defaultValue={contact?.addressEn} />
                <Field label="Horaires FR" name="hoursFr" defaultValue={contact?.hoursFr} />
                <Field label="Horaires EN" name="hoursEn" defaultValue={contact?.hoursEn} />
              </FormGrid>
              <TextareaField label="Intro contact FR" name="introFr" defaultValue={contact?.introFr} rows={2} />
              <TextareaField label="Intro contact EN" name="introEn" defaultValue={contact?.introEn} rows={2} />
            </AdminForm>
          </AdminPanel>

          <AdminPanel
            id="phones"
            className="scroll-mt-24"
            title="Numéros de téléphone"
            description="Plusieurs numéros, avec indication du numéro principal et WhatsApp."
          >
            <AdminForm action={createContactPhoneAction} submitLabel="Ajouter un numéro" pendingLabel="Ajout…" compact>
              <FormGrid cols={3}>
                <Field label="Libellé" name="label" placeholder="Bureau principal" required />
                <Field label="Numéro international" name="number" placeholder="+212…" required />
                <Field label="Ordre" name="displayOrder" type="number" defaultValue={0} />
              </FormGrid>
              <div className="flex flex-wrap gap-5">
                <CheckboxField label="Numéro principal" name="isPrimary" />
                <CheckboxField label="WhatsApp actif" name="whatsappEnabled" />
                <CheckboxField label="Actif" name="active" defaultChecked />
              </div>
            </AdminForm>

            {phones.length ? (
              <div className="admin-table-wrap mt-5">
                <table className="admin-table min-w-[720px]">
                  <caption className="sr-only">Numéros de téléphone enregistrés</caption>
                  <thead>
                    <tr>
                      <th scope="col">Libellé</th>
                      <th scope="col">Numéro</th>
                      <th scope="col">Ordre</th>
                      <th scope="col">Principal</th>
                      <th scope="col">WhatsApp</th>
                      <th scope="col">Actif</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phones.map((phone) => (
                      <tr key={phone.id}>
                        <td data-label="Libellé" className="text-ink">{phone.label}</td>
                        <td data-label="Numéro" className="font-mono text-[11px] text-muted">{phone.number}</td>
                        <td data-label="Ordre" className="text-muted">{phone.displayOrder}</td>
                        <td data-label="Principal" className="text-muted">{phone.isPrimary ? "Oui" : "Non"}</td>
                        <td data-label="WhatsApp" className="text-muted">{phone.whatsappEnabled ? "Oui" : "Non"}</td>
                        <td data-label="Actif" className="text-muted">{phone.active ? "Oui" : "Non"}</td>
                        <td data-label="Actions" data-actions className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/settings/phones/${phone.id}`}
                              className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:underline"
                            >
                              Modifier
                            </Link>
                            <form action={deleteContactPhoneAction}>
                              <input type="hidden" name="id" value={phone.id} />
                              <ConfirmSubmit
                                label="Supprimer"
                                confirmMessage={`Supprimer le numéro « ${phone.label} » ?`}
                                icon={false}
                              />
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 text-[12px] text-muted">
                Aucun numéro enregistré. Le site n&apos;affichera aucun téléphone tant que vous n&apos;en ajoutez pas.
              </p>
            )}
          </AdminPanel>

          <AdminPanel
            id="socials"
            className="scroll-mt-24"
            title="Réseaux sociaux"
            description="Liens affichés sous forme de libellés texte dans le pied de page et la page contact."
          >
            <AdminForm action={createSocialLinkAction} submitLabel="Ajouter un réseau" pendingLabel="Ajout…" compact>
              <FormGrid cols={3}>
                <Field label="Plateforme" name="platform" placeholder="Instagram" required />
                <Field label="URL" name="url" placeholder="https://…" required />
                <Field label="Libellé" name="label" />
                <Field label="Nom d'utilisateur" name="username" />
                <Field
                  label="Icône (héritée)"
                  name="icon"
                  placeholder="instagram"
                  help="Champ historique non utilisé : le site affiche les réseaux en texte."
                />
                <Field label="Ordre" name="sortOrder" type="number" defaultValue={0} />
              </FormGrid>
              <div className="flex flex-wrap gap-5">
                <CheckboxField label="Actif" name="active" defaultChecked />
                <CheckboxField label="Afficher dans l'en-tête" name="showHeader" />
                <CheckboxField label="Afficher dans le pied de page" name="showFooter" defaultChecked />
              </div>
            </AdminForm>

            {socials.length ? (
              <div className="admin-table-wrap mt-5">
                <table className="admin-table min-w-[760px]">
                  <caption className="sr-only">Réseaux sociaux enregistrés</caption>
                  <thead>
                    <tr>
                      <th scope="col">Plateforme</th>
                      <th scope="col">URL</th>
                      <th scope="col">Ordre</th>
                      <th scope="col">Actif</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {socials.map((link) => (
                      <tr key={link.id}>
                        <td data-label="Plateforme" className="text-ink">{link.platform}</td>
                        <td data-label="URL" className="font-mono text-[10.5px] text-muted">
                          <span className="line-clamp-1">{link.url}</span>
                        </td>
                        <td data-label="Ordre" className="text-muted">{link.sortOrder}</td>
                        <td data-label="Actif" className="text-muted">{link.active ? "Oui" : "Non"}</td>
                        <td data-label="Actions" data-actions className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/settings/socials/${link.id}`}
                              className="text-[10.5px] uppercase tracking-[0.1em] text-ink hover:underline"
                            >
                              Modifier
                            </Link>
                            <form action={deleteSocialLinkAction}>
                              <input type="hidden" name="id" value={link.id} />
                              <ConfirmSubmit
                                label="Supprimer"
                                confirmMessage={`Supprimer le lien ${link.platform} ?`}
                                icon={false}
                              />
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-5 text-[12px] text-muted">Aucun réseau social enregistré. Le pied de page n&apos;affichera aucun lien.</p>
            )}
          </AdminPanel>

          <AdminPanel
            id="map"
            className="scroll-mt-24"
            title="Google Maps"
            description="URL publique, URL d'intégration et coordonnées. Aucune adresse ni URL n'est préremplie."
          >
            <AdminForm action={updateMapSettingsAction} submitLabel="Enregistrer la carte" pendingLabel="Enregistrement…" compact>
              <div className="flex flex-wrap gap-5">
                <CheckboxField label="Afficher la carte" name="enabled" defaultChecked={map?.enabled ?? true} />
              </div>
              <FormGrid cols={2}>
                <Field
                  label="URL publique (Maps)"
                  name="publicUrl"
                  defaultValue={map?.publicUrl}
                  placeholder="https://maps.app.goo.gl/…"
                />
                <Field
                  label="URL d'intégration (embed)"
                  name="embedUrl"
                  defaultValue={map?.embedUrl}
                  help="Doit être une URL d'iframe valide. Laissez vide pour n'afficher que le lien."
                />
                <Field label="URL d'itinéraire" name="directionsUrl" defaultValue={map?.directionsUrl} />
                <Field label="Adresse FR" name="addressFr" defaultValue={map?.addressFr} />
                <Field label="Adresse EN" name="addressEn" defaultValue={map?.addressEn} />
                <Field label="Latitude" name="latitude" type="number" step="0.000001" defaultValue={map?.latitude ?? ""} />
                <Field label="Longitude" name="longitude" type="number" step="0.000001" defaultValue={map?.longitude ?? ""} />
                <Field label="Zoom" name="zoom" type="number" defaultValue={map?.zoom ?? 14} />
              </FormGrid>
            </AdminForm>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}

import type { Media, Testimonial } from "@prisma/client";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { createTestimonialAction, updateTestimonialAction } from "@/app/admin/actions/testimonials";

type Record = Testimonial & { photo: Media | null };

export function TestimonialForm({ testimonial }: { testimonial?: Record | null }) {
  const isEdit = Boolean(testimonial);
  return (
    <AdminForm
      action={isEdit ? updateTestimonialAction : createTestimonialAction}
      submitLabel={isEdit ? "Enregistrer" : "Créer le témoignage"}
      pendingLabel="Enregistrement…"
      cancelHref="/admin/testimonials"
    >
      {testimonial && <input type="hidden" name="id" value={testimonial.id} />}
      <AdminPanel title="Témoignage" description="Citation affichée sur le site dans les deux langues.">
        <div className="space-y-6">
          <FormGrid cols={2}>
            <Field label="Auteur" name="author" defaultValue={testimonial?.author} required />
            <Field label="Rôle / fonction" name="role" defaultValue={testimonial?.role} />
            <Field label="Ordre" name="sortOrder" type="number" defaultValue={testimonial?.sortOrder ?? 0} />
          </FormGrid>
          <TextareaField label="Citation FR" name="quoteFr" defaultValue={testimonial?.quoteFr} rows={4} required />
          <TextareaField label="Citation EN" name="quoteEn" defaultValue={testimonial?.quoteEn} rows={4} required />
          <div className="flex flex-wrap gap-5">
            <CheckboxField label="Actif" name="active" defaultChecked={testimonial?.active ?? true} />
            <CheckboxField label="Mis en avant" name="featured" defaultChecked={testimonial?.featured} />
          </div>
          <MediaPicker name="photoId" label="Photo" kind="IMAGE" selected={testimonial?.photo ?? null} />
        </div>
      </AdminPanel>
    </AdminForm>
  );
}

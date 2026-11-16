import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("admin-card", className)}>
      {(title || description || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            {title && <h2 className="font-serif text-2xl leading-tight text-ink">{title}</h2>}
            {description && <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function FormGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={cn("grid gap-4", cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>{children}</div>;
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  help,
  disabled,
  step,
  min,
  max,
  autoComplete,
  className,
  id,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  help?: string;
  disabled?: boolean;
  step?: string;
  min?: string | number;
  max?: string | number;
  autoComplete?: string;
  className?: string;
  id?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="admin-label">{label}{required && <span className="text-champagne"> *</span>}</span>
      <input
        id={id}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        autoComplete={autoComplete}
        className="admin-input disabled:bg-stone disabled:text-muted"
      />
      {help && <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-light">{help}</span>}
    </label>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  rows = 4,
  placeholder,
  required,
  help,
  className,
  mono,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  help?: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="admin-label">{label}{required && <span className="text-champagne"> *</span>}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className={cn("admin-input resize-y", mono && "font-mono text-[12px] leading-relaxed")}
      />
      {help && <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-light">{help}</span>}
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  children,
  required,
  help,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  children: ReactNode;
  required?: boolean;
  help?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="admin-label">{label}{required && <span className="text-champagne"> *</span>}</span>
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className="admin-input">
        {children}
      </select>
      {help && <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-light">{help}</span>}
    </label>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  help,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  help?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-1 text-[12.5px] leading-relaxed text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 shrink-0 accent-[#b08d57]" />
      <span>
        {label}
        {help && <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted-light">{help}</span>}
      </span>
    </label>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="border-t border-line/80 pt-5 first:border-0 first:pt-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">{title}</h3>
      {description && <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

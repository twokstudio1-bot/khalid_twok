"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function SlugInput({
  name,
  sourceId,
  defaultValue = "",
  placeholder = "slug-de-la-page",
  required = true,
}: {
  name: string;
  sourceId: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [touched, setTouched] = useState(Boolean(defaultValue));

  return (
    <label className="block">
      <span className="admin-label">Slug{required && <span className="text-champagne"> *</span>}</span>
      <input
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => {
          setTouched(true);
          setValue(toSlug(event.target.value));
        }}
        onFocus={() => {
          if (!touched) {
            const source = document.getElementById(sourceId) as HTMLInputElement | null;
            if (source?.value) setValue(toSlug(source.value));
          }
        }}
        className={cn("admin-input font-mono text-[12.5px]")}
      />
      <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-light">
        Utilisé dans l&apos;URL publique. Le slug est normalisé automatiquement.
      </span>
    </label>
  );
}

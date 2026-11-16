"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Search, Video, X } from "lucide-react";
import type { AdminMediaView } from "@/lib/media-view";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  label: string;
  selected?: AdminMediaView | null;
  kind?: "IMAGE" | "VIDEO";
  help?: string;
};

export function MediaPicker({ name, label, selected: initial, kind, help }: Props) {
  const [selected, setSelected] = useState<AdminMediaView | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminMediaView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const chooseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (kind) params.set("kind", kind);
      fetch(`/api/admin/media?${params.toString()}`, { signal: controller.signal, cache: "no-store" })
        .then(async (response) => {
          if (!response.ok) throw new Error("request failed");
          const payload = (await response.json()) as { items?: AdminMediaView[] };
          setItems(Array.isArray(payload.items) ? payload.items : []);
        })
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setError("Impossible de charger la médiathèque.");
        })
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, kind]);

  function closeDialog() {
    setOpen(false);
    window.requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
      else changeRef.current?.focus();
    });
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div>
      <span className="admin-label">{label}</span>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      {selected ? (
        <div className="flex items-stretch gap-3 border border-line bg-white p-2">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden bg-stone">
            {selected.thumbnailUrl || selected.kind === "IMAGE" ? (
              <img src={selected.thumbnailUrl ?? selected.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center"><Video aria-hidden className="h-5 w-5 text-muted"  /></span>
            )}
          </div>
          <div className="min-w-0 flex-1 py-1">
            <p className="truncate text-[12.5px] text-ink">{selected.originalName}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted">{selected.kind} {selected.width && selected.height ? `· ${selected.width}×${selected.height}` : ""}</p>
            <div className="mt-2 flex gap-3 text-[10.5px]">
              <button
                ref={changeRef}
                type="button"
                onClick={(event) => {
                  triggerRef.current = event.currentTarget;
                  setOpen(true);
                }}
                className="inline-flex min-h-10 items-center underline underline-offset-2 text-ink"
              >
                Changer
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  window.requestAnimationFrame(() => chooseRef.current?.focus());
                }}
                className="inline-flex min-h-10 items-center text-muted hover:text-ink"
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          ref={chooseRef}
          type="button"
          onClick={(event) => {
            triggerRef.current = event.currentTarget;
            setOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 border border-dashed border-line bg-white px-4 py-6 text-[11px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-champagne hover:text-ink"
        >
          <ImageIcon aria-hidden className="h-4 w-4"  /> Choisir un média
        </button>
      )}
      {help && <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-light">{help}</span>}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-ink/45" onClick={closeDialog} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Médiathèque" className="relative flex max-h-[85vh] w-full max-w-4xl flex-col border border-line bg-cream shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow-gold">Médiathèque</p>
                <h2 className="mt-1 font-serif text-2xl text-ink">Choisir un média</h2>
              </div>
              <button type="button" onClick={closeDialog} className="flex h-10 w-10 items-center justify-center border border-line bg-white" aria-label="Fermer">
                <X aria-hidden className="h-4 w-4"  />
              </button>
            </div>
            <div className="border-b border-line px-5 py-3">
              <div className="relative">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"  />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher par nom, alt ou dossier…"
                  className="admin-input pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <p className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted"><Loader2 aria-hidden className="h-4 w-4 animate-spin"  /> Chargement…</p>
              ) : error ? (
                <p className="py-12 text-center text-[12px] text-red-700">{error}</p>
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-[12px] text-muted">Aucun média trouvé.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelected(item);
                        closeDialog();
                      }}
                      className={cn(
                        "group border bg-white p-2 text-left transition-colors hover:border-champagne",
                        selected?.id === item.id ? "border-champagne" : "border-line",
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-stone">
                        {item.thumbnailUrl || item.kind === "IMAGE" ? (
                          <img src={item.thumbnailUrl ?? item.url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        ) : (
                          <span className="flex h-full items-center justify-center"><Video aria-hidden className="h-6 w-6 text-muted"  /></span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-[10.5px] text-ink">{item.originalName}</p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-light">{item.kind}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

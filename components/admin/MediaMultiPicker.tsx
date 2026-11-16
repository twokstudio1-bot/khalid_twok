"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImageIcon, Loader2, Search, Trash2, Video, X } from "lucide-react";
import type { AdminMediaView } from "@/lib/media-view";

export function MediaMultiPicker({
  name,
  label,
  initial = [],
  kind,
  help,
}: {
  name: string;
  label: string;
  initial?: AdminMediaView[];
  kind?: "IMAGE" | "VIDEO";
  help?: string;
}) {
  const [selected, setSelected] = useState<AdminMediaView[]>(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<AdminMediaView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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
          setItems([]);
          setError("Impossible de charger la médiathèque.");
        })
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, kind]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog();
        return;
      }
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

  function closeDialog() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function toggle(item: AdminMediaView) {
    setSelected((current) => {
      const exists = current.some((entry) => entry.id === item.id);
      return exists ? current.filter((entry) => entry.id !== item.id) : [...current, item];
    });
  }

  function move(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="admin-label">{label}</span>
        <span className="text-[10px] text-muted">{selected.length} sélectionné(s)</span>
      </div>
      {selected.map((item) => (
        <input key={item.id} type="hidden" name={name} value={item.id} />
      ))}

      {selected.length > 0 ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {selected.map((item, index) => (
            <li key={item.id} className="border border-line bg-white p-2">
              <div className="relative aspect-[4/3] overflow-hidden bg-stone">
                {item.thumbnailUrl || item.kind === "IMAGE" ? (
                  <img src={item.thumbnailUrl ?? item.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center"><Video aria-hidden className="h-5 w-5 text-muted"  /></span>
                )}
                <span className="absolute left-1.5 top-1.5 bg-ink/75 px-1.5 py-0.5 text-[9px] text-cream">{index + 1}</span>
              </div>
              <p className="mt-1.5 truncate text-[10px] text-ink">{item.originalName}</p>
              <div className="mt-1 flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="flex h-10 w-10 items-center justify-center border border-line disabled:opacity-30" aria-label="Monter">
                  <ArrowUp aria-hidden className="h-3.5 w-3.5"  />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} className="flex h-10 w-10 items-center justify-center border border-line disabled:opacity-30" aria-label="Descendre">
                  <ArrowDown aria-hidden className="h-3.5 w-3.5"  />
                </button>
                <button type="button" onClick={() => toggle(item)} className="ml-auto flex h-10 w-10 items-center justify-center border border-line text-red-700" aria-label="Retirer">
                  <Trash2 aria-hidden className="h-3.5 w-3.5"  />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-line bg-white px-4 py-5 text-center text-[11px] text-muted">Aucun média sélectionné.</p>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex min-h-10 items-center gap-1.5 border border-line bg-white px-3 py-2 text-[10.5px] uppercase tracking-[0.12em] text-ink hover:border-champagne"
      >
        <ImageIcon aria-hidden className="h-3.5 w-3.5"  /> Ajouter des médias
      </button>
      {help && <span className="mt-1 block text-[10.5px] leading-relaxed text-muted-light">{help}</span>}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-ink/45" onClick={closeDialog} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Médiathèque" className="relative flex max-h-[85vh] w-full max-w-4xl flex-col border border-line bg-cream shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow-gold">Médiathèque</p>
                <h2 className="mt-1 font-serif text-2xl text-ink">Sélection multiple</h2>
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
                  placeholder="Rechercher…"
                  aria-label="Rechercher un média"
                  className="admin-input pl-9"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5" aria-busy={loading}>
              {loading ? (
                <p className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted"><Loader2 aria-hidden className="h-4 w-4 animate-spin"  /> Chargement…</p>
              ) : error ? (
                <p role="alert" className="py-12 text-center text-[12px] text-red-700">{error}</p>
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-[12px] text-muted">Aucun média trouvé.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {items.map((item) => {
                    const active = selected.some((entry) => entry.id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item)}
                        aria-pressed={active}
                        className={`border p-2 text-left transition-colors ${active ? "border-champagne bg-[#fbf4e8]" : "border-line bg-white hover:border-champagne"}`}
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-stone">
                          {item.thumbnailUrl || item.kind === "IMAGE" ? (
                            <img src={item.thumbnailUrl ?? item.url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full items-center justify-center"><Video aria-hidden className="h-5 w-5 text-muted"  /></span>
                          )}
                          {active && <span className="absolute right-1.5 top-1.5 bg-champagne px-1.5 py-0.5 text-[9px] text-ink">Ajouté</span>}
                        </div>
                        <p className="mt-2 truncate text-[10.5px] text-ink">{item.originalName}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-4">
              <span className="text-[11px] text-muted">{selected.length} média(s) sélectionné(s)</span>
              <button type="button" onClick={closeDialog} className="admin-btn">Terminer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { searchAddresses, type BanSuggestion } from "@/lib/ban";

/**
 * Champ d'adresse avec autocomplete BAN (Base Adresse Nationale).
 *
 * - L'utilisateur tape dans l'input comme d'habitude (le champ reste entièrement
 *   éditable à la main si la BAN ne propose pas ce qu'il cherche).
 * - À partir de 3 caractères, on interroge la BAN avec debounce 250ms.
 * - Un dropdown affiche jusqu'à 5 suggestions.
 * - Click / Entrée / flèches pour sélectionner.
 * - La sélection remplit addressLine1 + postalCode + city via onSelect.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  required,
}: {
  /** Valeur textuelle du champ adresse (ligne 1). */
  value: string;
  /** Appelé à chaque frappe. */
  onChange: (value: string) => void;
  /** Appelé quand l'utilisateur choisit une suggestion. */
  onSelect: (suggestion: BanSuggestion) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}) {
  const uid = useId();
  const inputId = id ?? uid;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<BanSuggestion[]>([]);
  const [highlighted, setHighlighted] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // On ignore l'API tant que l'utilisateur n'a pas "vraiment" tapé (pour ne pas
  // interroger la BAN quand on pré-remplit une valeur depuis un profile existant).
  const userTypedRef = useRef(false);

  useEffect(() => {
    if (!userTypedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      searchAddresses(q, { limit: 5, signal: ctrl.signal }).then((res) => {
        if (ctrl.signal.aborted) return;
        setSuggestions(res);
        setOpen(res.length > 0);
        setHighlighted(0);
        setLoading(false);
      });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function pick(s: BanSuggestion) {
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
    userTypedRef.current = false; // évite de relancer une requête sur la valeur qu'on vient d'injecter
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        id={inputId}
        required={required}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          userTypedRef.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Laisser le temps au click d'un item de se déclencher avant de fermer.
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
        className="pr-10"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-400">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
      </div>

      {open && suggestions.length > 0 ? (
        <div className="absolute z-20 top-full left-0 right-0 mt-2 surface p-1 max-h-72 overflow-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.label}-${i}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // évite le blur de l'input avant notre click
                pick(s);
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={
                "w-full text-left px-3 py-2 rounded-xl text-small transition-colors flex items-start gap-2.5 " +
                (i === highlighted
                  ? "bg-brand-500/10 text-brand-600"
                  : "text-ink-900 hover:bg-surface-2")
              }
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-ink-500" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium truncate">{s.addressLine1}</span>
                <span className="block text-xs text-ink-500 truncate">
                  {s.postalCode} {s.city}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

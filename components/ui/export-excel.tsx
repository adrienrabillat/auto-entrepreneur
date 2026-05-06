"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, ChevronDown, Check } from "lucide-react";

/**
 * Bouton "Exporter Excel" — télécharge un .xlsx à 3 onglets (Factures,
 * URSSAF, Récap par mois) depuis /api/export/xlsx.
 *
 * Sprint 4 : ajout d'un dropdown de sélection d'exercice fiscal.
 *  - "Toutes années"   → /api/export/xlsx
 *  - "2026", "2025"... → /api/export/xlsx?year=YYYY
 *
 * Les années proposées sont chargées depuis /api/export/years (= années où
 * le user a au moins une facture). Le défaut sélectionné est l'année en
 * cours si elle est dans la liste, sinon "Toutes années". Le composant est
 * tolérant aux erreurs de fetch : si l'endpoint /years ne répond pas, on
 * retombe sur le bouton simple "Exporter" sans selecteur.
 */
export function ExportExcelButton({
  label = "Exporter en Excel",
  variant = "secondary",
  size = "sm",
  endpoint = "/api/export/xlsx",
}: {
  label?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  endpoint?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Liste des années disponibles. null = pas encore chargé. [] = aucune.
  const [years, setYears] = useState<number[] | null>(null);
  // Année sélectionnée. null = "Toutes années".
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Charge la liste des années dispo au montage. On reste tolérant : si
  // l'endpoint plante, on log et on reste sur "Toutes années" en silence.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/export/years");
        if (!res.ok) return;
        const data = (await res.json()) as { years?: number[]; current?: number };
        if (cancelled) return;
        const list = Array.isArray(data.years) ? data.years : [];
        setYears(list);
        // Pré-sélection : année courante si présente dans la liste, sinon
        // la plus récente, sinon "Toutes années".
        const current = data.current;
        if (current != null && list.includes(current)) {
          setSelectedYear(current);
        } else if (list.length > 0) {
          setSelectedYear(list[0]);
        }
      } catch {
        // Ignore — on reste sur le mode "Toutes années" par défaut.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fermeture du menu au clic extérieur ou Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function exportNow(year: number | null) {
    setBusy(true);
    setError(null);
    setMenuOpen(false);
    try {
      const url = year != null ? `${endpoint}?year=${year}` : endpoint;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Erreur ${res.status}`);
      }
      const blob = await res.blob();
      // Récupère le filename depuis Content-Disposition.
      const cd = res.headers.get("content-disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `compta-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  // Texte affiché dans le bouton principal.
  const yearLabel = selectedYear != null ? String(selectedYear) : "Toutes années";

  // Si on n'a pas encore d'années chargées OU qu'il n'y en a aucune, on
  // affiche un bouton simple sans dropdown (rétrocompat + cas vide).
  const showDropdown = years != null && years.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap" ref={menuRef}>
      {error ? <span className="text-small text-danger-600">{error}</span> : null}

      {showDropdown ? (
        <div className="relative inline-flex">
          {/* Bouton principal : déclenche l'export pour l'année sélectionnée. */}
          <Button
            variant={variant}
            size={size}
            onClick={() => exportNow(selectedYear)}
            disabled={busy}
            className="rounded-r-none"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            {busy ? "Génération…" : `${label} · ${yearLabel}`}
          </Button>
          {/* Bouton dropdown : ouvre la liste des années. */}
          <Button
            variant={variant}
            size={size}
            onClick={() => setMenuOpen((v) => !v)}
            disabled={busy}
            aria-label="Choisir l'année à exporter"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-l-none border-l border-ink-100 px-2"
          >
            <ChevronDown size={14} className={menuOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </Button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-30 min-w-[12rem] rounded-2xl bg-surface shadow-pop border border-ink-100 overflow-hidden"
            >
              <YearOption
                label="Toutes années"
                active={selectedYear === null}
                onClick={() => {
                  setSelectedYear(null);
                  setMenuOpen(false);
                }}
              />
              <div className="h-px bg-ink-100" />
              {years.map((y) => (
                <YearOption
                  key={y}
                  label={String(y)}
                  active={selectedYear === y}
                  onClick={() => {
                    setSelectedYear(y);
                    setMenuOpen(false);
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <Button variant={variant} size={size} onClick={() => exportNow(null)} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
          {busy ? "Génération…" : label}
        </Button>
      )}
    </div>
  );
}

function YearOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className={
        "flex w-full items-center justify-between px-3 py-2 text-small transition-colors " +
        (active
          ? "bg-brand-500/10 text-brand-700 font-semibold"
          : "text-ink-700 hover:bg-surface-2")
      }
    >
      <span>{label}</span>
      {active ? <Check size={14} /> : null}
    </button>
  );
}

"use client";

/**
 * Petit chip cliquable utilisé en haut de wizard pour basculer entre 2 modes
 * (ex: "Mes clients (N)" / "Saisir à la main"). Identique entre invoices et
 * quotes pour garantir l'uniformité visuelle des deux flows.
 *
 * Style :
 *  - inactif : bg-surface-2 + texte ink-700, hover bleuté
 *  - actif   : bg-brand-500 (rempli) + texte blanc + shadow-pop
 *  - disabled : opacity 40%
 */
export function ToggleChip({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all " +
        (active
          ? "bg-brand-500 text-white shadow-pop"
          : "bg-surface-2 text-ink-700 hover:bg-brand-500/10 hover:text-brand-600 disabled:opacity-40")
      }
    >
      {icon}
      {label}
    </button>
  );
}

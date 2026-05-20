import Link from "next/link";
import {
  ExternalLink,
  FileText,
  HelpCircle,
  Receipt,
  Settings,
  Upload,
} from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Page "Plus" — destination de l'onglet "Plus" de la bottom-nav mobile.
 * Regroupe les fonctionnalités consultées peu souvent mais essentielles :
 * URSSAF (1×/mois), Profil & paramètres (rare), Import, Aide, Légal.
 *
 * Sur desktop la sidebar pointe directement vers ces écrans — cette page
 * reste accessible (utile en deep-link) mais n'est pas la voie d'accès
 * principale en grand format.
 */

type Tile = {
  href: string;
  label: string;
  hint: string;
  icon: typeof Receipt;
  /** Lien externe : ouvre dans un nouvel onglet. */
  external?: boolean;
};

// Toutes les tuiles dans un seul ensemble, mêmes traitement visuel.
// Ordre : URSSAF (déclaration = action métier la plus structurante de la
// page) → Profil (identité de l'AE, utilisée à chaque facture) → Importer
// (one-shot) → puis ressources légales et aide.
const tiles: Tile[] = [
  {
    href: "/declarations",
    label: "URSSAF",
    hint: "Déclarations et historique",
    icon: Receipt,
  },
  {
    href: "/settings",
    label: "Profil",
    hint: "Identité, IBAN, mentions",
    icon: Settings,
  },
  {
    href: "/import",
    label: "Importer",
    hint: "Factures existantes",
    icon: Upload,
  },
  {
    href: "/legal",
    label: "Mentions légales",
    hint: "CGU · Confidentialité",
    icon: FileText,
  },
  {
    // Lien officiel exigé par le partenariat URSSAF / TDAE — couvre les
    // informations sur le statut, le caractère obligatoire des cotisations,
    // leur rôle, et les éléments liés au droit du travail. Auparavant dans
    // le footer landing, déplacé ici en mai 2026 pour rester proche du
    // contexte où l'utilisateur déclare (espace authentifié, à côté de
    // la tuile URSSAF qui ouvre /declarations).
    href: "https://www.autoentrepreneur.urssaf.fr",
    label: "L'essentiel du statut",
    hint: "autoentrepreneur.urssaf.fr",
    icon: HelpCircle,
    external: true,
  },
];

export default function MorePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-h1">Plus</h1>
        <p className="mt-1 text-small text-ink-500">
          Tout ce que tu consultes moins souvent — déclarations URSSAF, profil,
          import, aide.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((t) => (
          <TileLink key={t.href} tile={t} />
        ))}
      </div>

      {/* Déconnexion en bas, traitée à part car form POST. Visuellement
          séparée pour éviter un clic accidentel depuis la grille. */}
      <form action="/auth/signout" method="post" className="pt-2 flex justify-center">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-small font-medium text-danger-600 bg-danger-500/10 hover:bg-danger-500/20 transition-colors"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}

function TileLink({ tile }: { tile: Tile }) {
  const { href, label, hint, icon: Icon, external } = tile;

  const content = (
    <>
      <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 font-medium text-ink-900 text-small">
          {label}
          {external ? <ExternalLink size={12} className="text-ink-400" /> : null}
        </div>
        <div className="text-xs text-ink-500 truncate">{hint}</div>
      </div>
    </>
  );

  const className =
    "surface p-3.5 flex flex-col items-start gap-2.5 hover:bg-surface-2 transition-colors min-h-[110px]";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

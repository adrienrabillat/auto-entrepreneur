import Link from "next/link";
import { ArrowLeft, FileText, Lock, Receipt, ScrollText } from "lucide-react";
import { isPlaceholder } from "@/lib/legal-config";

/**
 * Layout des pages légales — public (accessible sans authentification).
 *
 * Header sobre avec retour à l'accueil + nav latérale entre les 3 docs
 * (Mentions Légales, CGU, Confidentialité). Footer minimaliste.
 *
 * Si la config est encore en mode placeholder (SAS pas créée), un bandeau
 * d'avertissement s'affiche en haut de chaque page.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-page text-ink-900">
      <header className="border-b border-divider bg-surface">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-small text-ink-700 hover:text-ink-900 transition-colors"
          >
            <ArrowLeft size={14} />
            Retour à Asthia
          </Link>
          <nav className="flex items-center gap-1 text-small">
            <Link
              href="/legal/mentions-legales"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-surface-2 transition-colors"
            >
              <ScrollText size={14} />
              Mentions légales
            </Link>
            <Link
              href="/legal/cgu"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-surface-2 transition-colors"
            >
              <FileText size={14} />
              CGU
            </Link>
            <Link
              href="/legal/cgv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-surface-2 transition-colors"
            >
              <Receipt size={14} />
              CGV
            </Link>
            <Link
              href="/legal/confidentialite"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-surface-2 transition-colors"
            >
              <Lock size={14} />
              Confidentialité
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {isPlaceholder() ? (
          <div className="rounded-2xl bg-warn-500/10 border border-warn-500/30 p-3.5 mb-6 text-small text-warn-700">
            <strong>Document en cours de finalisation.</strong> La société
            éditrice est en cours de création — les mentions légales seront
            mises à jour dès l&apos;immatriculation. Jusque-là, certaines
            informations sont marquées comme &laquo; à compléter &raquo;.
          </div>
        ) : null}
        {children}
      </main>

      <footer className="border-t border-divider mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 text-xs text-ink-500 flex items-center justify-between flex-wrap gap-2">
          <div>© {new Date().getFullYear()} Asthia — Tous droits réservés</div>
          <div className="flex items-center gap-4">
            <Link href="/legal/mentions-legales" className="hover:text-ink-700 transition-colors">
              Mentions légales
            </Link>
            <Link href="/legal/cgu" className="hover:text-ink-700 transition-colors">
              CGU
            </Link>
            <Link href="/legal/cgv" className="hover:text-ink-700 transition-colors">
              CGV
            </Link>
            <Link href="/legal/confidentialite" className="hover:text-ink-700 transition-colors">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

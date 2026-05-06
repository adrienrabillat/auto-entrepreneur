import Link from "next/link";
import { ScrollText, FileText, Lock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Informations légales — Asthia",
  description: "Mentions légales, CGU et politique de confidentialité d'Asthia.",
};

/**
 * Page index /legal — point d'entrée vers les 3 docs légales.
 * Sert aussi de page de découverte (l'utilisateur arrive ici depuis
 * le footer).
 */
export default function LegalIndex() {
  const docs = [
    {
      href: "/legal/mentions-legales",
      icon: ScrollText,
      title: "Mentions légales",
      desc:
        "Identification de l'éditeur du site, hébergeur, propriété intellectuelle. Document obligatoire au titre de la LCEN.",
    },
    {
      href: "/legal/cgu",
      icon: FileText,
      title: "Conditions Générales d'Utilisation",
      desc:
        "Règles d'usage du Service, responsabilités de chacun, conditions de résiliation. À lire avant de créer un compte.",
    },
    {
      href: "/legal/confidentialite",
      icon: Lock,
      title: "Politique de confidentialité",
      desc:
        "Quelles données nous collectons, pourquoi, et comment exercer vos droits RGPD.",
    },
  ] as const;

  return (
    <div>
      <h1 className="text-h1 mb-2">Informations légales</h1>
      <p className="text-body text-ink-500 mb-8">
        Tout ce qui concerne le cadre juridique d&apos;Asthia : qui édite le
        site, dans quelles conditions vous l&apos;utilisez, et ce qu&apos;on
        fait de vos données.
      </p>

      <ul className="space-y-3">
        {docs.map(({ href, icon: Icon, title, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-start gap-4 surface p-5 hover:shadow-pop transition-shadow group"
            >
              <div className="h-11 w-11 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600 shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-h3 text-ink-900">{title}</h2>
                <p className="mt-1 text-small text-ink-500">{desc}</p>
              </div>
              <ArrowRight
                size={18}
                className="text-ink-400 group-hover:text-brand-600 transition-colors mt-1 shrink-0"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

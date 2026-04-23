import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "../form";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Clients
      </Link>
      <h1 className="text-h1 mt-3">
        <span className="text-gradient-brand">Nouveau client</span>
      </h1>
      <p className="mt-1 text-small text-ink-500">
        Particulier ou professionnel — les infos seront réutilisées lors de la création d&apos;une facture.
      </p>
      <div className="mt-6">
        <ClientForm mode="create" />
      </div>
    </div>
  );
}

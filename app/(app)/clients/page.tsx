import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Plus, Users, Building2, User as UserIcon } from "lucide-react";
import { DeleteClientButton } from "./row-delete";

export const dynamic = "force-dynamic";

type ClientRow = {
  id: string;
  is_pro: boolean;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  siren: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  country: string;
};

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clients = [] } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });
  const list = (clients ?? []) as ClientRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1">Clients</h1>
          <p className="mt-1 text-small text-ink-500">
            Ton carnet d&apos;adresses. Tu peux le sélectionner dans une nouvelle facture
            pour pré-remplir les informations du client.
          </p>
        </div>
        <Link href="/clients/new" className="sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            <Plus size={18} />
            Nouveau client
          </Button>
        </Link>
      </div>

      <div className="surface overflow-hidden">
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <ul>
            {list.map((c) => (
              <li key={c.id} className="relative group border-b border-ink-100 last:border-0">
                <Link
                  href={`/clients/${c.id}`}
                  className="row-hover flex items-center gap-3 px-4 py-4 md:px-5"
                >
                  <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-subtle text-brand-600">
                    {c.is_pro ? <Building2 size={18} /> : <UserIcon size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink-900 truncate">
                        {displayLabel(c)}
                      </span>
                      {c.is_pro ? <Badge tone="brand">Pro</Badge> : <Badge tone="neutral">Particulier</Badge>}
                    </div>
                    <div className="mt-0.5 text-small text-ink-500 truncate">
                      {c.email}
                      {c.city ? ` · ${c.city}` : ""}
                      {c.siren ? ` · SIREN ${c.siren}` : ""}
                    </div>
                  </div>
                  <div className="w-9 shrink-0" aria-hidden />
                </Link>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <DeleteClientButton id={c.id} label={displayLabel(c)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function displayLabel(c: ClientRow): string {
  if (c.is_pro && c.company_name) {
    const who = [c.first_name, c.last_name].filter(Boolean).join(" ");
    return who ? `${c.company_name} — ${who}` : c.company_name;
  }
  const full = [c.first_name, c.last_name].filter(Boolean).join(" ");
  return full || c.email;
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient-subtle">
        <Users className="text-brand-600" size={22} />
      </div>
      <p className="text-body font-semibold text-ink-900">Aucun client pour l&apos;instant.</p>
      <p className="mt-1 text-small text-ink-500">
        Ajoute un premier client pour le retrouver facilement dans tes prochaines factures.
      </p>
      <div className="mt-4">
        <Link href="/clients/new">
          <Button>
            <Plus size={16} />
            Nouveau client
          </Button>
        </Link>
      </div>
    </div>
  );
}

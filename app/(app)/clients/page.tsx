import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { Plus, Users, Building2 } from "lucide-react";
import { DeleteClientButton } from "./row-delete";
import { initialsFrom } from "@/lib/initials";
import { ExportExcelButton } from "@/components/ui/export-excel";

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
  const user = await getCurrentUser();

  const { data: clients = [] } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", user!.id)
    .eq("archived", false)
    .order("created_at", { ascending: false });
  const list = (clients ?? []) as ClientRow[];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-h1">Clients</h1>
          <p className="mt-1 text-small text-ink-500">
            Ton carnet d&apos;adresses. Tu peux le sélectionner dans une nouvelle facture
            pour pré-remplir les informations du client.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <ExportExcelButton
            endpoint="/api/export/clients"
            label="Exporter"
          />
          <Link href="/clients/new" className="pill pill-primary">
            <Plus size={16} />
            Nouveau client
          </Link>
        </div>
      </div>

      <div className="surface p-2">
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <ul>
            {list.map((c) => {
              const label = displayLabel(c);
              return (
                <li key={c.id} className="relative group">
                  <Link
                    href={`/clients/${c.id}`}
                    className="grid grid-cols-[auto_1fr_auto] gap-3.5 items-center px-3.5 py-3 rounded-2xl row-hover"
                  >
                    <div className="avatar">
                      {c.is_pro ? <Building2 size={16} /> : initialsFrom(label)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-medium text-ink-900 truncate">{label}</span>
                        <span className={`status-dot ${c.is_pro ? "paid" : "draft"}`}>
                          <span className="d" aria-hidden />
                          {c.is_pro ? "Pro" : "Particulier"}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-ink-500 truncate">
                        {c.email}
                        {c.city ? ` · ${c.city}` : ""}
                        {c.siren ? ` · SIREN ${c.siren}` : ""}
                      </div>
                    </div>
                    <div className="w-8 shrink-0" aria-hidden />
                  </Link>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <DeleteClientButton id={c.id} label={label} />
                  </div>
                </li>
              );
            })}
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
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-500/10 text-brand-600">
        <Users size={22} />
      </div>
      <p className="text-body font-medium text-ink-900">Aucun client pour l&apos;instant.</p>
      <p className="mt-1 text-small text-ink-500">
        Ajoute un premier client pour le retrouver facilement dans tes prochaines factures.
      </p>
      <div className="mt-4">
        <Link href="/clients/new" className="pill pill-primary">
          <Plus size={16} />
          Nouveau client
        </Link>
      </div>
    </div>
  );
}


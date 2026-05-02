import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { ClientForm } from "../form";
import { DeleteClientSection } from "./delete-section";
import { clientDisplayLabel } from "@/lib/display-name";

export const dynamic = "force-dynamic";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!client) notFound();

  const deleteLabel = clientDisplayLabel(client);

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Clients
      </Link>
      <h1 className="text-h1 mt-3">
        <span className="text-gradient-brand">Modifier le client</span>
      </h1>
      <div className="mt-6">
        <ClientForm
          mode="edit"
          clientId={client.id}
          defaultValues={{
            is_pro: client.is_pro ?? false,
            first_name: client.first_name ?? "",
            last_name: client.last_name ?? "",
            company_name: client.company_name ?? "",
            siren: client.siren ?? "",
            email: client.email ?? "",
            phone: client.phone ?? "",
            address_line1: client.address_line1 ?? "",
            address_line2: client.address_line2 ?? "",
            postal_code: client.postal_code ?? "",
            city: client.city ?? "",
            country: client.country ?? "France",
            notes: client.notes ?? "",
          }}
        />
      </div>
      <DeleteClientSection id={client.id} label={deleteLabel} />
    </div>
  );
}

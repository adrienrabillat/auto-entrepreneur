"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

type Values = {
  is_pro: boolean;
  first_name: string;
  last_name: string;
  company_name: string;
  siren: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
  notes: string;
};

const EMPTY: Values = {
  is_pro: false,
  first_name: "",
  last_name: "",
  company_name: "",
  siren: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "France",
  notes: "",
};

export function ClientForm({
  mode,
  clientId,
  defaultValues,
}: {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: Values;
}) {
  const router = useRouter();
  const [v, setV] = useState<Values>(defaultValues ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) {
        throw new Error("Email invalide");
      }
      const cleanSiren = v.siren.replace(/\s/g, "");
      if (v.is_pro && cleanSiren && !/^\d{9}$/.test(cleanSiren)) {
        throw new Error("SIREN client : 9 chiffres attendus");
      }
      const body = { ...v, siren: cleanSiren };
      const url = mode === "create" ? "/api/clients" : `/api/clients/${clientId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || `Erreur ${res.status}`);
      router.push("/clients");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="space-y-5">
        <div>
          <Label htmlFor="is_pro">Type de client</Label>
          <div className="inline-flex bg-surface-2 p-1 rounded-full w-full">
            <button
              type="button"
              onClick={() => setV({ ...v, is_pro: false })}
              className={
                !v.is_pro
                  ? "flex-1 h-10 rounded-full bg-surface text-ink-900 shadow-hair text-small font-medium"
                  : "flex-1 h-10 rounded-full text-ink-500 hover:text-ink-900 text-small font-medium transition-colors"
              }
            >
              Particulier
            </button>
            <button
              type="button"
              onClick={() => setV({ ...v, is_pro: true })}
              className={
                v.is_pro
                  ? "flex-1 h-10 rounded-full bg-surface text-ink-900 shadow-hair text-small font-medium"
                  : "flex-1 h-10 rounded-full text-ink-500 hover:text-ink-900 text-small font-medium transition-colors"
              }
            >
              Professionnel
            </button>
          </div>
        </div>

        {v.is_pro ? (
          <>
            <div>
              <Label htmlFor="company_name">Raison sociale</Label>
              <Input
                id="company_name"
                required
                value={v.company_name}
                onChange={(e) => setV({ ...v, company_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="siren" hint="9 chiffres — requis pour un pro (obligation 2026)">SIREN</Label>
              <Input
                id="siren"
                inputMode="numeric"
                value={v.siren}
                onChange={(e) => setV({ ...v, siren: e.target.value.replace(/\D/g, "").slice(0, 9) })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" hint="optionnel">Prénom du contact</Label>
                <Input id="first_name" value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="last_name" hint="optionnel">Nom du contact</Label>
                <Input id="last_name" value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" required value={v.first_name} onChange={(e) => setV({ ...v, first_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" required value={v.last_name} onChange={(e) => setV({ ...v, last_name: e.target.value })} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="phone" hint="optionnel">Téléphone</Label>
            <Input id="phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="address_line1" hint="obligatoire pour un pro">Adresse</Label>
            <Input id="address_line1" value={v.address_line1} onChange={(e) => setV({ ...v, address_line1: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Input aria-label="Complément" value={v.address_line2} onChange={(e) => setV({ ...v, address_line2: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="postal_code">Code postal</Label>
            <Input id="postal_code" value={v.postal_code} onChange={(e) => setV({ ...v, postal_code: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input id="city" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
          </div>
        </div>

        <div>
          <Label htmlFor="notes" hint="optionnel">Notes internes</Label>
          <Textarea id="notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </div>

        {error ? <p className="text-small text-danger-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : mode === "create" ? "Créer le client" : "Enregistrer"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

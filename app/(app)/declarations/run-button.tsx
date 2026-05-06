"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Lets a user trigger their own previous-month declaration on demand
 * (e.g. to test before the cron fires, or to re-run a failed one).
 */
export function RunMyDeclaration() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/declarations/run-mine", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-small text-danger-600">{error}</span> : null}
      {/* Sprint 5 — label raccourci de "Lancer ma déclaration maintenant"
          à "Lancer la déclaration" pour que les deux CTA (Exporter Excel
          + Lancer) tiennent sur la même ligne sans wrap. */}
      <Button variant="primary" size="sm" onClick={run} disabled={busy}>
        {busy ? "Envoi…" : "Lancer la déclaration"}
      </Button>
    </div>
  );
}

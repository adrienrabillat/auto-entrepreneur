"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/feedback";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function ReconnectGmailButton() {
  const [loading, setLoading] = useState(false);
  // Sprint 5 : remplacement de l'alert() natif par une bannière d'erreur
  // inline cohérente avec le reste de l'app.
  const [error, setError] = useState<string | null>(null);

  async function reconnect() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/settings");

    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        scopes: SCOPES,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    });
    if (authErr) {
      setLoading(false);
      setError(`Reconnexion impossible : ${authErr.message}`);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" size="sm" onClick={reconnect} disabled={loading}>
        {loading ? "Redirection…" : "Reconnecter Gmail"}
      </Button>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
    </div>
  );
}

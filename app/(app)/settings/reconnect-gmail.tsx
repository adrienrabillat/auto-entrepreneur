"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function ReconnectGmailButton() {
  const [loading, setLoading] = useState(false);

  async function reconnect() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", "/settings");

    const { error } = await supabase.auth.signInWithOAuth({
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
    if (error) {
      setLoading(false);
      alert("Reconnexion impossible : " + error.message);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={reconnect} disabled={loading}>
      {loading ? "Redirection…" : "Reconnecter Gmail"}
    </Button>
  );
}

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

// gmail.send lets us send messages on the user's behalf.
// userinfo.email/profile give us the basic identity for login.
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function LoginButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = new URL("/auth/callback", window.location.origin);
    if (next) redirectTo.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        scopes: SCOPES,
        queryParams: {
          // access_type=offline + prompt=consent are required to get a refresh token
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setLoading(false);
      alert("Connexion impossible : " + error.message);
    }
  }

  return (
    <Button size="lg" onClick={signIn} disabled={loading}>
      {/* Google G mark */}
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.4 35 26.8 36 24 36c-5.4 0-9.9-3.5-11.5-8.2l-6.6 5.1C9.3 39.6 16.1 44 24 44z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C41.7 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/>
      </svg>
      {loading ? "Connexion…" : "Se connecter avec Google"}
    </Button>
  );
}

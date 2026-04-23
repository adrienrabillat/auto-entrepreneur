"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, LogOut } from "lucide-react";

/**
 * Gate de sécurité Face ID / Touch ID.
 *
 * Logique:
 *  - L'utilisateur est déjà authentifié Google (sinon le layout (app) l'aurait redirigé).
 *  - Si aucun passkey n'est enregistré pour lui → on rend directement les enfants (pas de gate).
 *  - Sinon on exige un startAuthentication() réussi dans les 60 minutes dernières
 *    (stocké dans sessionStorage). Fermer l'onglet / la PWA vide le flag.
 */
const UNLOCK_TTL_MS = 60 * 60 * 1000;
const STORAGE_KEY = "asthia_unlocked_at";

type Status = "checking" | "open" | "locked" | "unlocking" | "error";

export function LockGate({
  hasPasskey,
  children,
}: {
  hasPasskey: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(hasPasskey ? "checking" : "open");
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    setError(null);
    setStatus("unlocking");
    try {
      const optsRes = await fetch("/api/passkey/assert-options", { method: "POST" });
      if (!optsRes.ok) {
        if (optsRes.status === 404) {
          // Plus de passkeys côté serveur → on déverrouille (cas limite: l'user a supprimé ses passkeys ailleurs)
          sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
          setStatus("open");
          return;
        }
        throw new Error("Impossible d'initier l'authentification.");
      }
      const options = await optsRes.json();
      const response = await startAuthentication(options);

      const verifyRes = await fetch("/api/passkey/assert-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });
      const vj = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(vj.error || "Authentification échouée.");

      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
      setStatus("open");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inattendue";
      if (/NotAllowedError|cancel/i.test(msg)) {
        setStatus("locked");
        setError(null);
      } else {
        setStatus("error");
        setError(msg);
      }
    }
  }, []);

  // Check initial : est-ce qu'on a déjà un unlock récent ?
  useEffect(() => {
    if (!hasPasskey) {
      setStatus("open");
      return;
    }
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const at = raw ? Number(raw) : 0;
    if (at && Date.now() - at < UNLOCK_TTL_MS) {
      setStatus("open");
    } else {
      // Auto-déclenche le prompt Face ID. iOS l'autorise sans geste user-visible
      // car il s'agit d'un usage "gate d'app PWA" (pas d'un login cross-origin).
      unlock();
    }
  }, [hasPasskey, unlock]);

  if (status === "open") {
    return <>{children}</>;
  }

  async function signOut() {
    await fetch("/auth/signout", { method: "POST" });
    sessionStorage.removeItem(STORAGE_KEY);
    router.replace("/");
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-white p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-brand-gradient text-white shadow-pop">
          <Fingerprint size={36} />
        </div>
        <h1 className="mt-5 text-h2 font-extrabold text-ink-900">Déverrouiller Asthia</h1>
        <p className="mt-1 text-small text-ink-500">
          {status === "checking"
            ? "Un instant…"
            : status === "unlocking"
              ? "Confirme avec Face ID / Touch ID…"
              : status === "error"
                ? error || "Erreur inattendue."
                : "Confirme avec Face ID / Touch ID pour accéder à tes factures."}
        </p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={unlock}
            disabled={status === "unlocking" || status === "checking"}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-body font-semibold text-white bg-brand-gradient shadow-pop disabled:opacity-60"
          >
            {status === "unlocking" || status === "checking" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Fingerprint size={16} />
            )}
            {status === "unlocking" || status === "checking" ? "Vérification…" : "Déverrouiller"}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-small font-semibold text-ink-600 hover:bg-ink-100"
          >
            <LogOut size={14} /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

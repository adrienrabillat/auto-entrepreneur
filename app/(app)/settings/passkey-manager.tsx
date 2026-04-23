"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck, Trash2, Loader2, AlertTriangle } from "lucide-react";

type Passkey = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
};

/**
 * Active Face ID / Touch ID comme verrou de 2ᵉ niveau au-dessus de la
 * session Google. Un passkey = un appareil. On peut en enregistrer plusieurs
 * (iPhone + iPad par ex.).
 */
export function PasskeyManager() {
  const [list, setList] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState<"enroll" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/passkey");
    const json = await res.json().catch(() => ({ passkeys: [] }));
    setList(json.passkeys ?? []);
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window !== "undefined") {
      const ok = typeof window.PublicKeyCredential !== "undefined";
      setSupported(ok);
    }
  }, [refresh]);

  async function enroll() {
    setBusy("enroll");
    setError(null);
    try {
      const optsRes = await fetch("/api/passkey/register-options", { method: "POST" });
      if (!optsRes.ok) throw new Error("Impossible de démarrer l'enregistrement.");
      const options = await optsRes.json();

      const credential = await startRegistration(options);
      const deviceName = guessDeviceName();

      const verifyRes = await fetch("/api/passkey/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credential, deviceName }),
      });
      const vj = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(vj.error || "Vérification échouée.");
      await refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inattendue";
      if (/user|cancel|NotAllowedError/i.test(msg)) {
        setError("Enregistrement annulé.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce passkey ? Tu devras re-Face-ID depuis cet appareil.")) return;
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/passkey", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Suppression impossible.");
      // Si c'était le dernier → retirer le flag "Face ID requis"
      const after = (list ?? []).filter((p) => p.id !== id);
      if (after.length === 0 && typeof window !== "undefined") {
        sessionStorage.removeItem("asthia_unlocked_at");
      }
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setBusy(null);
    }
  }

  if (!supported) {
    return (
      <div className="surface p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-warn-50 text-warn-700">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="font-semibold text-ink-900">Face ID / Touch ID</div>
            <div className="text-small text-ink-500">
              Ce navigateur ne supporte pas WebAuthn. Utilise Safari sur iPhone ou Chrome / Edge sur Mac/PC.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const has = (list?.length ?? 0) > 0;

  return (
    <div className="surface p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 grid place-items-center rounded-2xl bg-brand-gradient-subtle text-brand-700">
          <Fingerprint size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-900">Verrou Face ID / Touch ID</span>
            {has ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-success-50 text-success-700 ring-1 ring-inset ring-success-200">
                Actif
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                Désactivé
              </span>
            )}
          </div>
          <div className="text-small text-ink-500">
            {has
              ? "À chaque ouverture, un Face ID / Touch ID est demandé avant d'accéder à tes factures."
              : "Ajoute une 2ᵉ couche de sécurité biométrique au-dessus de la connexion Google."}
          </div>
        </div>
      </div>

      {list === null ? (
        <div className="text-small text-ink-500 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : list.length ? (
        <ul className="divide-y divide-ink-100">
          {list.map((p) => (
            <li key={p.id} className="py-3 flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 grid place-items-center rounded-xl bg-ink-50 text-ink-600 shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink-900 truncate">{p.device_name || "Appareil"}</div>
                <div className="text-xs text-ink-500">
                  Activé le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  {p.last_used_at
                    ? ` · Utilisé ${new Date(p.last_used_at).toLocaleDateString("fr-FR")}`
                    : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={busy !== null}
                className="h-9 w-9 shrink-0 grid place-items-center rounded-xl text-ink-400 hover:bg-danger-50 hover:text-danger-600 transition"
                title="Supprimer ce passkey"
              >
                {busy === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-danger-50 ring-1 ring-inset ring-danger-200 p-3 text-small text-danger-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end pt-1">
        <Button variant={has ? "secondary" : "primary"} onClick={enroll} disabled={busy !== null}>
          {busy === "enroll" ? (
            <><Loader2 size={14} className="animate-spin" /> Enregistrement…</>
          ) : (
            <><Fingerprint size={14} /> {has ? "Ajouter cet appareil" : "Activer Face ID / Touch ID"}</>
          )}
        </Button>
      </div>
    </div>
  );
}

function guessDeviceName(): string {
  if (typeof navigator === "undefined") return "Appareil";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "PC Windows";
  return "Appareil";
}

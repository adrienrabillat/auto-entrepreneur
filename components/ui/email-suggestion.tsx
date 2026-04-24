"use client";

import { useState, useEffect, useRef } from "react";
import { suggestEmailFix } from "@/lib/email-check";

/**
 * Feedback sous un champ email :
 *  1. Suggestion de correction d'une faute de frappe (gmial → gmail),
 *     détectée localement via distance de Damerau-Levenshtein.
 *  2. Si aucune typo détectée : vérifie au serveur que le domaine a
 *     bien des records MX (c-à-d accepte du courrier). Déclenché sur blur
 *     du champ, avec debounce 600ms pour ne pas spammer l'API si l'user
 *     revient/repart vite.
 *
 * Usage :
 *   <Input value={email} onChange={...} onBlur={...} />
 *   <EmailSuggestion email={email} onAccept={setEmail} />
 *
 *   OU (avec trigger explicite sur blur) :
 *   <EmailSuggestion email={email} onAccept={setEmail} onBlur={blurred} />
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function EmailSuggestion({
  email,
  onAccept,
}: {
  email: string;
  onAccept: (fixedEmail: string) => void;
}) {
  const [dismissedTypo, setDismissedTypo] = useState<string | null>(null);
  const [mxState, setMxState] = useState<
    { status: "idle" } | { status: "checking" } | { status: "ok"; email: string } | { status: "bad"; email: string; domain: string }
  >({ status: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Réinitialise l'état de dismiss quand l'email change.
  useEffect(() => {
    if (dismissedTypo && email !== dismissedTypo) setDismissedTypo(null);
  }, [email, dismissedTypo]);

  // MX check avec debounce 600ms — déclenché dès que le format est valide
  // ET qu'il n'y a pas de typo évidente en attente de correction.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setMxState({ status: "idle" });
      return;
    }
    const typo = suggestEmailFix(clean);
    if (typo && dismissedTypo !== clean) {
      // On priorise la suggestion typo, le MX check viendra après acceptation/ignore.
      setMxState({ status: "idle" });
      return;
    }

    setMxState({ status: "checking" });
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/validate-email?email=${encodeURIComponent(clean)}`);
        if (!res.ok) {
          setMxState({ status: "idle" });
          return;
        }
        const data = (await res.json()) as { ok: boolean; domain?: string; reason?: string };
        if (data.ok) {
          setMxState({ status: "ok", email: clean });
        } else {
          setMxState({ status: "bad", email: clean, domain: data.domain ?? clean.split("@")[1] });
        }
      } catch {
        setMxState({ status: "idle" });
      }
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [email, dismissedTypo]);

  const typoSuggestion = suggestEmailFix(email);
  const showTypo = Boolean(typoSuggestion && dismissedTypo !== email);

  if (showTypo && typoSuggestion) {
    return (
      <p className="mt-1.5 text-xs text-ink-500">
        Voulez-vous dire{" "}
        <button
          type="button"
          onClick={() => onAccept(typoSuggestion)}
          className="font-medium text-brand-600 hover:text-brand-700 underline underline-offset-2"
        >
          {typoSuggestion}
        </button>
        {" "}?
        <button
          type="button"
          onClick={() => setDismissedTypo(email)}
          className="ml-2 text-ink-400 hover:text-ink-600"
          aria-label="Ignorer la suggestion"
        >
          ×
        </button>
      </p>
    );
  }

  if (mxState.status === "bad" && mxState.email === email.trim().toLowerCase()) {
    return (
      <p className="mt-1.5 text-xs text-warn-600">
        Le domaine <span className="font-medium">{mxState.domain}</span> ne semble pas accepter les emails — vérifie l&apos;orthographe.
      </p>
    );
  }

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SavedToast } from "@/components/ui/feedback";

/**
 * SavedFlash — affiche un SavedToast pendant 2,5 s si l'URL contient le
 * paramètre `?saved=1`, puis nettoie le paramètre de l'URL pour qu'un
 * refresh ne réaffiche pas le toast indéfiniment.
 *
 * Pattern utilisé après une édition (PATCH) : la page form pousse
 * `router.push("/invoices/{id}?saved=1")`, la page détail (qui est server-
 * rendered) inclut <SavedFlash /> et le toast apparaît une fois.
 *
 * Plus discret que SuccessOverlay (réservé aux créations) — convient bien
 * aux modifications de brouillons / éditions diverses.
 */
export function SavedFlash({ message = "Modifications enregistrées" }: { message?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchParams?.get("saved") === "1") {
      setVisible(true);
      // Retire le query param sans relancer de navigation (replace + scroll
      // false). Évite que le toast reflashe sur back/forward.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("saved");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SavedToast
      visible={visible}
      message={message}
      onDone={() => setVisible(false)}
    />
  );
}

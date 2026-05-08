"use client";

import { useEffect } from "react";

/**
 * Marque tous les messages inbound du thread comme lus, en POSTant sur
 * `/api/messages/[id]/read` après le mount. Composant invisible — il
 * n'affiche rien, c'est juste un effet de bord côté client.
 *
 * On le fait en client plutôt qu'en server component parce que :
 *  - server components ne devraient pas muter de données.
 *  - on ne veut pas marquer comme lu dès qu'on génère le HTML pour le
 *    SSR — uniquement quand le user a réellement ouvert la page (le mount
 *    côté client est le bon signal).
 */
export function MarkReadOnMount({ threadId }: { threadId: string }) {
  useEffect(() => {
    fetch(`/api/messages/${threadId}/read`, { method: "POST" }).catch(() => {
      // Silencieux : si la requête fail le pire qui arrive c'est que le
      // compteur d'unread reste à jour au prochain refresh.
    });
  }, [threadId]);
  return null;
}

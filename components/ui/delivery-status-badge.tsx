import { CheckCircle2, Eye, AlertTriangle, OctagonAlert, Mail, Clock } from "lucide-react";

/**
 * Badge qui affiche le statut de livraison d'un email tracké.
 *
 * Les statuts possibles correspondent à l'enum `delivery_status` en DB,
 * alimenté par les events Resend reçus via webhook
 * /api/webhooks/resend-events.
 *
 * Hiérarchie d'affichage (du plus innocent au plus alarmant) :
 *   pending → sent → delivered → opened → bounced/failed → complained
 *
 * Note UX : le tracking d'ouverture (Resend pixel) ne marche pas dans
 * 100 % des cas — Apple Mail privacy bloque le pixel, certains clients
 * Outlook désactivent les images par défaut. Donc absence de "ouvert"
 * ne veut pas dire "pas lu". On le mentionne en tooltip.
 */

export type DeliveryStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "bounced"
  | "complained"
  | "failed"
  | null
  | undefined;

type Variant = {
  label: string;
  Icon: typeof CheckCircle2;
  classes: string;
  title: string;
};

const VARIANTS: Record<NonNullable<DeliveryStatus>, Variant> = {
  pending: {
    label: "En attente",
    Icon: Clock,
    classes: "bg-ink-100 text-ink-600",
    title: "Pas encore envoyé",
  },
  sent: {
    label: "Envoyée",
    Icon: Mail,
    classes: "bg-brand-500/10 text-brand-700",
    title: "Envoyée à Resend, en cours de remise au destinataire",
  },
  delivered: {
    label: "Délivrée",
    Icon: CheckCircle2,
    classes: "bg-success-500/10 text-success-700",
    title: "Acceptée par le serveur du destinataire",
  },
  opened: {
    label: "Ouverte",
    Icon: Eye,
    classes: "bg-success-500/15 text-success-800 font-semibold",
    title: "Au moins une ouverture détectée (certains clients mail bloquent ce tracking)",
  },
  bounced: {
    label: "Rejet",
    Icon: AlertTriangle,
    classes: "bg-warn-500/15 text-warn-800",
    title: "Email rejeté par le serveur du destinataire (mauvaise adresse, boîte pleine, etc.)",
  },
  complained: {
    label: "Spam",
    Icon: OctagonAlert,
    classes: "bg-danger-500/15 text-danger-700 font-semibold",
    title: "Le destinataire a signalé l'email comme spam — affecte la deliverability future",
  },
  failed: {
    label: "Échec",
    Icon: AlertTriangle,
    classes: "bg-danger-500/10 text-danger-600",
    title: "Erreur définitive lors de l'envoi",
  },
};

export function DeliveryStatusBadge({
  status,
  size = "md",
  showLabel = true,
}: {
  status: DeliveryStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  if (!status || status === "pending") return null;
  const variant = VARIANTS[status];
  if (!variant) return null;
  const { label, Icon, classes, title } = variant;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-small px-2.5 py-1";
  const iconSize = size === "sm" ? 12 : 14;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClass} ${classes}`}
      title={title}
    >
      <Icon size={iconSize} aria-hidden />
      {showLabel ? label : null}
    </span>
  );
}

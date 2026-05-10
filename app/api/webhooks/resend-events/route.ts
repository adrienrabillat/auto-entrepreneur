import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Webhook Resend events — tracking de la livraison des emails sortants.
 *
 * Configuration côté Resend :
 *  - Resend → Webhooks → Add Endpoint
 *  - URL : https://www.asthia.fr/api/webhooks/resend-events
 *  - Events à cocher :
 *      ✓ email.sent
 *      ✓ email.delivered
 *      ✓ email.delivery_delayed
 *      ✓ email.bounced
 *      ✓ email.complained
 *      ✓ email.opened
 *      ✓ email.clicked
 *      ✓ email.failed
 *  - Copier le Signing Secret → variable d'env `RESEND_EVENTS_WEBHOOK_SECRET`
 *
 * Note : on utilise un secret DIFFÉRENT du webhook inbound
 * (`RESEND_WEBHOOK_SECRET`) pour pouvoir révoquer indépendamment.
 *
 * Logique :
 *  - On vérifie la signature Svix.
 *  - On lit `event.type` et `event.data.email_id`.
 *  - On cherche dans invoices, quotes, messages le row qui a ce
 *    `resend_email_id`. Le premier qui matche reçoit l'update.
 *  - On met à jour le timestamp (delivered_at, opened_at, etc.) et le
 *    `delivery_status` selon une priorité fixe.
 */

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"
  | "email.failed"
  | "email.scheduled";

type ResendEventPayload = {
  type?: ResendEventType;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    subject?: string;
    bounce?: { message?: string; subType?: string };
    click?: { ipAddress?: string; link?: string; userAgent?: string };
  };
};

// Priorité : un statut "haut" ne peut PAS être écrasé par un statut "bas".
// Ex: si on est déjà 'opened' et qu'un event 'delivered' tardif arrive,
// on n'écrase pas. Sauf 'complained' qui prime sur tout.
const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  bounced: 4,
  failed: 4,
  complained: 5, // toujours prioritaire
};

// Map event Resend -> { status, timestampColumn }
const EVENT_MAP: Record<
  string,
  { status: string; timestampCol?: string } | null
> = {
  "email.sent": { status: "sent" },
  "email.delivered": { status: "delivered", timestampCol: "delivered_at" },
  "email.delivery_delayed": null, // on ignore (statut transitoire)
  "email.opened": { status: "opened", timestampCol: "opened_at" },
  "email.clicked": null, // pas de statut dédié, on log juste
  "email.bounced": { status: "bounced", timestampCol: "bounced_at" },
  "email.complained": { status: "complained", timestampCol: "complained_at" },
  "email.failed": { status: "failed" },
  "email.scheduled": null,
};

export async function POST(req: NextRequest) {
  // ─── 1. Vérification de la signature Svix ───────────────────────────
  const secret = process.env.RESEND_EVENTS_WEBHOOK_SECRET;
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  const rawBody = await req.text();

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[resend-events] RESEND_EVENTS_WEBHOOK_SECRET non défini en prod — refus");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
    }
    console.warn("[resend-events] RESEND_EVENTS_WEBHOOK_SECRET non défini (mode dev)");
  } else {
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing Svix headers" }, { status: 401 });
    }
    const tsSec = parseInt(svixTimestamp, 10);
    if (!Number.isFinite(tsSec) || Math.abs(Date.now() / 1000 - tsSec) > 300) {
      return NextResponse.json({ error: "Timestamp out of range" }, { status: 401 });
    }
    const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    let secretBuf: Buffer;
    try {
      secretBuf = Buffer.from(rawSecret, "base64");
    } catch {
      return NextResponse.json({ error: "Bad secret encoding" }, { status: 500 });
    }
    const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expected = crypto.createHmac("sha256", secretBuf).update(signedPayload).digest("base64");
    const candidates = svixSignature.split(" ").map((s) => s.trim()).filter((s) => s.startsWith("v1,")).map((s) => s.slice(3));
    const ok = candidates.some((cand) => {
      const a = Buffer.from(cand);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
    if (!ok) {
      console.warn("[resend-events] Signature Svix invalide");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ─── 2. Parse + dispatch ────────────────────────────────────────────
  let payload: ResendEventPayload;
  try {
    payload = JSON.parse(rawBody) as ResendEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.type;
  const emailId = payload.data?.email_id;
  if (!eventType || !emailId) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing type or email_id" });
  }

  const mapped = EVENT_MAP[eventType];
  if (!mapped) {
    // Event qu'on n'utilise pas (delivery_delayed, scheduled, clicked).
    // On accuse réception sans rien faire.
    return NextResponse.json({ ok: true, ignored: true, type: eventType });
  }

  // ─── 3. Update DB ───────────────────────────────────────────────────
  const admin = createAdminClient();
  const eventTimestamp = payload.data?.created_at || new Date().toISOString();

  // On essaie chaque table dans l'ordre. Premier match l'emporte.
  const tables = ["invoices", "quotes", "messages"] as const;
  let updatedTable: string | null = null;
  for (const table of tables) {
    const { data: row, error: fetchErr } = await admin
      .from(table)
      .select("id, delivery_status")
      .eq("resend_email_id", emailId)
      .maybeSingle();
    if (fetchErr) {
      console.warn(`[resend-events] fetch ${table} failed:`, fetchErr.message);
      continue;
    }
    if (!row) continue;

    // Calcul du nouveau statut selon priorité.
    const currentPriority = STATUS_PRIORITY[row.delivery_status as string] ?? 0;
    const newPriority = STATUS_PRIORITY[mapped.status] ?? 0;
    const newStatus =
      newPriority >= currentPriority ? mapped.status : row.delivery_status;

    const patch: Record<string, unknown> = {
      delivery_status: newStatus,
      last_event_at: eventTimestamp,
    };
    if (mapped.timestampCol) {
      patch[mapped.timestampCol] = eventTimestamp;
    }

    const { error: updErr } = await admin
      .from(table)
      .update(patch)
      .eq("id", row.id);
    if (updErr) {
      console.warn(`[resend-events] update ${table} failed:`, updErr.message);
      continue;
    }
    updatedTable = table;
    break;
  }

  if (!updatedTable) {
    // Pas trouvé : peut être un mail envoyé en dehors d'Asthia (ex:
    // un test depuis Resend dashboard, ou un mail système). On accuse
    // réception sans erreur.
    console.log(
      `[resend-events] event ${eventType} pour email_id ${emailId} : aucun row matché`,
    );
    return NextResponse.json({ ok: true, matched: false });
  }

  return NextResponse.json({ ok: true, matched: true, table: updatedTable, status: mapped.status });
}

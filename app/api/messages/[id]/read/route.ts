import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/messages/[id]/read
 *
 * Marque tous les messages inbound non lus du thread comme lus
 * (`read_at = now`) et reset `unread_count` du thread à 0.
 *
 * Appelée par le composant <MarkReadOnMount> quand l'utilisateur ouvre
 * une conversation. Pas de body, l'id du thread est dans l'URL.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const nowIso = new Date().toISOString();

  // Update messages — RLS garantit qu'on ne touche que ses propres
  // messages.
  await supabase
    .from("messages")
    .update({ read_at: nowIso })
    .eq("thread_id", params.id)
    .eq("direction", "inbound")
    .is("read_at", null);

  // Reset compteur thread.
  await supabase
    .from("message_threads")
    .update({ unread_count: 0 })
    .eq("id", params.id);

  return NextResponse.json({ ok: true });
}

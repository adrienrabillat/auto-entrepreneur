import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/ai/polish-description
 *
 * Body: { text: string }
 * Returns: { polished: string }
 *
 * Takes a rough invoice-line description and asks Mistral to return a clean,
 * professional French version suitable for a factoring PDF. Auth-gated so
 * that only signed-in users burn our API credits. The model used is
 * `mistral-small-latest` — the cheapest tier, more than enough for short
 * invoice descriptions.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La clé Mistral n'est pas configurée côté serveur." },
      { status: 500 }
    );
  }

  let body: { text?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const raw = typeof body.text === "string" ? body.text.trim() : "";
  if (!raw) return NextResponse.json({ error: "Texte vide" }, { status: 400 });
  if (raw.length > 1500) {
    return NextResponse.json({ error: "Description trop longue (max 1500 caractères)" }, { status: 400 });
  }

  const system =
    "Tu es un assistant qui reformule des descriptions de prestations pour des factures françaises d'auto-entrepreneurs. " +
    "Ta mission : corriger l'orthographe et la grammaire, rendre le texte clair, professionnel et factuel, sans jargon marketing. " +
    "Conserve strictement le sens et les détails factuels (dates, lieux, quantités, noms propres). " +
    "Ne rajoute rien qui n'est pas dans l'original. Ne mets pas de guillemets autour de la réponse. " +
    "Reste concis — une à deux phrases maximum, sauf si l'original est déjà plus long. " +
    "Réponds UNIQUEMENT avec le texte reformulé, sans préambule ni commentaire.";

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: raw },
        ],
      }),
      // Mistral responds fast but we still want a sane timeout.
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Mistral ${res.status}: ${errText.slice(0, 200) || "échec"}` },
        { status: 502 }
      );
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const polished = payload.choices?.[0]?.message?.content?.trim();
    if (!polished) {
      return NextResponse.json({ error: "Réponse Mistral vide" }, { status: 502 });
    }
    return NextResponse.json({ polished });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

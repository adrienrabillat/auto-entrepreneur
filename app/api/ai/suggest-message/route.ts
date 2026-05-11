import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/ai/suggest-message
 *
 * Génère ou améliore un message à un client.
 *
 * Body :
 *   {
 *     mode: "generate" | "improve",
 *     clientName?: string | null,
 *     clientEmail?: string,
 *     // contexte optionnel — si présent, l'IA en tient compte
 *     invoiceNumber?: string,
 *     quoteNumber?: string,
 *     // En mode "generate" : intention courte de l'AE en français
 *     // ("relance impayée", "demande des nouvelles", "envoi document").
 *     // En mode "improve" : le draft actuel à reformuler.
 *     prompt?: string,
 *     currentSubject?: string,
 *     currentText?: string,
 *   }
 *
 * Réponse : { subject: string, text: string }
 *
 * Le profil de l'AE (display_name, métier) est récupéré côté serveur
 * et injecté dans le prompt système pour que la signature soit
 * cohérente.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "La clé Mistral n'est pas configurée côté serveur." },
      { status: 500 },
    );
  }

  let body: {
    mode?: unknown;
    clientName?: unknown;
    clientEmail?: unknown;
    invoiceNumber?: unknown;
    quoteNumber?: unknown;
    prompt?: unknown;
    currentSubject?: unknown;
    currentText?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const mode = body.mode === "improve" ? "improve" : "generate";
  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim() : "";
  const invoiceNumber = typeof body.invoiceNumber === "string" ? body.invoiceNumber.trim() : "";
  const quoteNumber = typeof body.quoteNumber === "string" ? body.quoteNumber.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const currentSubject = typeof body.currentSubject === "string" ? body.currentSubject.trim() : "";
  const currentText = typeof body.currentText === "string" ? body.currentText.trim() : "";

  // Récupération du profil pour la signature (display_name + métier).
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, business_name, metier")
    .eq("id", user.id)
    .single();
  const senderName =
    profile?.business_name?.trim() || profile?.display_name?.trim() || "Moi";
  const senderTrade = profile?.metier?.trim() || "";

  // Validation : on doit avoir au moins de quoi travailler.
  if (mode === "generate" && !prompt && !invoiceNumber && !quoteNumber) {
    return NextResponse.json(
      { error: "Précise une intention (ex: 'relance impayée') ou un document de contexte." },
      { status: 400 },
    );
  }
  if (mode === "improve" && !currentText) {
    return NextResponse.json(
      { error: "Pas de texte à améliorer." },
      { status: 400 },
    );
  }

  const docContext = invoiceNumber
    ? `Document de contexte : facture ${invoiceNumber}.`
    : quoteNumber
      ? `Document de contexte : devis ${quoteNumber}.`
      : "Pas de document associé.";

  const recipientLine = clientName
    ? `Le destinataire est ${clientName}${clientEmail ? ` (${clientEmail})` : ""}.`
    : clientEmail
      ? `Le destinataire est ${clientEmail}.`
      : "";

  const system = [
    "Tu es l'assistant rédactionnel d'un auto-entrepreneur français qui écrit à un client.",
    `L'expéditeur s'appelle ${senderName}${senderTrade ? `, ${senderTrade}` : ""}.`,
    "Ton de l'email : professionnel, courtois, concis, en français.",
    "Tutoiement uniquement si le contexte le justifie clairement, sinon vouvoiement par défaut.",
    "Pas d'emojis. Pas de jargon marketing. Pas de formules ampoulées (« j'espère que ce mail vous trouve en bonne santé »).",
    "Salutation simple en ouverture, formule de politesse classique en fermeture, puis la signature avec le nom de l'expéditeur.",
    "Réponds UNIQUEMENT en JSON valide, sans markdown, avec la forme exacte :",
    `{"subject": "...", "text": "..."}`,
    "L'objet doit être court (≤ 60 caractères), explicite, sans préfixe « Re: » ni « Fwd: ».",
    "Le corps doit faire entre 3 et 8 lignes maximum.",
  ].join(" ");

  const userMessage =
    mode === "generate"
      ? [
          recipientLine,
          docContext,
          `Intention de l'expéditeur : ${prompt || "écrire un message court à ce client à propos du document ci-dessus"}.`,
          "Génère un objet et un corps de mail correspondant à cette intention.",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          recipientLine,
          docContext,
          `Voici le brouillon actuel (objet + corps) que je veux améliorer :`,
          `OBJET ACTUEL : ${currentSubject || "(vide)"}`,
          `CORPS ACTUEL :`,
          currentText,
          "Reformule pour rendre le message plus pro et plus clair, en conservant strictement l'intention et les faits. Pas de contenu inventé.",
        ]
          .filter(Boolean)
          .join("\n");

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Mistral ${res.status}: ${errText.slice(0, 200) || "échec"}` },
        { status: 502 },
      );
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      return NextResponse.json({ error: "Réponse Mistral vide" }, { status: 502 });
    }

    let parsed: { subject?: unknown; text?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Mistral n'a pas renvoyé du JSON valide", raw: raw.slice(0, 200) },
        { status: 502 },
      );
    }

    const subject = typeof parsed.subject === "string" ? parsed.subject.trim() : "";
    const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
    if (!subject || !text) {
      return NextResponse.json(
        { error: "Réponse Mistral incomplète (subject ou text manquant)" },
        { status: 502 },
      );
    }

    return NextResponse.json({ subject, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

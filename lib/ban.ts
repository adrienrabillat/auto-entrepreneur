/**
 * Client pour l'API Base Adresse Nationale (BAN) — la référence officielle
 * française, gratuite et sans authentification.
 *
 * Doc : https://adresse.data.gouv.fr/api-doc/adresse
 * Endpoint : https://api-adresse.data.gouv.fr/search/?q=...&limit=5
 */

export type BanSuggestion = {
  /** Adresse complète formatée : "12 Rue Léonard De Vinci 92400 Courbevoie" */
  label: string;
  /** Numéro + voie, ex : "12 Rue Léonard De Vinci" */
  addressLine1: string;
  postalCode: string;
  city: string;
  /** Code INSEE commune (utile pour les intégrations fiscales) */
  inseeCode: string | null;
  /** Score de pertinence 0..1 renvoyé par la BAN */
  score: number;
};

type RawFeature = {
  properties?: {
    label?: string;
    name?: string;          // numéro + voie, ex "12 Rue Léonard De Vinci"
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
    citycode?: string;      // code INSEE
    score?: number;
  };
};

/**
 * Recherche plein texte.
 * Retourne jusqu'à `limit` adresses candidates ordonnées par pertinence.
 */
export async function searchAddresses(
  query: string,
  opts: { limit?: number; signal?: AbortSignal } = {}
): Promise<BanSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL("https://api-adresse.data.gouv.fr/search/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(opts.limit ?? 5));
  url.searchParams.set("autocomplete", "1");

  try {
    const res = await fetch(url, { signal: opts.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: RawFeature[] };
    const feats = data.features ?? [];
    return feats
      .map<BanSuggestion | null>((f) => {
        const p = f.properties;
        if (!p?.label || !p.city || !p.postcode) return null;
        return {
          label: p.label,
          addressLine1: p.name ?? p.label.replace(`${p.postcode} ${p.city}`, "").trim(),
          postalCode: p.postcode,
          city: p.city,
          inseeCode: p.citycode ?? null,
          score: p.score ?? 0,
        };
      })
      .filter((x): x is BanSuggestion => x !== null);
  } catch {
    // AbortError ou réseau KO → saisie manuelle toujours dispo.
    return [];
  }
}

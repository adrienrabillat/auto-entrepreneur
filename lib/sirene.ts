/**
 * Client pour l'API publique "Recherche d'entreprises" maintenue par la DINUM
 * (https://api.gouv.fr/les-api/api-recherche-entreprises).
 *
 * - Gratuite, sans authentification, pas de rate-limit bloquant pour notre usage.
 * - Retourne les mêmes données que le Répertoire Sirene de l'INSEE.
 * - Appelée directement depuis le navigateur (CORS autorisé par l'API).
 */

export type SireneCompany = {
  siren: string;
  name: string;               // raison sociale (nom_complet)
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  apeNaf: string | null;      // code APE, ex "6201Z"
  activityLabel: string | null; // libellé en clair, ex "Programmation informatique"
  legalForm: string | null;   // forme juridique, ex "SARL"
};

type RawApiResult = {
  results?: Array<{
    siren?: string;
    nom_complet?: string;
    nom_raison_sociale?: string;
    nombre_etablissements?: number;
    siege?: {
      adresse?: string;            // ex: "6 RUE ALPHONSE HELBRONNER 93400 SAINT-OUEN-SUR-SEINE"
      numero_voie?: string;        // "6"
      type_voie?: string;           // "RUE"
      libelle_voie?: string;        // "ALPHONSE HELBRONNER"
      complement_adresse?: string;  // complément éventuel
      code_postal?: string;
      libelle_commune?: string;
      activite_principale?: string;
      libelle_activite_principale?: string;
    };
    activite_principale?: string;
    nature_juridique?: string;
    libelle_nature_juridique?: string;
  }>;
};

/**
 * Reconstruit la ligne 1 d'adresse (numéro + voie uniquement, SANS CP ni ville)
 * à partir des champs structurés de l'API. Fallback : si ces champs ne sont
 * pas fournis, on nettoie `adresse` en retirant le suffixe " CP VILLE".
 *
 * Évite le doublon "6 rue XX 93400 SAINT-OUEN / 93400 SAINT-OUEN" qui se
 * produisait avant sur le PDF.
 */
function composeStreet(siege: NonNullable<RawApiResult["results"]>[number]["siege"]): string | null {
  if (!siege) return null;
  const structured = [siege.numero_voie, siege.type_voie, siege.libelle_voie]
    .filter((p) => p && String(p).trim().length > 0)
    .join(" ")
    .trim();
  if (structured) return structured;

  // Fallback : `adresse` full, on retire le suffixe " CP VILLE" s'il est là.
  const full = (siege.adresse ?? "").trim();
  if (!full) return null;
  const suffix = [siege.code_postal, siege.libelle_commune]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (suffix) {
    const idx = full.toUpperCase().lastIndexOf(suffix.toUpperCase());
    if (idx >= 0) return full.slice(0, idx).trim();
  }
  return full;
}

/**
 * Recherche une entreprise par son SIREN (9 chiffres).
 * Retourne `null` si aucune correspondance ou si la requête échoue — l'appelant
 * affichera un message "SIREN introuvable" sans bloquer la saisie manuelle.
 */
export async function lookupSiren(siren: string, signal?: AbortSignal): Promise<SireneCompany | null> {
  const clean = (siren || "").replace(/\D/g, "");
  if (!/^\d{9}$/.test(clean)) return null;

  const url = `https://recherche-entreprises.api.gouv.fr/search?q=${clean}&per_page=1`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as RawApiResult;
    const hit = data.results?.[0];
    if (!hit || !hit.siren) return null;

    return {
      siren: hit.siren,
      name: hit.nom_raison_sociale || hit.nom_complet || "",
      addressLine1: composeStreet(hit.siege),
      postalCode: hit.siege?.code_postal ?? null,
      city: hit.siege?.libelle_commune ?? null,
      apeNaf: hit.siege?.activite_principale ?? hit.activite_principale ?? null,
      activityLabel: hit.siege?.libelle_activite_principale ?? null,
      legalForm: hit.libelle_nature_juridique ?? hit.nature_juridique ?? null,
    };
  } catch {
    // AbortError ou réseau KO → on laisse passer, saisie manuelle disponible.
    return null;
  }
}

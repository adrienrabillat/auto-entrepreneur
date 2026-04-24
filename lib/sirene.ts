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
      adresse?: string;
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
      addressLine1: hit.siege?.adresse ?? null,
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

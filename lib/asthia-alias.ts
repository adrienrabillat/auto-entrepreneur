import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Génération et résolution des alias `<alias>@asthia.fr`.
 *
 * Stratégie :
 *  1. On essaie d'abord `business_name` slugifié (raison sociale =
 *     identité commerciale visible).
 *  2. Sinon on tente `prenom.nom` extrait de `display_name`.
 *  3. Sinon on tombe sur `user-<short-uuid>` (rare, mais robuste).
 *  4. En cas de collision, on suffixe `-2`, `-3`, …, jusqu'à `-99`,
 *     puis un suffixe aléatoire à 4 chiffres en dernier recours.
 *
 * Une fois assigné, l'alias est IMMUABLE — sinon les anciennes factures
 * pointent vers une adresse morte, le webhook inbound ne route plus, et
 * la messagerie casse. Si l'AE veut changer, il devra contacter le
 * support qui décidera au cas par cas.
 */

const MAX_NUMERIC_SUFFIX = 99;

/**
 * Slugifie un nom en alias email-safe : minuscules, espaces → `.`,
 * caractères non `[a-z0-9.-]` retirés, runs de `.` ou `-` collapsés.
 *
 * Exemples :
 *   "Adrien Rabillat"        → "adrien.rabillat"
 *   "Café de la Place"       → "cafe.de.la.place"
 *   "L'Atelier d'Émilie"     → "latelier.demilie"
 *   "ÄCME-Société (SARL)"    → "acme-societe.sarl"
 */
export function slugifyAlias(input: string): string {
  return input
    .normalize("NFD")
    // Retire les diacritiques (accents) en gardant les lettres de base.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    // Apostrophes et guillemets → on les supprime sans laisser de séparateur
    // ("L'Atelier" → "latelier") : c'est plus court et lisible.
    .replace(/['’`"]/g, "")
    // Espaces et soulignés → point.
    .replace(/[\s_]+/g, ".")
    // Tout caractère non email-safe → tiret.
    .replace(/[^a-z0-9.-]+/g, "-")
    // Collapse runs.
    .replace(/\.+/g, ".")
    .replace(/-+/g, "-")
    // Trim caractères de séparation aux bords.
    .replace(/^[.\-]+|[.\-]+$/g, "");
}

/**
 * Sélectionne le candidat de base pour l'alias depuis le profil. Priorité
 * `business_name`, fallback `display_name`, dernier recours user-id court.
 */
export function baseAliasCandidate(profile: {
  business_name?: string | null;
  display_name?: string | null;
  id?: string;
}): string {
  if (profile.business_name) {
    const s = slugifyAlias(profile.business_name);
    if (s) return s;
  }
  if (profile.display_name) {
    const s = slugifyAlias(profile.display_name);
    if (s) return s;
  }
  // Filet de sécurité : impossible en théorie (display_name est requis
  // après onboarding) mais on évite un alias vide. Prend les 8 premiers
  // chars de l'UUID, ce qui est presque sûrement unique au sein d'un AE.
  if (profile.id) return `user-${profile.id.replace(/-/g, "").slice(0, 8)}`;
  return "user";
}

/**
 * Récupère ou génère l'alias `<alias>@asthia.fr` pour un utilisateur.
 *
 * - Si `profiles.asthia_alias` est déjà set, on le renvoie tel quel.
 * - Sinon on génère un candidat, on vérifie l'unicité (table profiles),
 *   on suffixe en cas de collision, on persiste, et on renvoie.
 *
 * Cette fonction doit être appelée avec un `SupabaseClient` admin
 * (service-role) côté serveur uniquement, parce qu'elle :
 *  - lit toutes les valeurs `asthia_alias` (cross-user) pour la collision
 *    detection (RLS le bloquerait avec un client user-scoped) ;
 *  - met à jour le profil même si le user n'a pas explicitement déclenché
 *    la mise à jour (lazy backfill au premier envoi de facture).
 */
export async function ensureAsthiaAlias(
  adminSupabase: SupabaseClient,
  userId: string,
): Promise<string> {
  // 1. Lecture du profil pour voir si on a déjà un alias.
  const { data: profile, error } = await adminSupabase
    .from("profiles")
    .select("asthia_alias, business_name, display_name, id")
    .eq("id", userId)
    .single();
  if (error) throw error;
  if (profile.asthia_alias) return profile.asthia_alias;

  // 2. Génération avec collision detection.
  const base = baseAliasCandidate(profile);
  const candidates = [
    base,
    ...Array.from({ length: MAX_NUMERIC_SUFFIX }, (_, i) => `${base}-${i + 2}`),
  ];

  // On charge en une fois TOUTES les valeurs déjà prises qui matchent le
  // préfixe. Plus rapide que MAX requêtes individuelles, et l'index
  // `profiles_asthia_alias_uniq` aide.
  const { data: taken } = await adminSupabase
    .from("profiles")
    .select("asthia_alias")
    .ilike("asthia_alias", `${base}%`);
  const takenSet = new Set((taken ?? []).map((r) => r.asthia_alias));

  let chosen = candidates.find((c) => !takenSet.has(c));
  if (!chosen) {
    // Catastrophique seulement en théorie (>99 homonymes exacts). On
    // tombe sur un suffixe aléatoire 4 chiffres pour ne pas bloquer.
    const rand = Math.floor(1000 + Math.random() * 9000);
    chosen = `${base}-${rand}`;
  }

  // 3. Persistance — on tente l'UPDATE et on retente sur conflit unique
  // au cas où une race condition aurait pris l'alias entre la lecture
  // et l'écriture (très improbable, mais 0 coût d'être safe).
  for (let attempt = 0; attempt < 5; attempt++) {
    const aliasToTry =
      attempt === 0 ? chosen : `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error: updErr } = await adminSupabase
      .from("profiles")
      .update({ asthia_alias: aliasToTry })
      .eq("id", userId);
    if (!updErr) return aliasToTry;
    // 23505 = unique_violation : un autre user a pris l'alias entre temps.
    if ((updErr as { code?: string }).code !== "23505") throw updErr;
  }
  throw new Error("Impossible d'attribuer un alias unique après 5 tentatives.");
}

/**
 * Résout un alias entrant (vu dans le `to:` d'un mail reçu par Resend
 * Inbound) vers l'utilisateur correspondant. Renvoie le profil minimal
 * nécessaire pour le forward (id, email perso, alias).
 *
 * Renvoie null si aucun utilisateur ne correspond — dans ce cas le mail
 * sera ignoré (skip) plutôt que forwardé n'importe où.
 */
export async function resolveAliasOwner(
  adminSupabase: SupabaseClient,
  alias: string,
): Promise<{ id: string; email: string; display_name: string | null } | null> {
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("asthia_alias", alias.toLowerCase())
    .maybeSingle();
  if (error) {
    console.error("[asthia-alias] resolveAliasOwner error:", error);
    return null;
  }
  return data ?? null;
}

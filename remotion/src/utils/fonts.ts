/**
 * Chargement partagé de la police Inter pour toutes les scènes du
 * Hero. Centralisé ici pour ne charger les fichiers font qu'une seule
 * fois (Remotion garde la même instance entre les composants).
 *
 * On limite délibérément les poids et subsets pour rester en-dessous
 * du seuil de "Too many network requests" que Remotion warn quand on
 * charge trop de variantes (chaque poids × subset = une requête).
 */
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const FONT_FAMILY = fontFamily;

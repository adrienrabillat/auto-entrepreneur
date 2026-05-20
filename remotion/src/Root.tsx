/**
 * Compositions Remotion exposées au Studio et au render.
 *
 * - Bootstrap : la scène de validation initiale (5 s, fond bleu → vert).
 *   Gardée pour debug isolé d'animations / couleurs.
 * - Hero : la vraie composition de la landing (16 s, 4 scènes :
 *   ColorStory → CreateInvoice → PreviewPdf → SendInvoice).
 */
import { Composition } from "remotion";
import { Bootstrap } from "./Bootstrap";
import { Hero, HERO_DURATION_FRAMES } from "./Hero";

// Format de la vidéo finale — portrait 9:10 pour matcher la colonne
// droite du hero de la landing (max-w ~600 × h ~660 ≈ 1080:1200 à 1x).
// On rend à 1.5× la dimension d'affichage cible pour rester croustillant
// sur les écrans HiDPI / retina 2-3× — sans exploser le temps de render
// ni le poids du fichier (~2× plus de pixels = ~2× plus long à rendre).
const WIDTH = 1620;
const HEIGHT = 1800;
const FPS = 30;

export const Root = () => {
  return (
    <>
      <Composition
        id="Hero"
        component={Hero}
        durationInFrames={HERO_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Bootstrap"
        component={Bootstrap}
        durationInFrames={FPS * 5}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};

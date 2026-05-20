/**
 * Liste des compositions Remotion exposées au Studio et au render.
 *
 * Pour l'instant on n'a que Bootstrap (la scène de validation
 * "bleu → vert" qui sert à vérifier que le pipeline tourne chez le
 * user). Une fois confirmé, on ajoutera ici la composition Hero
 * complète (16 s, 4 scènes : Color switch → Form → Preview → Send).
 */
import { Composition } from "remotion";
import { Bootstrap } from "./Bootstrap";

// Format de la vidéo finale — 9:10 portrait pour matcher la colonne
// droite du hero de la landing (max-w ~600 px × h ~660 px = ratio
// très proche de 1080:1200).
const WIDTH = 1080;
const HEIGHT = 1200;
const FPS = 30;

export const Root = () => {
  return (
    <>
      <Composition
        id="Bootstrap"
        component={Bootstrap}
        durationInFrames={FPS * 5} // 5 s
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};

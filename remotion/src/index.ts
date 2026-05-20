/**
 * Point d'entrée du projet Remotion.
 *
 * Remotion charge ce fichier et appelle Root() pour découvrir les
 * compositions à rendre. Cf. `remotion/src/Root.tsx`.
 */
import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);

/**
 * Config Remotion — paramètres globaux du projet vidéo Asthia.
 * Doc : https://www.remotion.dev/docs/config
 */
import { Config } from "@remotion/cli/config";

// Format d'image intermédiaire pour le rendu — JPEG suffit largement
// pour notre cas (pas de transparence requise), et c'est nettement
// plus rapide que PNG pour produire la vidéo finale.
Config.setVideoImageFormat("jpeg");

// Si on lance `npm run build` plusieurs fois de suite, on remplace
// hero.mp4 sans demander confirmation.
Config.setOverwriteOutput(true);

// Concurrency : par défaut Remotion utilise (cores - 1). On laisse
// défaut sauf si on veut limiter pendant un dev local.
// Config.setConcurrency(4);

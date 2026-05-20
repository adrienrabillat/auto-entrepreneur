/**
 * Config Remotion — paramètres globaux du projet vidéo Asthia.
 * Doc : https://www.remotion.dev/docs/config
 */
import { Config } from "@remotion/cli/config";

// Format d'image intermédiaire pour le rendu — JPEG à qualité 100 est
// quasi équivalent à PNG côté qualité visible, mais reste 3-4× plus
// rapide à encoder par frame. Pour une vidéo de présentation produit,
// c'est le bon compromis.
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(100);

// CRF (Constant Rate Factor) : plus c'est bas, plus c'est qualitatif.
// 18 = visuellement sans perte pour x264 (mp4). VP9 (webm) accepte la
// même valeur et produit un fichier propre.
Config.setCrf(18);

// NB : le preset x264 ("slow", etc.) n'est PAS défini ici car il est
// incompatible avec le codec vp9 (webm) — Remotion lève une erreur si
// les deux sont combinés. Le preset est donc passé en flag CLI
// uniquement sur les scripts de rendu mp4 (cf. package.json :
// `--x264-preset slow` sur build / build:hero).

// Si on lance `npm run build` plusieurs fois de suite, on remplace
// hero.mp4 sans demander confirmation.
Config.setOverwriteOutput(true);

// Concurrency : par défaut Remotion utilise (cores - 1). On laisse
// défaut sauf si on veut limiter pendant un dev local.
// Config.setConcurrency(4);

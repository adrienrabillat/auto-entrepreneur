/**
 * Hero — composition principale du teaser landing Asthia.
 *
 * Chaîne les 5 scènes via TransitionSeries avec des transitions
 * thématiques (cf. arbitrage user 20/05/2026) :
 *
 *   1. ColorStory                              130 f
 *      ↓ slide-from-right (15 f) — "on entre dans le produit"
 *   2. CreateInvoice                           165 f
 *      ↓ slide-from-bottom (18 f) — "l'aperçu PDF émerge"
 *   3. PreviewPdf                              165 f
 *      ↓ fade (15 f) — "le doc se condense en confirmation"
 *   4. Success                                 100 f
 *      ↓ slide-from-bottom (15 f) — "et voilà tout ce qu'Asthia fait"
 *   5. Features                                100 f
 *
 * Durée totale = Σ séquences − Σ transitions (les transitions
 * overlappent la fin d'une scène et le début de la suivante) :
 *   (130+165+165+100+100) − (15+18+15+15) = 660 − 63 = 597 f ≈ 19,9 s
 *
 * Les fade-in / slide-in internes des scènes 2→5 ont été retirés :
 * c'est désormais TransitionSeries qui gère l'entrée de chaque scène.
 * La scène 1 garde son fade-in depuis blanc et la scène 5 son
 * fade-out vers blanc — ces deux-là forment la couture de la boucle.
 */
import React from "react";
import { AbsoluteFill, Easing } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { COLORS } from "./tokens";
import { ColorStory } from "./scenes/ColorStory";
import { CreateInvoice } from "./scenes/CreateInvoice";
import { PreviewPdf } from "./scenes/PreviewPdf";
import { Success } from "./scenes/Success";
import { Features } from "./scenes/Features";

export const SCENE_DURATIONS = {
  colorStory: 130,
  createInvoice: 165,
  previewPdf: 165,
  success: 100,
  features: 100,
} as const;

export const TRANSITION_DURATIONS = {
  colorToCreate: 15,
  createToPreview: 18,
  previewToSuccess: 15,
  successToFeatures: 15,
} as const;

const SEQ_TOTAL =
  SCENE_DURATIONS.colorStory +
  SCENE_DURATIONS.createInvoice +
  SCENE_DURATIONS.previewPdf +
  SCENE_DURATIONS.success +
  SCENE_DURATIONS.features;

const TRANS_TOTAL =
  TRANSITION_DURATIONS.colorToCreate +
  TRANSITION_DURATIONS.createToPreview +
  TRANSITION_DURATIONS.previewToSuccess +
  TRANSITION_DURATIONS.successToFeatures;

export const HERO_DURATION_FRAMES = SEQ_TOTAL - TRANS_TOTAL;

// Easing out-expo partagé par les slides — démarre vif, ralentit.
const transitionEase = Easing.bezier(0.22, 1, 0.36, 1);

export const Hero: React.FC = () => {
  return (
    // Fond clair de base DERRIÈRE toutes les scènes. Indispensable :
    // ColorStory démarre à opacity 0 (fade-in) et Features finit à
    // opacity 0 (fade-out). Sans ce calque, ces frames laisseraient
    // voir le fond par défaut de Remotion = NOIR → flash noir à la
    // frame 0, à la couture de la boucle, et pendant le chargement
    // de la vidéo. Avec ce calque pageBg, aucune frame n'est noire.
    <AbsoluteFill style={{ backgroundColor: COLORS.pageBg }}>
      <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.colorStory}>
        <ColorStory />
      </TransitionSeries.Sequence>

      {/* S1 → S2 : la page produit entre par la droite */}
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({
          durationInFrames: TRANSITION_DURATIONS.colorToCreate,
          easing: transitionEase,
        })}
      />

      <TransitionSeries.Sequence
        durationInFrames={SCENE_DURATIONS.createInvoice}
      >
        <CreateInvoice />
      </TransitionSeries.Sequence>

      {/* S2 → S3 : l'aperçu PDF émerge depuis le bas */}
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({
          durationInFrames: TRANSITION_DURATIONS.createToPreview,
          easing: transitionEase,
        })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.previewPdf}>
        <PreviewPdf />
      </TransitionSeries.Sequence>

      {/* S3 → S4 : le doc se condense en confirmation (fondu) */}
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({
          durationInFrames: TRANSITION_DURATIONS.previewToSuccess,
        })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.success}>
        <Success />
      </TransitionSeries.Sequence>

      {/* S4 → S5 : la vue features monte depuis le bas */}
      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({
          durationInFrames: TRANSITION_DURATIONS.successToFeatures,
          easing: transitionEase,
        })}
      />

      <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.features}>
        <Features />
      </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

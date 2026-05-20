"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vidéo hero de la landing (démo produit rendue avec Remotion).
 *
 * Deux problèmes d'intégration vidéo sont gérés ici :
 *
 * 1. AUTOPLAY peu fiable — vidéo en cache prête trop vite, onglet en
 *    arrière-plan, etc. → on force `muted`, on appelle play() au
 *    montage, et on re-tente play() quand l'onglet redevient visible.
 *
 * 2. FRAME SOMBRE — la vidéo fait un fondu d'entrée depuis le fond et
 *    un fondu de sortie ; ses toutes premières et toutes dernières
 *    frames sont donc très sombres. Au chargement / refresh, le
 *    navigateur affiche cette frame 0 sombre dès qu'elle est décodée.
 *    Solution : on garde un POSTER (image figée claire) en fond du
 *    conteneur, et on ne révèle la <video> que pendant sa "fenêtre
 *    sûre" — c.-à-d. une fois l'intro passée et avant l'outro. Pendant
 *    l'intro, l'outro et la couture de boucle, c'est le poster clair
 *    qui est visible, jamais de noir.
 *
 * Le fix définitif reste de re-rendre la vidéo avec un fond clair de
 * base (déjà codé dans remotion/src/Hero.tsx) — mais ce composant rend
 * l'intégration robuste même en attendant ce re-render.
 */

// Marge (en secondes) pendant laquelle on masque la vidéo en début et
// en fin de lecture — couvre le fondu d'entrée (~0,3 s) et de sortie.
const INTRO_GUARD = 0.45;
const OUTRO_GUARD = 0.55;

export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Force la propriété muted — condition sine qua non de l'autoplay.
    video.muted = true;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* autoplay refusé — le poster reste affiché, pas d'erreur */
        });
      }
    };
    tryPlay();

    // Révèle la vidéo uniquement dans sa fenêtre "sûre" : après l'intro
    // et avant l'outro. En dehors (et à chaque retour à 0 lors de la
    // boucle), c'est le poster clair qui est visible.
    const updateReveal = () => {
      const t = video.currentTime;
      const d = video.duration;
      const afterIntro = t > INTRO_GUARD;
      const beforeOutro = Number.isNaN(d) || t < d - OUTRO_GUARD;
      setRevealed(afterIntro && beforeOutro);
    };
    video.addEventListener("timeupdate", updateReveal);

    // Re-tentative de lecture quand l'onglet (re)devient visible :
    // couvre l'onglet ouvert en arrière-plan et le retour d'onglet.
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      video.removeEventListener("timeupdate", updateReveal);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      className="relative w-full bg-surface"
      style={{
        // Poster clair en fond — toujours visible derrière la vidéo.
        // Quand la <video> est masquée (opacity 0), c'est lui qu'on voit.
        backgroundImage: "url(/hero-poster.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <video
        ref={ref}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-label="Démonstration animée d'Asthia : choix de la couleur de l'interface, création d'une facture, aperçu du PDF, envoi au client et déclaration URSSAF automatique."
        className="block w-full"
        style={{
          // aspect-ratio réserve la hauteur dès le départ (avant même
          // que la vidéo connaisse ses dimensions) → le conteneur ne
          // s'effondre pas et le poster a toujours une surface.
          aspectRatio: "1620 / 1800",
          opacity: revealed ? 1 : 0,
          transition: "opacity 200ms ease",
        }}
      >
        <source src="/hero.webm" type="video/webm" />
        <source src="/hero.mp4" type="video/mp4" />
      </video>
    </div>
  );
}

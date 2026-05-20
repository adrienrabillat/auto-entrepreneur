"use client";

import { useEffect, useRef } from "react";

/**
 * Vidéo hero de la landing (démo produit rendue avec Remotion).
 *
 * Objectif : la vidéo DOIT jouer et boucler en permanence. Jamais
 * d'image figée.
 *
 * L'autoplay des navigateurs échoue de façon intermittente (vidéo en
 * cache prête trop vite, onglet en arrière-plan, course d'hydratation
 * React, propriété `muted` pas encore posée…). On ne se repose donc
 * PAS sur le seul attribut `autoPlay` : on pilote la lecture en JS
 * avec une cascade de tentatives :
 *
 *   1. muted forcé (propriété + attribut) — condition de l'autoplay
 *   2. play() immédiat au montage
 *   3. play() sur les events media (loadeddata, canplay)
 *   4. play() quand l'onglet redevient visible
 *   5. play() à la première interaction utilisateur (filet ultime :
 *      après un geste, l'autoplay est toujours autorisé)
 *   6. polling toutes les 600 ms pendant 8 s : si la vidéo est en
 *      pause, on relance — rattrape tous les events ratés
 *
 * La <video> est TOUJOURS visible (opacity 1). Le `poster` ne sert que
 * d'image de chargement le temps que la 1ʳᵉ frame soit décodée.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Garantir muted de toutes les façons possibles — sans ça,
    // l'autoplay est bloqué par les navigateurs.
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");

    let disposed = false;

    const attemptPlay = () => {
      if (disposed || !video.paused) return;
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* échec — une des autres tentatives de la cascade reprendra */
        });
      }
    };

    // 1. Tentative immédiate.
    attemptPlay();

    // 2. Tentatives quand le media a des données.
    video.addEventListener("loadeddata", attemptPlay);
    video.addEventListener("canplay", attemptPlay);

    // 3. Tentative au retour de visibilité de l'onglet (onglet ouvert
    //    en arrière-plan, retour d'onglet).
    const onVisibility = () => {
      if (document.visibilityState === "visible") attemptPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 4. Filet ultime : à la première interaction, l'autoplay est
    //    toujours autorisé.
    const gestureEvents = ["pointerdown", "touchstart", "keydown", "scroll"];
    const onGesture = () => attemptPlay();
    gestureEvents.forEach((e) =>
      window.addEventListener(e, onGesture, { passive: true }),
    );

    // 5. Polling de sécurité : pendant 8 s, si la vidéo est en pause
    //    on relance. Rattrape les courses où tous les events ont été
    //    ratés (notamment vidéo servie depuis le cache).
    const poll = window.setInterval(attemptPlay, 600);
    const stopPoll = window.setTimeout(
      () => window.clearInterval(poll),
      8000,
    );

    return () => {
      disposed = true;
      video.removeEventListener("loadeddata", attemptPlay);
      video.removeEventListener("canplay", attemptPlay);
      document.removeEventListener("visibilitychange", onVisibility);
      gestureEvents.forEach((e) => window.removeEventListener(e, onGesture));
      window.clearInterval(poll);
      window.clearTimeout(stopPoll);
    };
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      poster="/hero-poster.jpg"
      aria-label="Démonstration animée d'Asthia : choix de la couleur de l'interface, création d'une facture, aperçu du PDF, envoi au client et déclaration URSSAF automatique."
      className="block w-full"
      style={{
        // Réserve la hauteur dès le départ (ratio de la vidéo) pour que
        // le conteneur ne saute pas avant le chargement.
        aspectRatio: "1620 / 1800",
      }}
    >
      <source src="/hero.webm" type="video/webm" />
      <source src="/hero.mp4" type="video/mp4" />
    </video>
  );
}

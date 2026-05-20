"use client";

import { useEffect, useRef } from "react";

/**
 * Vidéo hero de la landing (démo produit rendue avec Remotion).
 *
 * Pourquoi un client component plutôt qu'un simple <video autoPlay> ?
 * L'autoplay des navigateurs est capricieux et échoue de façon
 * intermittente :
 *
 *  - Vidéo servie depuis le cache → elle est prête quasi instantanément,
 *    et le navigateur peut tenter l'autoplay AVANT que la propriété
 *    `muted` soit fiablement posée (l'attribut JSX `muted` de React
 *    n'est pas toujours répercuté à temps sur la propriété DOM). Le
 *    navigateur voit alors une vidéo "non muette" et bloque l'autoplay.
 *
 *  - Onglet ouvert en arrière-plan → l'autoplay est différé tant que
 *    l'onglet n'est pas visible, et ne reprend pas toujours tout seul
 *    quand l'utilisateur y revient.
 *
 * On fixe les deux cas en pilotant la lecture en JS : on force la
 * propriété `muted`, on appelle play() au montage, et on re-tente
 * play() à chaque fois que l'onglet redevient visible. Le poster reste
 * comme image de chargement (affiché < 1 s le temps du décodage), mais
 * il ne "colle" plus puisque la vidéo démarre de façon fiable.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Force la propriété muted — condition sine qua non de l'autoplay.
    video.muted = true;

    const tryPlay = () => {
      const p = video.play();
      // play() renvoie une promesse ; si l'autoplay est refusé on
      // l'avale silencieusement (le poster reste affiché en secours).
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          /* autoplay refusé — on garde le poster, pas d'erreur console */
        });
      }
    };

    // Tentative immédiate au montage.
    tryPlay();

    // Re-tentative quand l'onglet (re)devient visible : couvre le cas
    // de l'onglet ouvert en arrière-plan et du retour d'onglet.
    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
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
      className="block w-full h-auto"
    >
      <source src="/hero.webm" type="video/webm" />
      <source src="/hero.mp4" type="video/mp4" />
    </video>
  );
}

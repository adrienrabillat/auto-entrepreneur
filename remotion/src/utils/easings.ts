/**
 * Easings réutilisables pour les scènes du Hero.
 *
 * Remotion expose `Easing.bezier(x1, y1, x2, y2)` qui retourne une
 * fonction de tween. On les nomme ici pour que les scènes utilisent
 * le même vocabulaire que la spec design (out-expo, out-quart, etc.).
 *
 * Doc : https://www.remotion.dev/docs/easing
 */
import { Easing } from "remotion";

/** Démarre vif, ralentit doucement. Le préféré pour les slides. */
export const outExpo = Easing.bezier(0.16, 1, 0.3, 1);

/** Variante plus douce, pour les fade-in d'éléments secondaires. */
export const outQuart = Easing.bezier(0.25, 1, 0.5, 1);

/** Démarre lent, accélère, ralentit. Pour les morphs en milieu de cycle. */
export const inOutCubic = Easing.bezier(0.65, 0, 0.35, 1);

/** Spring avec léger overshoot — pour les apparitions de cards. */
export const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);

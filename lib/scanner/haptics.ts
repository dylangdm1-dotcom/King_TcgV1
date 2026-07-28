/**
 * Module de retour haptique (Vibrations tactiles pour mobile)
 */

 export const triggerHaptic = (
  type: "success" | "error" | "click" = "success"
) => {
  // Vérifie si l'environnement supporte l'API Vibrations
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;

  try {
    switch (type) {
      case "success":
        // Double impulsion rapide pour validation de carte (100ms vibre, 50ms pause, 100ms vibre)
        navigator.vibrate([100, 50, 100]);
        break;
      case "error":
        // Une impulsion plus longue en cas d'échec de détection
        navigator.vibrate([300]);
        break;
      case "click":
        // Petit clac discret lors d'un appui sur un bouton
        navigator.vibrate(40);
        break;
    }
  } catch (err) {
    // Ignorer si bloqué par les politiques d'interaction utilisateur du navigateur
  }
};

"use client";

let openCVPromise: Promise<any> | null = null;

export function loadOpenCV(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("OpenCV doit être chargé côté client")
    );
  }

  // 1. Si OpenCV est déjà prêt sur l'objet global window
  if ((window as any).cv && (window as any).cv.Mat) {
    return Promise.resolve((window as any).cv);
  }

  // 2. Si un chargement est déjà en cours, on réutilise la promesse existante
  if (openCVPromise) {
    return openCVPromise;
  }

  // 3. Injection dynamique du script CDN
  openCVPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById("opencv-script");
    if (existingScript) {
      waitForCv(resolve, reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "opencv-script";
    script.src = "https://docs.opencv.org/4.7.0/opencv.js";
    script.async = true;

    script.onload = () => {
      console.log("Script OpenCV injecté");
      waitForCv(resolve, reject);
    };

    script.onerror = (err) => {
      console.error("Impossible de charger le script OpenCV", err);
      openCVPromise = null;
      reject(err);
    };

    document.body.appendChild(script);
  });

  return openCVPromise;
}

// Vérification de l'initialisation du runtime avec sécurité anti-boucle infinie (Timeout 15s)
function waitForCv(resolve: (cv: any) => void, reject: (reason?: any) => void) {
  let attempts = 0;
  const maxAttempts = 300; // 300 * 50ms = 15 secondes max

  const checkCv = setInterval(() => {
    attempts++;
    const cv = (window as any).cv;

    if (cv && cv.Mat) {
      clearInterval(checkCv);
      console.log("✅ OpenCV runtime prêt");
      resolve(cv);
      return;
    }

    if (attempts >= maxAttempts) {
      clearInterval(checkCv);
      openCVPromise = null; // Réinitialise pour permettre une nouvelle tentative
      console.error("❌ Timeout : OpenCV a mis trop de temps à s'initialiser");
      reject(new Error("Timeout OpenCV"));
    }
  }, 50);
}

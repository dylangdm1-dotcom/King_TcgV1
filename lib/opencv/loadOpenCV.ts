"use client";

let openCVPromise: Promise<any> | null = null;

export function loadOpenCV(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("OpenCV doit être chargé côté client")
    );
  }

  // 1. Si OpenCV est déjà présent sur l'objet global window
  if ((window as any).cv && (window as any).cv.Mat) {
    return Promise.resolve((window as any).cv);
  }

  // 2. Si un chargement est déjà en cours, on réutilise la même promesse
  if (openCVPromise) {
    return openCVPromise;
  }

  // 3. Sinon, on injecte dynamiquement la balise script (via un CDN ultra-rapide)
  openCVPromise = new Promise((resolve, reject) => {
    // Si le script existe déjà dans le DOM
    const existingScript = document.getElementById("opencv-script");
    if (existingScript) {
      waitForCv(resolve);
      return;
    }

    const script = document.createElement("script");
    script.id = "opencv-script";
    // Chargement dynamique léger (version 4.7.0 officielle)
    script.src = "https://docs.opencv.org/4.7.0/opencv.js";
    script.async = true;

    script.onload = () => {
      console.log("Script OpenCV injecté avec succès");
      waitForCv(resolve);
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

// Fonction utilitaire pour s'assurer que le runtime WebAssembly d'OpenCV est totalement initialisé
function waitForCv(resolve: (cv: any) => void) {
  const checkCv = setInterval(() => {
    const cv = (window as any).cv;
    if (cv && cv.Mat) {
      clearInterval(checkCv);
      console.log("✅ OpenCV runtime prêt");
      resolve(cv);
    }
  }, 50);
}
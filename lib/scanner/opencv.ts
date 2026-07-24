"use client";

let cvInstance: any = null;
let loading: boolean = false;

export async function loadOpenCV() {
  if (cvInstance) {
    return cvInstance;
  }

  if (loading) {
    while (!cvInstance) {
      await new Promise(r => setTimeout(r, 100));
    }
    return cvInstance;
  }

  loading = true;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;

    script.onload = () => {
      const timer = setInterval(() => {
        const cv = (window as any).cv;
        if (cv && cv.Mat) {
          clearInterval(timer);
          cvInstance = cv;
          loading = false;
          resolve(cv);
        }
      }, 100);
    };

    script.onerror = reject;
    document.body.appendChild(script);
  });
}
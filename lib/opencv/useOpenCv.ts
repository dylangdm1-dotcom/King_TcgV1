"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    cv: any;
  }
}

export default function useOpenCV() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    function check() {
      if (
        window.cv &&
        typeof window.cv.getBuildInformation === "function"
      ) {
        console.log("OpenCV prêt");
        setReady(true);
      } else {
        timer = setTimeout(check, 100);
      }
    }

    check();

    return () => clearTimeout(timer);
  }, []);

  return ready;
}
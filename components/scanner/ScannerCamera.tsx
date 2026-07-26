"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";

export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
}

interface ScannerCameraProps {
  onReady?: () => void;
}

const ScannerCamera = forwardRef<
  ScannerCameraHandle,
  ScannerCameraProps
>(({ onReady }, ref) => {

  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
  }));


  useEffect(() => {
    let stream: MediaStream | null = null;


    async function startCamera() {
      try {

        stream = await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: {
              ideal: "environment",
            },

            width: {
              min: 1280,
              ideal: 1920,
            },

            height: {
              min: 720,
              ideal: 1080,
            },

            aspectRatio: {
              ideal: 1.414,
            },

            frameRate: {
              ideal: 30,
            },

          },

          audio: false,
        });


        const video = videoRef.current;


        if (video) {

          video.srcObject = stream;


          video.onloadedmetadata = async () => {

            try {
              await video.play();

              // Tentative amélioration autofocus mobile
              const track = stream?.getVideoTracks()[0];

              if (track) {

                const capabilities =
                  track.getCapabilities?.();

                if (
                  capabilities &&
                  "focusMode" in capabilities
                ) {

                  await track.applyConstraints({
                    advanced: [
                      {
                        focusMode: "continuous",
                      } as any,
                    ],
                  });

                }
              }

            } catch (e) {
              console.error(
                "Erreur lecture caméra",
                e
              );
            }


            onReady?.();

          };
        }


      } catch (err) {

        console.error(
          "Erreur accès caméra :",
          err
        );

      }
    }


    startCamera();


    return () => {

      if (stream) {

        stream
          .getTracks()
          .forEach(track =>
            track.stop()
          );

      }

    };


  }, [onReady]);



  return (
    <video
      ref={videoRef}
      playsInline
      muted
      autoPlay
      className="
        h-full
        w-full
        object-cover
      "
    />
  );

});


ScannerCamera.displayName =
  "ScannerCamera";


export default ScannerCamera;
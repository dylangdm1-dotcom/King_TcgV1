"use client";

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";

import { Camera } from "lucide-react";


export interface ScannerCameraHandle {
  getVideo: () => HTMLVideoElement | null;
}


interface ScannerCameraProps {
  onReady?: () => void;
}



const ScannerCamera = forwardRef<
  ScannerCameraHandle,
  ScannerCameraProps
>(
  (
    {
      onReady,
    },
    ref
  ) => {


    const videoRef =
      useRef<HTMLVideoElement>(null);


    const streamRef =
      useRef<MediaStream | null>(null);



    const [hasPermission, setHasPermission] =
      useState<boolean | null>(null);




    const stopCamera =
      useCallback(() => {

        if (streamRef.current) {

          streamRef.current
            .getTracks()
            .forEach((track) => {
              track.stop();
            });


          streamRef.current = null;

        }

      }, []);






    const startCamera =
      useCallback(async () => {

        try {


          stopCamera();



          if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
          ) {

            throw new Error(
              "Caméra non supportée"
            );

          }





          const stream =
            await navigator.mediaDevices.getUserMedia({

              video: {

                facingMode: {
                  ideal: "environment",
                },


                width: {
                  ideal: 1920,
                  min: 1280,
                },


                height: {
                  ideal: 1080,
                  min: 720,
                },


                frameRate: {
                  ideal: 30,
                },

              },


              audio: false,

            });





          streamRef.current =
            stream;



          const video =
            videoRef.current;



          if (!video) {

            return;

          }



          video.srcObject =
            stream;



          await video.play();





          /**
           * Autofocus continu
           * Compatible Chrome Android
           */
          const track =
            stream.getVideoTracks()[0];


          const capabilities =
            track.getCapabilities?.();



          if (
            capabilities &&
            "focusMode" in capabilities
          ) {


            await track.applyConstraints({

              advanced: [
                {
                  focusMode:
                    "continuous",
                } as MediaTrackConstraintSet,
              ],

            })
            .catch(() => {});


          }






          setHasPermission(true);



          onReady?.();




        } catch (error) {


          console.error(
            "Erreur caméra :",
            error
          );


          setHasPermission(false);


        }


      }, [
        onReady,
        stopCamera,
      ]);







    useEffect(() => {

      startCamera();


      return () => {

        stopCamera();

      };


    }, [
      startCamera,
      stopCamera,
    ]);







    useImperativeHandle(
      ref,
      () => ({

        getVideo() {

          const video =
            videoRef.current;



          if (
            video &&
            video.readyState >= 2
          ) {

            return video;

          }



          return null;

        },

      })
    );







    if (
      hasPermission === false
    ) {


      return (

        <div
          className="
            flex
            h-full
            flex-col
            items-center
            justify-center
            bg-zinc-900
            p-6
            text-center
          "
        >

          <Camera
            className="
              mb-4
              h-8
              w-8
              text-red-500
            "
          />


          <p
            className="
              text-sm
              text-zinc-400
            "
          >

            Accès caméra refusé
            ou indisponible.

          </p>



          <button

            onClick={startCamera}

            className="
              mt-4
              rounded-lg
              bg-cyan-500
              px-4
              py-2
              text-sm
              font-bold
              text-black
            "

          >

            Réessayer

          </button>


        </div>

      );

    }






    return (

      <div
        className="
          relative
          h-full
          w-full
          overflow-hidden
          bg-black
        "
      >

        <video

          ref={videoRef}

          autoPlay

          playsInline

          muted


          className="
            h-full
            w-full
            object-cover
          "

        />


      </div>

    );


  }
);



ScannerCamera.displayName =
  "ScannerCamera";



export default ScannerCamera;
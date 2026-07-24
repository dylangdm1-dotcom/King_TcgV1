"use client";

export const dynamic = "force-dynamic";

import {
  useRef,
  useState,
  useCallback,
} from "react";

import {
  useRouter,
} from "next/navigation";


import ScannerCamera, {
  type ScannerCameraHandle,
} from "../../components/scanner/ScannerCamera";

import ScannerOverlay from "../../components/scanner/ScannerOverlay";


import {
  captureFrame,
} from "../../lib/scanner/capture";


import {
  cropCardZones,
  type CardCrops,
} from "../../lib/scanner/nativeCrop";


import {
  processCardOCR,
} from "../../lib/scanner/ocr";


import {
  lookupPokemonCard,
} from "../../lib/scanner/pokemonLookup";


import Navbar from "../../components/Navbar";



export default function ScannerPage() {


  const cameraRef =
    useRef<ScannerCameraHandle>(null);


  const router =
    useRouter();



  const [ready, setReady] =
    useState(false);


  const [scanning, setScanning] =
    useState(false);


  const [status, setStatus] =
    useState(
      "Alignez la carte dans le cadre et appuyez sur Scanner"
    );


  const [previewCrops, setPreviewCrops] =
    useState<CardCrops | null>(null);





  const handleCameraReady =
    useCallback(() => {

      setReady(true);

    }, []);







  async function scan() {


    if (
      !cameraRef.current ||
      scanning
    ) {
      return;
    }



    const video =
      cameraRef.current.getVideo();



    if (!video) {

      setStatus(
        "Caméra non disponible."
      );

      return;

    }



    setScanning(true);

    setPreviewCrops(null);



    try {


      /**
       * 1 - Capture image caméra
       */
      setStatus(
        "Capture de la carte..."
      );



      const image64 =
        captureFrame(video);



      if (!image64) {

        setStatus(
          "Impossible de capturer l'image."
        );

        return;

      }




      /**
       * 2 - Découpe zones carte
       */
      setStatus(
        "Analyse du cadrage..."
      );


      const crops =
        await cropCardZones(
          image64
        );



      if (!crops) {

        setStatus(
          "Impossible de découper la carte."
        );

        return;

      }



      setPreviewCrops(crops);






      /**
       * 3 - OCR
       */
      setStatus(
        "Lecture OCR..."
      );



      const ocr =
        await processCardOCR(
          crops.nameCrop,
          crops.numberCrop
        );



      if (
        !ocr.rawName &&
        !ocr.cardNumber
      ) {

        setStatus(
          "Lecture impossible. Améliorez la lumière."
        );

        return;

      }





      setStatus(
        `Analyse : ${ocr.rawName}${
          ocr.cardNumber
            ? ` (${ocr.cardNumber})`
            : ""
        }`
      );







      /**
       * 4 - Recherche API Pokémon
       */
      setStatus(
        "Recherche carte..."
      );



      const match =
        await lookupPokemonCard(
          ocr.rawName,
          ocr.cardNumber
        );



      if (!match) {

        setStatus(
          `Carte introuvable : ${ocr.rawName}`
        );

        return;

      }






      if (
        match.confidence < 50
      ) {

        setStatus(
          "Résultat incertain. Nouveau scan conseillé."
        );

        return;

      }






      setStatus(
        `Trouvé : ${match.card.name} (${match.confidence}%)`
      );



      setTimeout(() => {

        router.push(
          `/card/${match.card.id}`
        );

      }, 500);





    } catch(error) {


      console.error(
        "Scanner V2 error:",
        error
      );


      setStatus(
        "Erreur pendant l'analyse."
      );



    } finally {


      setScanning(false);


    }

  }







  return (

    <>

      <Navbar />


      <main className="min-h-screen bg-black text-white pb-20">


        <div className="mx-auto max-w-xl space-y-6 px-4 py-6">



          <section className="
            rounded-xl
            border
            border-zinc-900
            bg-neutral-950/40
            p-4
            text-center
          ">


            <span className="
              text-[9px]
              font-black
              uppercase
              tracking-wider
              text-cyan-500
            ">

              Native Web Engine V2

            </span>



            <h1 className="
              mt-1
              text-lg
              font-black
              uppercase
              tracking-tight
            ">

              King_TCG Scanner

            </h1>


          </section>







          <div className="
            relative
            aspect-[9/16]
            overflow-hidden
            rounded-xl
            border
            border-zinc-900
            bg-neutral-950
            shadow-xl
          ">


            <ScannerCamera

              ref={cameraRef}

              onReady={
                handleCameraReady
              }

            />


            <ScannerOverlay

              scanning={
                scanning
              }

            />


          </div>








          <button

            onClick={scan}

            disabled={
              !ready ||
              scanning
            }


            className="
              w-full
              rounded-xl
              bg-cyan-500
              py-4
              text-lg
              font-bold
              text-black
              transition
              hover:bg-cyan-400
              disabled:opacity-40
            "

          >

            {
              scanning
                ? "Analyse..."
                : "Scanner la carte"
            }


          </button>








          <div className="
            rounded-xl
            border
            border-zinc-900
            bg-neutral-950/40
            p-4
          ">


            <span className="
              text-xs
              uppercase
              tracking-widest
              text-zinc-500
            ">

              Statut

            </span>



            <p className="
              mt-2
              text-center
              text-sm
              font-semibold
            ">

              {status}

            </p>


          </div>









          {
            previewCrops && (

              <div className="
                grid
                grid-cols-2
                gap-3
              ">



                <div className="
                  rounded-lg
                  border
                  border-zinc-800
                  bg-zinc-900/50
                  p-2
                ">


                  <span className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-zinc-400
                  ">

                    Zone Nom

                  </span>



                  <img

                    src={
                      previewCrops.nameCrop
                    }

                    alt="Nom Pokémon"

                    className="
                      w-full
                      rounded
                      border
                      border-zinc-700
                    "

                  />


                </div>







                <div className="
                  rounded-lg
                  border
                  border-zinc-800
                  bg-zinc-900/50
                  p-2
                ">


                  <span className="
                    mb-1
                    block
                    text-[10px]
                    font-bold
                    uppercase
                    text-zinc-400
                  ">

                    Zone Numéro

                  </span>



                  <img

                    src={
                      previewCrops.numberCrop
                    }

                    alt="Numéro carte"

                    className="
                      w-full
                      rounded
                      border
                      border-zinc-700
                    "

                  />


                </div>


              </div>

            )
          }



        </div>


      </main>


    </>

  );

}

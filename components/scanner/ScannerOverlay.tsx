"use client";

type Props = {
  scanning?: boolean;
};


export default function ScannerOverlay({
  scanning = false,
}: Props) {


  return (

    <div className="
      absolute
      inset-0
      z-10
      pointer-events-none
    ">



      {/* Cadre carte Pokémon - identique nativeCrop V2 */}
      <div
        className="
          absolute
          left-1/2
          top-1/2
          w-[72%]
          aspect-[63/88]
          -translate-x-1/2
          -translate-y-1/2
          rounded-xl
          border
          border-zinc-700/80
          transition-colors
          duration-300
        "
      >




        {/* Coins de cadrage */}

        <div
          className={`
            absolute
            -left-1
            -top-1
            h-6
            w-6
            rounded-tl-lg
            border-l-4
            border-t-4
            ${
              scanning
                ? "border-cyan-400"
                : "border-zinc-400"
            }
          `}
        />



        <div
          className={`
            absolute
            -right-1
            -top-1
            h-6
            w-6
            rounded-tr-lg
            border-r-4
            border-t-4
            ${
              scanning
                ? "border-cyan-400"
                : "border-zinc-400"
            }
          `}
        />



        <div
          className={`
            absolute
            -bottom-1
            -left-1
            h-6
            w-6
            rounded-bl-lg
            border-b-4
            border-l-4
            ${
              scanning
                ? "border-cyan-400"
                : "border-zinc-400"
            }
          `}
        />



        <div
          className={`
            absolute
            -bottom-1
            -right-1
            h-6
            w-6
            rounded-br-lg
            border-b-4
            border-r-4
            ${
              scanning
                ? "border-cyan-400"
                : "border-zinc-400"
            }
          `}
        />






        {/* Zone OCR Nom
            Correspond :
            cardY + 3.5%
            largeur 92%
        */}

        <div
          className="
            absolute
            left-[4%]
            top-[3.5%]
            flex
            h-[12%]
            w-[92%]
            items-center
            rounded
            border
            border-cyan-400/50
            bg-cyan-500/10
            px-2
          "
        >

          <span className="
            text-[9px]
            font-bold
            uppercase
            tracking-widest
            text-cyan-400/80
          ">

            Nom Pokémon

          </span>


        </div>






        {/* Zone OCR numéro
            Correspond :
            bottom 11.5%
            gauche 5%
        */}

        <div
          className="
            absolute
            bottom-[8.5%]
            left-[5%]
            flex
            h-[9%]
            w-[42%]
            items-center
            rounded
            border
            border-dashed
            border-cyan-400/50
            bg-cyan-500/10
            px-1.5
          "
        >

          <span className="
            text-[8px]
            font-bold
            uppercase
            tracking-wider
            text-cyan-400/80
          ">

            N° Carte

          </span>


        </div>







        {/* Barre de scan */}

        {
          scanning && (

            <div
              className="
                absolute
                left-0
                right-0
                h-[2px]
                bg-cyan-400
                shadow-[0_0_14px_rgba(34,211,238,0.9)]
                animate-scan
              "
            />

          )
        }



      </div>







      {/* Message utilisateur */}

      <div
        className="
          absolute
          bottom-[8%]
          inset-x-0
          flex
          justify-center
        "
      >

        <div
          className={`
            rounded-full
            border
            bg-neutral-950/90
            px-4
            py-2
            text-[10px]
            font-black
            uppercase
            tracking-widest
            shadow-lg
            backdrop-blur-sm
            ${
              scanning
                ? "border-cyan-500/50 text-cyan-400"
                : "border-zinc-800 text-zinc-400"
            }
          `}
        >

          {
            scanning
              ? "Analyse en cours..."
              : "Placez la carte dans le cadre"
          }


        </div>


      </div>






      <style jsx>{`

        @keyframes scanMove {

          0% {
            top: 0%;
          }

          100% {
            top: 100%;
          }

        }


        .animate-scan {

          animation:
            scanMove
            1.8s
            ease-in-out
            infinite
            alternate;

        }


      `}</style>



    </div>

  );

}
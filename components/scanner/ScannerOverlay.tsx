"use client";

type Props = {
  scanning?: boolean;
};

export default function ScannerOverlay({
  scanning = false,
}: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">

      {/* Cadre carte Pokémon */}
      <div
        className="
          absolute
          top-1/2
          left-1/2
          -translate-x-1/2
          -translate-y-1/2
          h-[70%]
          aspect-[63/88]
          rounded-xl
          border
          border-zinc-700
          transition-colors
          duration-300
        "
      >

        {/* Coins de guidage */}
        <div
          className={`absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 ${
            scanning
              ? "border-cyan-400"
              : "border-zinc-500"
          }`}
        />

        <div
          className={`absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 ${
            scanning
              ? "border-cyan-400"
              : "border-zinc-500"
          }`}
        />

        <div
          className={`absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 ${
            scanning
              ? "border-cyan-400"
              : "border-zinc-500"
          }`}
        />

        <div
          className={`absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 ${
            scanning
              ? "border-cyan-400"
              : "border-zinc-500"
          }`}
        />


        {/* Zone nom Pokémon */}
        <div
          className="
            absolute
            top-[3%]
            left-[8%]
            w-[84%]
            h-[18%]
            rounded
            border
            border-cyan-400/50
            bg-cyan-400/10
          "
        />


        {/* Ligne de scan */}
        {scanning && (
          <div
            className="
              absolute
              inset-x-0
              h-[2px]
              bg-cyan-400/40
              shadow-[0_0_8px_rgba(34,211,238,0.4)]
              animate-scan
            "
          />
        )}

      </div>


      {/* Instruction */}
      <div className="absolute bottom-[18%] inset-x-0 flex justify-center">

        <div
          className={`
            rounded
            border
            bg-neutral-950
            px-3
            py-1
            text-[10px]
            font-black
            uppercase
            tracking-widest

            ${
              scanning
                ? "border-cyan-500/30 text-cyan-400"
                : "border-zinc-900 text-zinc-500"
            }
          `}
        >
          {scanning
            ? "Analyse de la carte"
            : "Placez la carte dans le cadre"}
        </div>

      </div>


      <style>{`
        @keyframes scanMove {
          0% {
            top: 0%;
          }

          100% {
            top: 100%;
          }
        }

        .animate-scan {
          animation: scanMove 2s linear infinite;
        }
      `}</style>

    </div>
  );
}
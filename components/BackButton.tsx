"use client";

import { useRouter } from "next/navigation";

type Props = {
  fallback?: string;
  label?: string;
};

export default function BackButton({ fallback = "/", label = "Retour" }: Props) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 md:bottom-auto md:top-6 md:left-6">
      <button
        onClick={goBack}
        className="pointer-events-auto group flex items-center gap-2.5 rounded-full border border-zinc-800 bg-neutral-900/80 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md shadow-2xl transition-all duration-300 hover:scale-105 hover:border-yellow-500/50 hover:text-white hover:shadow-[0_0_25px_rgba(234,179,8,0.2)] cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span>{label}</span>
      </button>
    </div>
  );
}
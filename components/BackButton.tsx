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
        className="pointer-events-auto group inline-flex items-center gap-2 rounded-[12px] border border-cyan-400/20 bg-[#111821]/95 px-3 py-2 text-[10px] font-bold text-zinc-200 backdrop-blur-md shadow-lg transition hover:border-cyan-300/35 hover:text-white cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
          stroke="currentColor"
          className="h-3.5 w-3.5 text-cyan-300 transition-transform duration-300 group-hover:-translate-x-0.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        <span>{label}</span>
      </button>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Connexion sécurisée en cours…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const expiresIn = Number(params.get("expires_in") || 3600);
    if (!accessToken || !refreshToken) {
      setMessage("La connexion Google n’a pas abouti. Revenez à la page Compte.");
      window.setTimeout(() => router.replace("/parametres/compte?error=oauth"), 1600);
      return;
    }
    fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken, refreshToken, expiresIn }) })
      .then(async (response) => { if (!response.ok) throw new Error(); window.history.replaceState({}, "", "/auth/callback"); router.replace("/parametres/compte?connected=1"); router.refresh(); })
      .catch(() => { setMessage("Impossible de créer la session King_TCG."); window.setTimeout(() => router.replace("/parametres/compte?error=session"), 1600); });
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#070b10] px-6 text-white"><div className="rounded-3xl border border-cyan-400/20 bg-[#111821] p-8 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-cyan-300"/><Loader2 className="mx-auto mt-5 h-6 w-6 animate-spin text-cyan-300"/><p className="mt-4 text-sm font-bold">{message}</p></div></main>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Finalisation de la connexion Google…");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const oauthError = params.get("error_description") || params.get("error");

      if (oauthError) {
        setMessage("La connexion Google a été annulée ou refusée.");
        router.replace("/parametres/compte?auth=error");
        return;
      }

      if (!code) {
        setMessage("Code de connexion manquant.");
        router.replace("/parametres/compte?auth=error");
        return;
      }

      try {
        const response = await fetch(`/api/auth/callback?code=${encodeURIComponent(code)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Impossible de créer la session King_TCG.");
        }

        if (!cancelled) {
          setMessage("Connexion réussie. Ouverture de votre compte…");
          const next = typeof payload.next === "string" && payload.next.startsWith("/")
            ? payload.next
            : "/parametres/compte";
          const separator = next.includes("?") ? "&" : "?";
          router.replace(`${next}${separator}auth=success`);
          router.refresh();
        }
      } catch (error) {
        console.error("[King_TCG] Callback client:", error);
        if (!cancelled) {
          setMessage("Impossible de créer la session King_TCG.");
          router.replace("/parametres/compte?auth=error");
        }
      }
    }

    finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-amber-300" />
        <h1 className="text-lg font-black">King_TCG</h1>
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, BellRing, Check, Cloud, Crown, FileSpreadsheet,
  Globe2, Layers3, Loader2, LogOut, PackageOpen, RefreshCw, ScanLine,
  ShieldCheck, ShoppingBag, Sparkles, Star, UserRound,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAccount } from "@/components/providers/AccountProvider";

type PlanId = "normal" | "premium" | "pro";
type Feature = { title: string; description: string; icon: ComponentType<{ className?: string }> };
type Plan = {
  id: PlanId; name: string; price: string; tagline: string; scans: string;
  scanner: string; accent: "cyan" | "gold" | "amber";
  icon: ComponentType<{ className?: string }>; features: readonly Feature[];
};

const plans: readonly Plan[] = [
  {
    id: "normal", name: "Normal", price: "Gratuit",
    tagline: "Toutes les fonctions essentielles pour gérer une collection.",
    scans: "30 sessions / mois", scanner: "Scanner Mono", accent: "cyan", icon: ShieldCheck,
    features: [
      { title: "Recherche FR · EN · JP · CN", description: "Recherche manuelle illimitée par nom, numéro ou extension.", icon: Globe2 },
      { title: "Collection et favoris", description: "Quantités, états, achats, notes et suivi du portefeuille.", icon: Layers3 },
      { title: "Prix multi-sources", description: "Sources disponibles séparées et cote King_TCG identifiée.", icon: BarChart3 },
      { title: "Items et ventes", description: "Inventaire scellé et suivi des ventes liés au compte.", icon: ShoppingBag },
      { title: "PSA essentiel", description: "Estimation initiale et rangement des cartes gradées.", icon: Star },
      { title: "Cloud King_TCG", description: "Sauvegarde et synchronisation après connexion Google.", icon: Cloud },
    ],
  },
  {
    id: "premium", name: "Premium", price: "4,99 € / mois",
    tagline: "La formule complète pour collectionneurs réguliers.",
    scans: "500 sessions / mois", scanner: "Mono · Batch · Quad", accent: "gold", icon: Crown,
    features: [
      { title: "Tout ce qui est inclus dans Normal", description: "Recherche, collection, favoris, Cloud, Items et ventes.", icon: Check },
      { title: "Scanner Mono, Batch et Quad", description: "Une carte, une série de cartes ou quatre cartes par photo.", icon: ScanLine },
      { title: "Dashboard amélioré", description: "Indicateurs enrichis, tendances et lecture du portefeuille.", icon: BarChart3 },
      { title: "Alertes Premium", description: "Alertes enrichies, mouvements et opportunités prioritaires.", icon: BellRing },
      { title: "PSA avancé", description: "Contrôles supplémentaires et analyse plus détaillée par zone.", icon: ShieldCheck },
      { title: "Items Pokémon avancés", description: "Recherche, collection, favoris et ventes de produits scellés.", icon: PackageOpen },
    ],
  },
  {
    id: "pro", name: "PRO", price: "6,99 € / mois",
    tagline: "Pour vendeurs, boutiques et inventaires à gros volume.",
    scans: "550 sessions / mois", scanner: "Scanner 4.0 · Listing 2/4", accent: "amber", icon: FileSpreadsheet,
    features: [
      { title: "Toutes les fonctions Premium", description: "Le niveau PRO reprend l’intégralité de Premium.", icon: Crown },
      { title: "Listing 2 ou 4 cartes", description: "Capture accélérée de deux ou quatre cartes sur une photo.", icon: ScanLine },
      { title: "40 cartes par session", description: "Nom, numéro et série uniquement pour aller au plus vite.", icon: Layers3 },
      { title: "Export CSV compatible Excel", description: "Listing propre prêt à importer dans les outils métier.", icon: FileSpreadsheet },
      { title: "Ventes et stock", description: "Suivi des sorties, coûts, bénéfices et inventaire produits.", icon: ShoppingBag },
      { title: "Accès aux fonctions PRO", description: "Fonctions professionnelles activées par les droits serveur.", icon: ShieldCheck },
    ],
  },
] as const;

const accentStyles = {
  cyan: { border: "border-cyan-400/25", surface: "bg-cyan-400/[0.045]", soft: "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300", text: "text-cyan-300", line: "from-cyan-400/45", button: "border-cyan-400/30 bg-cyan-400/[0.07] text-cyan-200" },
  gold: { border: "border-[#f5c451]/35", surface: "bg-[#f5c451]/[0.045]", soft: "border-[#f5c451]/30 bg-[#f5c451]/[0.08] text-[#f5c451]", text: "text-[#f5c451]", line: "from-[#f5c451]/50", button: "border-[#f5c451]/50 bg-gradient-to-r from-[#8a5b08] via-[#b77908] to-[#7a4b05] text-white" },
  amber: { border: "border-amber-200/30", surface: "bg-amber-200/[0.04]", soft: "border-amber-200/30 bg-amber-200/[0.08] text-amber-200", text: "text-amber-200", line: "from-amber-200/45", button: "border-amber-200/45 bg-gradient-to-r from-[#79520a] via-[#a8730f] to-[#684405] text-white" },
} as const;

export default function AccountManagementPage() {
  const { account, loading, logout, refreshAccount, syncCloudNow } = useAccount();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") !== "success") return;
    setMessage("Paiement reçu. Activation de la formule en cours…");
    let attempts = 0;
    const timer = window.setInterval(async () => {
      const next = await refreshAccount();
      attempts += 1;
      if (["premium", "pro", "admin"].includes(next.role) || attempts >= 6) {
        window.clearInterval(timer);
        setMessage(["premium", "pro", "admin"].includes(next.role)
          ? `Formule ${next.roleLabel} activée.`
          : "Stripe traite encore l’abonnement. Rechargez cette page dans quelques secondes.");
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [refreshAccount]);

  const quotaPercent = useMemo(() => {
    if (account.unlimited || !account.scanLimit) return 100;
    return Math.min(100, Math.round((account.scansUsed / account.scanLimit) * 100));
  }, [account.scanLimit, account.scansUsed, account.unlimited]);

  async function openBilling(path: "checkout" | "portal", plan?: "premium" | "pro") {
    if (!account.authenticated) { window.location.href = "/api/auth/google"; return; }
    setBusy(plan || path); setMessage("");
    try {
      const response = await fetch(`/api/billing/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan ? { plan } : {}) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Service indisponible");
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible"); setBusy(null);
    }
  }

  async function synchronize() {
    setBusy("cloud"); setMessage("");
    try { setMessage(await syncCloudNow()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Synchronisation impossible"); }
    setBusy(null);
  }

  const activePlan: PlanId | null = account.role === "admin" || account.role === "tester"
    ? "pro" : plans.some((plan) => plan.id === account.role) ? account.role as PlanId : null;

  return <><Navbar /><main className="kt-premium-shell min-h-screen pb-32 text-white"><div className="kt-page-wrap space-y-5">
    <Link href="/parametres" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-[#111821] px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"><ArrowLeft className="h-4 w-4 text-cyan-300" /> Retour aux paramètres</Link>

    <header className="kt-page-header kt-hero-surface relative overflow-hidden border"><div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-400/[0.07] blur-3xl" /><div className="relative flex items-center gap-4"><span className="kt-page-icon flex shrink-0 items-center justify-center text-cyan-300"><UserRound className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-cyan-300">V306 · Compte et abonnements</p><h1 className="kt-page-title mt-1">Compte <span className="text-cyan-300">KING_TCG</span></h1><p className="kt-page-subtitle mt-1">Profil, quota Scanner, Cloud et détail complet des formules.</p></div></div></header>

    <section className="kt-section-surface rounded-[20px] border p-5 sm:p-6">
      {loading ? <div className="flex items-center gap-3 text-sm"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" /> Chargement du compte…</div> : account.authenticated ? <div className="space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">{account.avatarUrl ? <img src={account.avatarUrl} alt="" className="h-14 w-14 rounded-2xl border border-cyan-400/25 object-cover" referrerPolicy="no-referrer" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300"><UserRound className="h-6 w-6" /></span>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-black">{account.displayName || "Dresseur"}</h2><span className="rounded-full border border-[#f5c451]/30 bg-[#f5c451]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#f5c451]">{account.roleLabel}</span></div><p className="mt-1 truncate text-xs text-zinc-300">{account.email}</p>{account.role === "admin" && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">Administrateur · tous les accès · aucune limite</p>}</div></div>
          <div className="flex flex-wrap gap-2"><button onClick={synchronize} disabled={busy !== null} className="rounded-xl border border-cyan-400/25 px-4 py-2.5 text-xs font-black transition hover:bg-cyan-400/[0.06] disabled:opacity-50"><Cloud className="mr-2 inline h-4 w-4" />{busy === "cloud" ? "Synchronisation…" : "Synchroniser"}</button>{account.subscriptionStatus && <button onClick={() => openBilling("portal")} disabled={busy !== null} className="rounded-xl border border-[#f5c451]/30 px-4 py-2.5 text-xs font-black text-[#f5c451] transition hover:bg-[#f5c451]/[0.06] disabled:opacity-50">Gérer l’abonnement</button>}<button onClick={async () => { await logout(); await refreshAccount(); }} className="rounded-xl border border-red-400/20 px-4 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-400/[0.05]"><LogOut className="mr-2 inline h-4 w-4" />Déconnexion</button></div>
        </div>
        <div className="grid gap-3 border-t border-white/[0.06] pt-5 md:grid-cols-[1.4fr_.8fr_.8fr]">
          <div className="rounded-2xl border border-cyan-400/18 bg-cyan-400/[0.035] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Utilisation Scanner</p><p className="mt-1 text-sm font-black text-cyan-100">{account.unlimited ? "Sessions illimitées" : `${account.scansUsed} / ${account.scanLimit} ce mois`}</p></div><ScanLine className="h-5 w-5 text-cyan-300" /></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-[#f5c451]" style={{ width: `${quotaPercent}%` }} /></div><p className="mt-2 text-[10px] text-zinc-400">{account.unlimited ? "Aucun quota appliqué à ce compte." : `${Math.max(0, (account.scanLimit || 0) - account.scansUsed)} session(s) restante(s).`}</p></div>
          <div className="rounded-2xl border border-emerald-400/18 bg-emerald-400/[0.035] p-4"><Cloud className="h-5 w-5 text-emerald-300" /><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">Cloud</p><p className="mt-1 text-xs font-black text-emerald-100">Synchronisation active</p></div>
          <div className="rounded-2xl border border-[#f5c451]/18 bg-[#f5c451]/[0.035] p-4"><ShieldCheck className="h-5 w-5 text-[#f5c451]" /><p className="mt-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">Droits serveur</p><p className="mt-1 text-xs font-black text-amber-100">{account.roleLabel}</p></div>
        </div>
      </div> : <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300"><UserRound className="h-5 w-5" /></span><div><h2 className="text-base font-black">Connexion Google sécurisée</h2><p className="mt-1 max-w-xl text-xs leading-5 text-zinc-300">Sans compte : recherches manuelles libres et 5 sessions Scanner. Créez gratuitement un compte pour obtenir 30 sessions mensuelles, sauvegarder et synchroniser vos données.</p>{!account.configured && <p className="mt-2 text-xs font-bold text-amber-300">Supabase doit encore être relié dans les variables Vercel.</p>}</div></div><a href="/api/auth/google" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 text-xs font-black text-[#202124] shadow-lg transition hover:bg-zinc-100">Continuer avec Google</a></div>}
      {message && <p className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] px-4 py-3 text-xs font-bold text-cyan-100"><RefreshCw className="h-4 w-4 shrink-0" />{message}</p>}
    </section>

    <section><div className="mb-4 flex items-center gap-3"><Sparkles className="h-4 w-4 text-[#f5c451]" /><div><h2 className="text-sm font-black uppercase tracking-wider">Choisissez votre formule</h2><p className="mt-1 text-[10px] text-zinc-400">Les recherches manuelles restent accessibles sans abonnement.</p></div><span className="h-px flex-1 bg-gradient-to-r from-[#f5c451]/35 to-transparent" /></div>
      <div className="grid items-start gap-4 lg:grid-cols-3">{plans.map((plan) => { const style = accentStyles[plan.accent]; const Icon = plan.icon; const isActive = activePlan === plan.id; const canSubscribe = plan.id !== "normal"; return <article key={plan.id} className={`kt-plan-card relative overflow-hidden rounded-[20px] border p-4 sm:p-5 ${style.border} ${style.surface}`}>
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-current opacity-[0.025] blur-3xl" />
        <div className="relative text-center"><span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${style.soft}`}><Icon className="h-5 w-5" /></span><div className="mt-3 flex min-h-7 items-center justify-center gap-2"><h3 className={`text-lg font-black uppercase tracking-tight ${style.text}`}>{plan.name}</h3>{isActive && <span className="rounded-full border border-emerald-300/30 bg-emerald-300/[0.08] px-2 py-1 text-[8px] font-black uppercase tracking-wider text-emerald-300">Actuelle</span>}</div><p className="mx-auto mt-1 min-h-10 max-w-xs text-[11px] leading-5 text-zinc-300">{plan.tagline}</p><p className="mt-4 text-2xl font-black text-white">{plan.price}</p><div className={`mt-4 rounded-2xl border px-4 py-3 text-left ${style.soft}`}><p className="text-[9px] font-black uppercase tracking-widest">{plan.scanner}</p><p className="mt-1 text-sm font-black text-white">{plan.scans}</p></div></div>
        <div className="relative mt-5 border-t border-white/[0.07] pt-5"><div className="mb-3 flex items-center gap-2"><Sparkles className={`h-4 w-4 ${style.text}`} /><h4 className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>Ce qui est inclus</h4><span className={`h-px flex-1 bg-gradient-to-r ${style.line} to-transparent`} /></div><div className="overflow-hidden rounded-2xl border border-white/[0.055] bg-black/15">{plan.features.map((feature, index) => { const FeatureIcon = feature.icon; return <div key={feature.title} className={`flex gap-3 p-3.5 ${index ? "border-t border-white/[0.055]" : ""}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.soft}`}><FeatureIcon className="h-4 w-4" /></span><div><p className="text-[11px] font-black text-white">{feature.title}</p><p className="mt-0.5 text-[10px] leading-4 text-zinc-400">{feature.description}</p></div></div>; })}</div>
          {canSubscribe ? <button onClick={() => openBilling("checkout", plan.id as "premium" | "pro")} disabled={busy !== null || account.role === "admin" || account.role === "tester" || isActive} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-wider shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 ${style.button}`}><Icon className="h-4 w-4" />{busy === plan.id ? "Ouverture de Stripe…" : account.role === "admin" || account.role === "tester" ? "Tous les accès sont actifs" : isActive ? "Formule actuelle" : `Choisir ${plan.name}`}</button> : <div className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-wider ${style.button}`}><ShieldCheck className="h-4 w-4" />{isActive ? "Formule actuelle" : "Compte gratuit"}</div>}
        </div>
      </article>; })}</div>
    </section>

    <section className="kt-section-surface rounded-[20px] border p-5 sm:p-6"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300"><Cloud className="h-5 w-5" /></span><div><h2 className="text-sm font-black">Ce qui est synchronisé dans le Cloud</h2><p className="mt-1 text-[11px] leading-5 text-zinc-300">Collection de cartes, cartes PSA, favoris, Items, ventes et préférences. La recherche manuelle reste libre et ne consomme aucune session Scanner.</p></div></div></section>
  </div></main></>;
}

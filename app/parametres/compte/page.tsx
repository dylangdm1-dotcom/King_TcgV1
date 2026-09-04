"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Cloud, Crown, FileSpreadsheet, Loader2, LogOut, ScanLine, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAccount } from "@/components/providers/AccountProvider";

const plans = [
  { id:"normal", name:"Normal", price:"Gratuit", scans:"30 / mois", features:["Recherche illimitée","Scanner Mono","Collection, favoris et ventes","Synchronisation Cloud"] },
  { id:"premium", name:"Premium", price:"4,99 € / mois", scans:"500 / mois", features:["Tout Normal","Scanner Mono, Batch et Quad","Alertes et PSA avancés","Portail d’abonnement Stripe"] },
  { id:"pro", name:"PRO", price:"6,99 € / mois", scans:"550 / mois", features:["Tout Premium","Listing 2 ou 4 cartes","40 lignes par session","Export CSV compatible Excel"] },
] as const;

export default function AccountManagementPage(){
  const {account,loading,logout,refreshAccount,syncCloudNow}=useAccount();
  const [busy,setBusy]=useState<string|null>(null); const [message,setMessage]=useState("");
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("checkout")!=="success")return;setMessage("Paiement reçu. Activation de la formule en cours…");let attempts=0;const timer=window.setInterval(async()=>{const next=await refreshAccount();attempts+=1;if(["premium","pro","admin"].includes(next.role)||attempts>=6){window.clearInterval(timer);setMessage(["premium","pro","admin"].includes(next.role)?`Formule ${next.roleLabel} activée.`:"Stripe traite encore l’abonnement. Rechargez cette page dans quelques secondes.");}},1500);return()=>window.clearInterval(timer);},[refreshAccount]);
  async function openBilling(path:"checkout"|"portal",plan?:"premium"|"pro"){
    if(!account.authenticated){window.location.href="/api/auth/google";return;}
    setBusy(plan||path);setMessage("");
    try{const response=await fetch(`/api/billing/${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(plan?{plan}:{})});const data=await response.json();if(!response.ok||!data.url)throw new Error(data.error||"Service indisponible");window.location.assign(data.url);}catch(error){setMessage(error instanceof Error?error.message:"Action impossible");setBusy(null);}
  }
  async function synchronize(){setBusy("cloud");setMessage("");try{setMessage(await syncCloudNow());}catch(error){setMessage(error instanceof Error?error.message:"Synchronisation impossible");}setBusy(null);}
  return <><Navbar/><main className="kt-premium-shell min-h-screen pb-32 text-white"><div className="kt-page-wrap space-y-5">
    <Link href="/parametres" className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-[#111821] px-3 py-2 text-xs font-bold"><ArrowLeft className="h-4 w-4"/>Paramètres</Link>
    <header className="kt-page-header kt-hero-surface border"><div className="flex items-center gap-4"><span className="kt-page-icon flex items-center justify-center text-cyan-300"><UserRound className="h-5 w-5"/></span><div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">V306 · Comptes actifs</p><h1 className="kt-page-title">Compte <span className="text-cyan-300">KING_TCG</span></h1><p className="kt-page-subtitle mt-1">Connexion Google, droits serveur, Cloud et abonnements Stripe.</p></div></div></header>
    <section className="kt-section-surface rounded-[20px] border p-5 sm:p-6">
      {loading?<div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-cyan-300"/>Chargement du compte…</div>:account.authenticated?<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-300"/><h2 className="font-black">{account.displayName||"Dresseur"}</h2><span className="rounded-full border border-[#f5c451]/30 bg-[#f5c451]/10 px-2.5 py-1 text-[10px] font-black text-[#f5c451]">{account.roleLabel}</span></div><p className="mt-2 text-xs text-zinc-300">{account.email}</p><p className="mt-2 text-xs font-bold text-cyan-200">Scanner : {account.unlimited?"illimité":`${account.scansUsed} / ${account.scanLimit} ce mois`}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={synchronize} disabled={busy!==null} className="rounded-xl border border-cyan-400/25 px-4 py-2 text-xs font-black"><Cloud className="mr-2 inline h-4 w-4"/>Synchroniser</button>{account.subscriptionStatus&&<button onClick={()=>openBilling("portal")} disabled={busy!==null} className="rounded-xl border border-[#f5c451]/30 px-4 py-2 text-xs font-black text-[#f5c451]">Gérer l’abonnement</button>}<button onClick={async()=>{await logout();await refreshAccount();}} className="rounded-xl border border-red-400/20 px-4 py-2 text-xs font-black text-red-200"><LogOut className="mr-2 inline h-4 w-4"/>Déconnexion</button></div>
      </div>:<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-black">Connexion Google sécurisée</h2><p className="mt-1 text-xs leading-5 text-zinc-300">Sans compte : recherches manuelles libres et 5 sessions Scanner. Créez un compte pour continuer à scanner et synchroniser vos données.</p>{!account.configured&&<p className="mt-2 text-xs font-bold text-amber-300">Supabase doit encore être relié dans les variables Vercel.</p>}</div><a href="/api/auth/google" className="rounded-xl bg-white px-5 py-3 text-center text-xs font-black text-[#202124]">Continuer avec Google</a></div>}
      {message&&<p className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[.06] px-4 py-3 text-xs font-bold text-cyan-100">{message}</p>}
    </section>
    <section><div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#f5c451]"/><h2 className="text-sm font-black uppercase tracking-wider">Formules</h2></div><div className="grid gap-4 lg:grid-cols-3">{plans.map(plan=><article key={plan.id} className={`rounded-[20px] border p-5 ${plan.id!=="normal"?"border-[#f5c451]/30 bg-[#f5c451]/[.035]":"border-cyan-400/20 bg-[#111821]"}`}><div className="flex items-center justify-between"><h3 className={`text-lg font-black ${plan.id!=="normal"?"text-[#f5c451]":"text-cyan-300"}`}>{plan.name}</h3>{plan.id==="pro"?<FileSpreadsheet className="h-5 w-5 text-[#f5c451]"/>:plan.id==="premium"?<Crown className="h-5 w-5 text-[#f5c451]"/>:<ScanLine className="h-5 w-5 text-cyan-300"/>}</div><p className="mt-3 text-2xl font-black">{plan.price}</p><p className="mt-1 text-xs font-bold text-zinc-300">{plan.scans} sessions Scanner</p><ul className="mt-5 space-y-2">{plan.features.map(feature=><li key={feature} className="flex gap-2 text-xs text-zinc-200"><Check className="h-4 w-4 shrink-0 text-emerald-300"/>{feature}</li>)}</ul>{plan.id!=="normal"&&<button onClick={()=>openBilling("checkout",plan.id)} disabled={busy!==null||account.role==="admin"||account.role==="tester"} className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#8a5b08] to-[#c38a14] px-4 py-3 text-xs font-black disabled:opacity-50">{busy===plan.id?"Ouverture de Stripe…":["admin","tester"].includes(account.role)?"Tous les accès actifs":`Choisir ${plan.name}`}</button>}</article>)}</div></section>
  </div></main></>;
}

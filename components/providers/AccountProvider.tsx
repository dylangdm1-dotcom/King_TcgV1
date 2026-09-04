"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AccountState } from "@/lib/auth/types";
import { PLAN_LIMITS, roleFeatures, roleLabel } from "@/lib/auth/plans";

const GUEST: AccountState = { authenticated:false, configured:false, id:null, email:null, displayName:null, avatarUrl:null, role:"guest", roleLabel:roleLabel("guest"), subscriptionStatus:null, scanLimit:PLAN_LIMITS.guest, scansUsed:0, quotaEndsAt:"", unlimited:false, features:roleFeatures("guest") };
const CLOUD_KEYS: Record<string,string[]> = {
  cards:["king_tcg_collection","king_tcg_collection_infos","king_tcg_psa_collection_v1"], favorites:["king_tcg_favs","king_tcg_item_favorites_v1"],
  items:["king_tcg_item_collection_v1","king_tcg_custom_items_v1"], sales:["king_tcg_sales_v1"], settings:["king_tcg_theme","king_tcg_account_profile_v1"],
};
type AccountContextValue = { account:AccountState; loading:boolean; refreshAccount:()=>Promise<AccountState>; syncCloudNow:()=>Promise<string>; logout:()=>Promise<void> };
const AccountContext = createContext<AccountContextValue|null>(null);

export function AccountProvider({children}:{children:ReactNode}) {
  const [account,setAccount]=useState<AccountState>(GUEST); const [loading,setLoading]=useState(true);
  const refreshAccount=useCallback(async()=>{try{const response=await fetch("/api/auth/me",{cache:"no-store"});const data=await response.json();const next=data?.account||GUEST;setAccount(next);return next;}catch{setAccount(GUEST);return GUEST;}finally{setLoading(false);}},[]);
  useEffect(()=>{void refreshAccount();},[refreshAccount]);
  const syncCloudNow=useCallback(async()=>{if(!account.authenticated)throw new Error("Connexion requise");const response=await fetch("/api/cloud/state",{cache:"no-store"});if(!response.ok)throw new Error("Synchronisation Cloud indisponible");const remote=await response.json();const byKind=new Map((remote.states||[]).map((row:any)=>[row.kind,row]));for(const [kind,keys] of Object.entries(CLOUD_KEYS)){const row:any=byKind.get(kind);if(row?.payload&&typeof row.payload==="object"){for(const [key,value] of Object.entries(row.payload)){if(keys.includes(key)&&typeof value==="string")localStorage.setItem(key,value);}}else{const payload=Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)]).filter(([,value])=>value!==null));await fetch("/api/cloud/state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,payload,version:Date.now()})});}}window.dispatchEvent(new Event("king_tcg_update"));return "Données Cloud synchronisées";},[account.authenticated]);
  useEffect(()=>{if(!account.authenticated||!account.id)return;const marker=`king_tcg_cloud_boot_${account.id}`;if(sessionStorage.getItem(marker))return;sessionStorage.setItem(marker,"1");void syncCloudNow().catch(()=>sessionStorage.removeItem(marker));},[account.authenticated,account.id,syncCloudNow]);
  useEffect(()=>{
    if(!account.authenticated)return;
    let timer:number|undefined;
    const upload=()=>{window.clearTimeout(timer);timer=window.setTimeout(()=>{for(const [kind,keys] of Object.entries(CLOUD_KEYS)){const payload=Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)]).filter(([,value])=>value!==null));void fetch("/api/cloud/state",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,payload,version:Date.now()})});}},900);};
    window.addEventListener("king_tcg_update",upload);window.addEventListener("king_tcg_sales_update",upload);window.addEventListener("storage",upload);
    return()=>{window.clearTimeout(timer);window.removeEventListener("king_tcg_update",upload);window.removeEventListener("king_tcg_sales_update",upload);window.removeEventListener("storage",upload);};
  },[account.authenticated]);
  const logout=useCallback(async()=>{await fetch("/api/auth/logout",{method:"POST"});setAccount(GUEST);},[]);
  const value=useMemo(()=>({account,loading,refreshAccount,syncCloudNow,logout}),[account,loading,logout,refreshAccount,syncCloudNow]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
export function useAccount(){const value=useContext(AccountContext);if(!value)throw new Error("AccountProvider manquant");return value;}

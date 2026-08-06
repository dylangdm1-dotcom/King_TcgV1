"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, ChevronRight, Sparkles, TrendingUp, X } from "lucide-react";
import { getFavorites, getCollection } from "@/lib/storage";

const READ_KEY = "king_tcg_notifications_last_read";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "market" | "collection" | "system";
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = Number(localStorage.getItem(READ_KEY) || 0);
    setLastRead(Number.isFinite(stored) ? stored : 0);
  }, []);

  const notifications = useMemo<NotificationItem[]>(() => {
    if (typeof window === "undefined") return [];
    const favorites = getFavorites();
    const collection = getCollection();
    const collectionCount = Object.keys(collection).length;

    const items: NotificationItem[] = [
      {
        id: "market-sync",
        title: "Marché synchronisé",
        description: "Les cotations visibles sont prêtes à être consultées.",
        href: "/recherche",
        tone: "market",
      },
    ];

    if (favorites.length > 0) {
      items.push({
        id: "favorites-watch",
        title: `${favorites.length} favori${favorites.length > 1 ? "s" : ""} surveillé${favorites.length > 1 ? "s" : ""}`,
        description: "Ouvrez votre watchlist pour vérifier les dernières opportunités.",
        href: "/favoris",
        tone: "market",
      });
    }

    if (collectionCount > 0) {
      items.push({
        id: "collection-review",
        title: "Portefeuille à jour",
        description: `${collectionCount} carte${collectionCount > 1 ? "s" : ""} unique${collectionCount > 1 ? "s" : ""} suivie${collectionCount > 1 ? "s" : ""} dans votre collection.`,
        href: "/collection",
        tone: "collection",
      });
    }

    items.push({
      id: "opportunities",
      title: "Opportunités King_TCG",
      description: "Consultez les cartes à fort potentiel détectées localement.",
      href: "/opportunity",
      tone: "system",
    });

    return items;
  }, [open]);

  const unread = lastRead === 0 ? notifications.length : 0;

  function markRead() {
    const now = Date.now();
    localStorage.setItem(READ_KEY, String(now));
    setLastRead(now);
  }

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next) markRead();
      return next;
    });
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#151b23] text-zinc-300 shadow-inner transition hover:border-amber-300/25 hover:text-white"
        aria-label="Ouvrir les notifications"
      >
        {open ? <BellRing className="h-4 w-4 text-amber-300" /> : <Bell className="h-4 w-4" />}
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,.7)]" />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Fermer les notifications"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px] md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 top-[72px] z-[80] overflow-hidden rounded-[22px] border border-white/[0.1] bg-[#11171e]/98 shadow-[0_28px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl md:absolute md:inset-auto md:right-0 md:top-12 md:w-[360px]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white">Notifications</p>
                  <p className="mt-0.5 text-[9px] font-medium text-zinc-500">Alertes, opportunités et activité locale</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">
                {notifications.map((item) => {
                  const Icon = item.tone === "market" ? TrendingUp : Sparkles;
                  const tone = item.tone === "market"
                    ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300"
                    : item.tone === "collection"
                      ? "border-violet-400/15 bg-violet-400/[0.05] text-violet-300"
                      : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300";

                  return (
                    <Link
                      href={item.href}
                      key={item.id}
                      onClick={() => setOpen(false)}
                      className="group flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#171d25] p-3.5 transition hover:border-white/[0.13] hover:bg-[#1a212b]"
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-black text-white">{item.title}</span>
                        <span className="mt-1 block text-[10px] leading-4 text-zinc-500">{item.description}</span>
                      </span>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white" />
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BellRing,
  ChevronRight,
  BadgeEuro,
  ChartNoAxesCombined,
  CircleCheckBig,
  ShieldAlert,
  X,
} from "lucide-react";
import { getSignalSnapshot, refreshSignalSnapshotIfNeeded } from "@/lib/signalSnapshot";

const READ_KEY = "king_tcg_notifications_last_read";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "rise" | "drop" | "opportunity" | "system";
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState(0);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = Number(localStorage.getItem(READ_KEY) || 0);
    setLastRead(Number.isFinite(stored) ? stored : 0);

    const refresh = () => setSnapshotVersion((value) => value + 1);
    window.addEventListener("king_tcg_signals_update", refresh);
    window.addEventListener("king_tcg_update", refresh);
    window.addEventListener("storage_favorites_update", refresh);

    return () => {
      window.removeEventListener("king_tcg_signals_update", refresh);
      window.removeEventListener("king_tcg_update", refresh);
      window.removeEventListener("storage_favorites_update", refresh);
    };
  }, []);

  const snapshot = useMemo(() => getSignalSnapshot(), [open, snapshotVersion]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    if (snapshot.updatedAt > 0) {
      const updated = new Date(snapshot.updatedAt);
      const timeLabel = updated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      items.push({
        id: `system-market-${snapshot.updatedAt}`,
        title: "Marché à jour",
        description: `Dernière synchronisation des signaux à ${timeLabel}.`,
        href: "/dashboard",
        tone: "system",
      });
    }

    snapshot.alerts.slice(0, 4).forEach((alert) => {
      const isRise = alert.type === "RISE";
      const isDrop = alert.type === "DROP";
      items.push({
        id: `alert-${alert.cardId}-${alert.type}`,
        title: isRise
            ? `Hausse · ${alert.cardName}${alert.cardNumber ? ` #${alert.cardNumber}` : ""}`
          : isDrop
            ? `Baisse · ${alert.cardName}${alert.cardNumber ? ` #${alert.cardNumber}` : ""}`
            : `Opportunité · ${alert.cardName}${alert.cardNumber ? ` #${alert.cardNumber}` : ""}`,
        description: isRise
          ? `Hausse de ${Math.abs(Number(alert.changePercent || 0)).toFixed(2)} % sur 7 jours.`
          : isDrop
          ? `Recul de ${Math.abs(Number(alert.changePercent || 0)).toFixed(2)} % sur 7 jours.`
          : `Zone d’achat potentielle détectée par King_TCG.`,
        href: `/card/${encodeURIComponent(alert.cardId)}`,
        tone: isRise ? "rise" : isDrop ? "drop" : "opportunity",
      });
    });

    snapshot.opportunities
      .filter((item) => item.recommendation === "BUY" || item.recommendation === "SELL")
      .slice(0, 3)
      .forEach((item) => {
        items.push({
          id: `op-${item.id}-${item.recommendation}`,
          title: `${item.recommendation === "BUY" ? "Signal d'achat" : "Signal de vente"} · ${item.name}${item.number ? ` #${item.number}` : ""}`,
          description: `${item.currentPrice.toFixed(2)} € · tendance ${item.trend >= 0 ? "+" : ""}${item.trend.toFixed(2)} %`,
          href: "/opportunity",
          tone: item.recommendation === "BUY" ? "opportunity" : "drop",
        });
      });

    if (items.length === 0) {
      items.push({
        id: "no-signal",
        title: "Aucun signal majeur",
        description:
          snapshot.updatedAt > 0
            ? "Les dernières analyses n'ont détecté aucune alerte exploitable."
            : "Ouvre Alertes ou Opportunités pour lancer la première analyse du portefeuille.",
        href: "/alerts",
        tone: "system",
      });
    }

    return items;
  }, [snapshot]);

  const unread = snapshot.updatedAt > lastRead && snapshot.updatedAt > 0
    ? Math.min(notifications.length, 9)
    : 0;

  function markRead() {
    const now = Date.now();
    localStorage.setItem(READ_KEY, String(now));
    setLastRead(now);
  }

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (next) {
        void refreshSignalSnapshotIfNeeded().finally(() => {
          setSnapshotVersion((value) => value + 1);
        });
        markRead();
      }
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
          <span className="absolute right-1 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[8px] font-black text-black shadow-[0_0_12px_rgba(251,191,36,.7)]">
            {unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Fermer les notifications"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-[#020305]/80 backdrop-blur-[6px]"
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="kt-notification-panel fixed inset-x-3 top-[72px] z-[80] overflow-hidden rounded-[22px] border border-cyan-100/25 bg-[#121821] shadow-[0_30px_90px_rgba(0,0,0,.82),0_0_0_1px_rgba(125,211,252,.08)] md:absolute md:inset-auto md:right-0 md:top-12 md:w-[380px]"
            >
              <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3.5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white">Notifications</p>
                  <p className="mt-0.5 text-[9px] font-medium text-zinc-500">Vrais signaux Alertes + Opportunités</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] space-y-2 overflow-y-auto p-3">
                {notifications.map((item) => {
                  const Icon = item.tone === "rise"
                    ? ChartNoAxesCombined
                    : item.tone === "drop"
                      ? ShieldAlert
                      : item.tone === "system"
                        ? CircleCheckBig
                        : BadgeEuro;
                  const tone = item.tone === "rise"
                    ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300"
                    : item.tone === "drop"
                      ? "border-rose-400/15 bg-rose-400/[0.05] text-rose-300"
                      : item.tone === "opportunity"
                        ? "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"
                        : "border-cyan-400/15 bg-cyan-400/[0.05] text-cyan-300";

                  return (
                    <Link
                      href={item.href}
                      key={item.id}
                      onClick={() => setOpen(false)}
                      data-tone={item.tone}
                      className="kt-notification-row group flex items-start gap-3 rounded-2xl border p-3.5 shadow-[0_8px_22px_rgba(0,0,0,.18)] transition hover:border-cyan-100/25 hover:bg-[#202934]"
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

              <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] p-3">
                <Link href="/alerts" onClick={() => setOpen(false)} className="rounded-xl border border-rose-300/[0.48] bg-rose-400/[0.08] px-3 py-2 text-center text-[10px] font-bold text-rose-300 transition hover:border-rose-200/[0.72] hover:bg-rose-400/[0.14]">Toutes les alertes</Link>
                <Link href="/opportunity" onClick={() => setOpen(false)} className="rounded-xl border border-amber-300/[0.48] bg-amber-400/[0.08] px-3 py-2 text-center text-[10px] font-bold text-amber-300 transition hover:border-amber-200/[0.72] hover:bg-amber-400/[0.14]">Opportunités</Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

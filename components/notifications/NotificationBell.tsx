"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  BellRing,
  ChevronRight,
  CircleCheckBig,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Activity,
  Eye,
  X,
} from "lucide-react";
import { getSignalSnapshot, refreshSignalSnapshotIfNeeded } from "@/lib/signalSnapshot";

const READ_KEY = "king_tcg_notifications_last_read";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "important" | "watch" | "opportunity" | "system";
};

type NotificationGroup = {
  key: "important" | "watch" | "opportunity" | "system";
  title: string;
  href: string;
  items: NotificationItem[];
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

  const notificationGroups = useMemo<NotificationGroup[]>(() => {
    const importantAlerts = snapshot.alerts
      .filter((alert) => Math.abs(Number(alert.changePercent || 0)) >= 25)
      .sort(
        (a, b) =>
          Math.abs(Number(b.changePercent || 0)) -
          Math.abs(Number(a.changePercent || 0))
      )
      .slice(0, 3)
      .map<NotificationItem>((alert) => ({
        id: `important-${alert.cardId}-${alert.type}`,
        title: `${alert.cardName}${alert.cardNumber ? ` #${alert.cardNumber}` : ""}`,
        description: `${Number(alert.changePercent || 0) > 0 ? "+" : ""}${Number(alert.changePercent || 0).toFixed(1)} % · mouvement important`,
        href: `/card/${encodeURIComponent(alert.cardId)}`,
        tone: "important",
      }));

    const watchAlerts = snapshot.alerts
      .filter((alert) => {
        const magnitude = Math.abs(Number(alert.changePercent || 0));
        return magnitude >= 10 && magnitude < 25;
      })
      .sort(
        (a, b) =>
          Math.abs(Number(b.changePercent || 0)) -
          Math.abs(Number(a.changePercent || 0))
      )
      .slice(0, 3)
      .map<NotificationItem>((alert) => ({
        id: `watch-${alert.cardId}-${alert.type}`,
        title: `${alert.cardName}${alert.cardNumber ? ` #${alert.cardNumber}` : ""}`,
        description: `${Number(alert.changePercent || 0) > 0 ? "+" : ""}${Number(alert.changePercent || 0).toFixed(1)} % · à surveiller`,
        href: `/card/${encodeURIComponent(alert.cardId)}`,
        tone: "watch",
      }));

    const opportunityItems = snapshot.opportunities
      .filter((item) => item.recommendation === "BUY")
      .sort(
        (a, b) =>
          Math.abs(b.trend) - Math.abs(a.trend) ||
          b.currentPrice - a.currentPrice
      )
      .slice(0, 3)
      .map<NotificationItem>((item) => ({
        id: `opportunity-${item.id}`,
        title: `${item.name}${item.number ? ` #${item.number}` : ""}`,
        description: `${item.trend >= 0 ? "+" : ""}${item.trend.toFixed(1)} % · opportunité détectée`,
        href: "/opportunity",
        tone: "opportunity",
      }));

    const systemItems: NotificationItem[] = [];
    if (snapshot.updatedAt > 0) {
      const updated = new Date(snapshot.updatedAt);
      const timeLabel = updated.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      systemItems.push({
        id: `system-market-${snapshot.updatedAt}`,
        title: "Marché à jour",
        description: `Dernière synchronisation des signaux à ${timeLabel}.`,
        href: "/dashboard",
        tone: "system",
      });
    }

    const groups: NotificationGroup[] = [
      {
        key: "important",
        title: "Alertes importantes",
        href: "/alerts",
        items: importantAlerts,
      },
      {
        key: "watch",
        title: "À surveiller",
        href: "/alerts",
        items: watchAlerts,
      },
      {
        key: "opportunity",
        title: "Opportunités détectées",
        href: "/opportunity",
        items: opportunityItems,
      },
      {
        key: "system",
        title: "Informations marché",
        href: "/alerts",
        items: systemItems,
      },
    ].filter((group) => group.items.length > 0);

    if (groups.length === 0) {
      return [
        {
          key: "system",
          title: "Informations marché",
          href: "/alerts",
          items: [
            {
              id: "no-signal",
              title: "Aucun signal majeur",
              description:
                snapshot.updatedAt > 0
                  ? "Les dernières analyses n'ont détecté aucun signal prioritaire."
                  : "Ouvre Alertes ou Opportunités pour lancer la première analyse.",
              href: "/alerts",
              tone: "system",
            },
          ],
        },
      ];
    }

    return groups;
  }, [snapshot]);

  const notificationCount = notificationGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );

  const unread = snapshot.updatedAt > lastRead && snapshot.updatedAt > 0
    ? Math.min(notificationCount, 9)
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
                  <p className="mt-0.5 text-[9px] font-medium text-zinc-500">Synthèse priorisée des signaux du portefeuille</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.05] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] space-y-3 overflow-y-auto p-3">
                {notificationGroups.map((group) => {
                  const groupTone =
                    group.key === "important"
                      ? {
                          border: "border-rose-300/16",
                          bg: "bg-rose-400/[0.025]",
                          text: "text-rose-300",
                          icon: ShieldAlert,
                        }
                      : group.key === "watch"
                        ? {
                            border: "border-amber-300/16",
                            bg: "bg-amber-400/[0.025]",
                            text: "text-amber-300",
                            icon: Eye,
                          }
                        : group.key === "opportunity"
                          ? {
                              border: "border-emerald-300/16",
                              bg: "bg-emerald-400/[0.025]",
                              text: "text-emerald-300",
                              icon: TrendingUp,
                            }
                          : {
                              border: "border-cyan-300/16",
                              bg: "bg-cyan-400/[0.025]",
                              text: "text-cyan-300",
                              icon: Activity,
                            };

                  const GroupIcon = groupTone.icon;

                  return (
                    <section
                      key={group.key}
                      className={`overflow-hidden rounded-[16px] border ${groupTone.border} ${groupTone.bg}`}
                    >
                      <Link
                        href={group.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <GroupIcon className={`h-3.5 w-3.5 shrink-0 ${groupTone.text}`} />
                          <span className={`truncate text-[9px] font-black uppercase tracking-[0.1em] ${groupTone.text}`}>
                            {group.title}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-black ${groupTone.border} ${groupTone.text}`}>
                          {group.items.length}
                        </span>
                      </Link>

                      <div className="border-t border-white/[0.05]">
                        {group.items.map((item) => {
                          const trendNegative = item.description.trim().startsWith("-");
                          const trendPositive = item.description.trim().startsWith("+");

                          return (
                            <Link
                              href={item.href}
                              key={item.id}
                              onClick={() => setOpen(false)}
                              className="group flex items-center gap-2 border-b border-white/[0.045] px-3 py-2 last:border-b-0 hover:bg-white/[0.025]"
                            >
                              {group.key === "important" ? (
                                trendNegative ? (
                                  <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                                ) : (
                                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                                )
                              ) : group.key === "watch" ? (
                                trendNegative ? (
                                  <TrendingDown className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                                ) : trendPositive ? (
                                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                                )
                              ) : group.key === "opportunity" ? (
                                <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                              ) : (
                                <CircleCheckBig className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                              )}

                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[10px] font-black text-white">
                                  {item.title}
                                </span>
                                <span className="mt-0.5 block truncate text-[9px] text-zinc-500">
                                  {item.description}
                                </span>
                              </span>

                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-white" />
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] p-3">
                <Link href="/alerts" onClick={() => setOpen(false)} className="rounded-xl border border-rose-300/[0.48] bg-rose-400/[0.08] px-3 py-2 text-center text-[10px] font-bold text-rose-300 transition hover:border-rose-200/[0.72] hover:bg-rose-400/[0.14]">Voir toutes les alertes</Link>
                <Link href="/opportunity" onClick={() => setOpen(false)} className="rounded-xl border border-amber-300/[0.48] bg-amber-400/[0.08] px-3 py-2 text-center text-[10px] font-bold text-amber-300 transition hover:border-amber-200/[0.72] hover:bg-amber-400/[0.14]">Voir les opportunités</Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

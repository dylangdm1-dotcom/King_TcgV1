"use client";

import React from "react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean };

export default class SafeSection extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  componentDidCatch(error: unknown) { console.error("[King_TCG SafeSection]", error); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#18202a] p-4 text-xs font-medium text-zinc-400">
          Cette section est temporairement indisponible. Les autres données de la carte restent accessibles.
        </div>
      );
    }
    return this.props.children;
  }
}

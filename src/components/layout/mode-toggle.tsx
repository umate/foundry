"use client";

import { useSyncExternalStore } from "react";
import { useMode } from "@/components/providers/mode-provider";

const emptySubscribe = () => () => {};

export function ModeToggle() {
  const { isDevMode, toggleMode } = useMode();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  if (!mounted) {
    // Placeholder during hydration to prevent layout shift
    return (
      <button
        disabled
        className="h-7 px-3 rounded-sm bg-muted text-muted-foreground font-mono text-xs uppercase tracking-wider opacity-50"
      >
        DEV
      </button>
    );
  }

  return (
    <button
      onClick={toggleMode}
      className={`h-7 px-3 rounded-sm font-mono text-xs uppercase tracking-wider transition-colors ${
        isDevMode
          ? "bg-secondary text-secondary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
      title={isDevMode ? "Switch to PM Mode (hide technical details)" : "Switch to Dev Mode (show all details)"}
    >
      DEV
    </button>
  );
}

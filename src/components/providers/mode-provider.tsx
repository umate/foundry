"use client";

import { createContext, useContext, useCallback, useMemo, useSyncExternalStore } from "react";

// Mode types
export type ViewMode = "pm" | "dev";

// localStorage key for per-feature persistence
const MODE_STORAGE_KEY = "foundry:featureMode";

// Default mode is PM mode (hides technical details)
const DEFAULT_MODE: ViewMode = "pm";

// localStorage helpers with SSR safety — stores a map of { [featureId]: ViewMode }
function getStoredModeMap(): Record<string, ViewMode> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getStoredFeatureMode(featureId: string): ViewMode {
  const map = getStoredModeMap();
  return map[featureId] ?? DEFAULT_MODE;
}

function setStoredFeatureMode(featureId: string, mode: ViewMode): void {
  if (typeof window === "undefined") return;
  const map = getStoredModeMap();
  map[featureId] = mode;
  localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(map));
}

// Subscribe to storage events for cross-tab sync + in-page updates
const listeners = new Set<() => void>();

function emitModeChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  // Also listen for cross-tab storage events
  const handleStorage = (e: StorageEvent) => {
    if (e.key === MODE_STORAGE_KEY) {
      callback();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

// Context value type
interface ModeContextValue {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;
  isDevMode: boolean;
  isPMMode: boolean;
  featureId: string | null;
}

const ModeContext = createContext<ModeContextValue | null>(null);

interface ModeProviderProps {
  featureId: string | null;
  children: React.ReactNode;
}

export function ModeProvider({ featureId, children }: ModeProviderProps) {
  // Use useSyncExternalStore for hydration-safe localStorage access
  const mode = useSyncExternalStore(
    subscribe,
    () => (featureId ? getStoredFeatureMode(featureId) : DEFAULT_MODE),
    () => DEFAULT_MODE // Server snapshot
  );

  const setMode = useCallback((newMode: ViewMode) => {
    if (featureId) {
      setStoredFeatureMode(featureId, newMode);
      emitModeChange();
    }
  }, [featureId]);

  const toggleMode = useCallback(() => {
    if (featureId) {
      const currentMode = getStoredFeatureMode(featureId);
      const newMode = currentMode === "pm" ? "dev" : "pm";
      setStoredFeatureMode(featureId, newMode);
      emitModeChange();
    }
  }, [featureId]);

  const value = useMemo<ModeContextValue>(() => ({
    mode,
    setMode,
    toggleMode,
    isDevMode: mode === "dev",
    isPMMode: mode === "pm",
    featureId,
  }), [mode, setMode, toggleMode, featureId]);

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return context;
}

// Message part types that should be hidden in PM mode
const PM_MODE_HIDDEN_PARTS = new Set([
  "tool-use",
  "file-search-result",
  "file-read-result",
  "file-write-result",
  "file-edit-result",
  "bash-result",
  "activity",
  "raw",
]);

// Message part types that should always be shown
const ALWAYS_SHOWN_PARTS = new Set([
  "text",
  "image",
  "tool-generateSpec",
  "tool-updateSpec",
  "tool-generateWireframe",
  "clarification",
  "todo-list",
  "tool-error", // Show errors so user knows something went wrong
]);

/**
 * Check if a message part should be visible based on the current mode
 */
export function shouldShowMessagePart(partType: string, mode: ViewMode): boolean {
  if (mode === "dev") {
    return true; // Dev mode shows everything
  }

  // PM mode: show only allowed parts
  if (ALWAYS_SHOWN_PARTS.has(partType)) {
    return true;
  }

  if (PM_MODE_HIDDEN_PARTS.has(partType)) {
    return false;
  }

  // Unknown types: hide in PM mode to be safe
  return false;
}

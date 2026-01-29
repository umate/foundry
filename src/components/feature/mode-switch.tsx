"use client";

import { cn } from "@/lib/utils";

export type ViewMode = "pm" | "dev";

interface ModeSwitchProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
  className?: string;
}

export function ModeSwitch({ mode, onModeChange, disabled, className }: ModeSwitchProps) {
  return (
    <div
      role="group"
      className={cn("flex rounded-sm overflow-hidden border border-border", className)}
    >
      <button
        type="button"
        onClick={() => onModeChange("pm")}
        disabled={disabled}
        className={cn(
          "h-7 px-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
          mode === "pm"
            ? "bg-secondary text-secondary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        PM
      </button>
      <button
        type="button"
        onClick={() => onModeChange("dev")}
        disabled={disabled}
        className={cn(
          "h-7 px-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors",
          mode === "dev"
            ? "bg-secondary text-secondary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        DEV
      </button>
    </div>
  );
}

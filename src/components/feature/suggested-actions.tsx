"use client";

import {
  useSuggestedActions,
  type ViewMode,
  type SuggestedAction,
} from "@/lib/hooks/use-suggested-actions";
import type { DisplayMessage } from "@/lib/hooks/use-claude-code-chat";

interface SuggestedActionsProps {
  hasSavedSpec: boolean;
  mode: ViewMode;
  messages: DisplayMessage[];
  isLoading: boolean;
  hasPendingChange: boolean;
  onAction: (message: string, action: SuggestedAction) => void;
}

export function SuggestedActions({
  hasSavedSpec,
  mode,
  messages,
  isLoading,
  hasPendingChange,
  onAction,
}: SuggestedActionsProps) {
  const actions = useSuggestedActions({
    hasSavedSpec,
    mode,
    messages,
    isLoading,
    hasPendingChange,
  });

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pt-2 pb-3">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onAction(action.message, action)}
          disabled={isLoading}
          className="h-6 px-2.5 text-[10px] font-mono uppercase tracking-wider rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

import { useMemo } from "react";
import type { DisplayMessage } from "./use-claude-code-chat";

export type ViewMode = "pm" | "dev";

export interface SuggestedAction {
  id: string;
  label: string;
  message: string;
  /** If true, this action also triggers a status change to 'current' */
  triggersImplementation?: boolean;
}

type LastContext =
  | "spec-generated"
  | "spec-updated"
  | "clarification"
  | "code-activity"
  | "error"
  | "text-only"
  | null;

function getLastContext(messages: DisplayMessage[]): LastContext {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;

    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j];
      switch (part.type) {
        case "tool-generateSpec":
          return "spec-generated";
        case "tool-updateSpec":
          return "spec-updated";
        case "clarification":
          return "clarification";
        case "tool-error":
          return "error";
        case "file-write-result":
        case "file-edit-result":
        case "bash-result":
          return "code-activity";
      }
    }

    if (msg.parts.some((p) => p.type === "text")) return "text-only";
    return null;
  }
  return null;
}

function hasCodeChanges(messages: DisplayMessage[]): boolean {
  return messages.some((msg) =>
    msg.parts.some((p) =>
      p.type === "file-write-result" || p.type === "file-edit-result"
    )
  );
}

interface UseSuggestedActionsInput {
  hasSavedSpec: boolean;
  mode: ViewMode;
  messages: DisplayMessage[];
  isLoading: boolean;
  hasPendingChange: boolean;
}

export function useSuggestedActions({
  hasSavedSpec,
  mode,
  messages,
  isLoading,
  hasPendingChange,
}: UseSuggestedActionsInput): SuggestedAction[] {
  return useMemo(() => {
    if (isLoading || hasPendingChange) return [];

    const ctx = getLastContext(messages);
    const isEmpty = messages.length === 0;
    const codeStarted = hasCodeChanges(messages);

    // Clarification card handles its own interaction
    if (ctx === "clarification") return [];

    // After error
    if (ctx === "error") {
      return [
        { id: "retry", label: "Try Again", message: "Let's try a different approach to solve this." },
      ];
    }

    // After spec generated — offer implement if no code yet
    if (ctx === "spec-generated" || ctx === "spec-updated") {
      if (mode === "dev" && !codeStarted) {
        return [{
          id: "implement",
          label: "Start Implementation",
          message: "Implement this feature based on the current spec. Start with the highest-priority tasks.",
          triggersImplementation: true,
        }];
      }
      return [];
    }

    // After code activity in dev
    if (ctx === "code-activity" && mode === "dev") {
      return [
        { id: "continue", label: "Continue Building", message: "Continue with the next implementation task." },
      ];
    }

    // Empty chat
    if (isEmpty) {
      if (!hasSavedSpec) {
        return [
          { id: "gen-spec", label: "Draft Requirements", message: "Based on the feature title and description, generate a spec for this feature." },
        ];
      }
      if (mode === "dev") {
        return [
          { id: "implement", label: "Start Implementation", message: "Implement this feature based on the current spec. Start with the highest-priority tasks.", triggersImplementation: true },
        ];
      }
      return [];
    }

    // General conversation
    if (!hasSavedSpec) {
      return [
        { id: "gen-spec", label: "Draft Requirements", message: "Based on everything discussed so far, please generate the spec for this feature." },
      ];
    }

    if (hasSavedSpec && mode === "dev" && !codeStarted) {
      return [{
        id: "implement",
        label: "Start Implementation",
        message: "Implement this feature based on the current spec. Start with the highest-priority tasks.",
        triggersImplementation: true,
      }];
    }

    if (codeStarted && mode === "dev") {
      return [
        { id: "continue", label: "Continue Building", message: "Continue implementing. What's the next task?" },
      ];
    }

    return [];
  }, [hasSavedSpec, mode, messages, isLoading, hasPendingChange]);
}

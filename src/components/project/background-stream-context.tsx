"use client";

import { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import { startStream, type ChatStatus } from "@/lib/stream-manager";
import type { DisplayMessage } from "@/lib/hooks/use-claude-code-chat";
import { toast } from "sonner";

interface StreamState {
  status: ChatStatus;
  messages: DisplayMessage[];
  error: Error | null;
}

interface StreamOptions {
  currentPrdMarkdown?: string;
  featureTitle?: string;
  onPRDGenerated?: (markdown: string) => void;
  onPendingChange?: (markdown: string, changeSummary: string) => void;
}

interface BackgroundStreamContextValue {
  // Get stream state for a feature
  getStreamState: (featureId: string) => StreamState | undefined;
  // Check if a feature is streaming
  isStreaming: (featureId: string) => boolean;
  // Get all streaming feature IDs
  getStreamingFeatureIds: () => string[];
  // Send a message to start/continue a stream
  sendMessage: (featureId: string, message: { text: string }, options: StreamOptions) => void;
  // Stop a stream
  stopStream: (featureId: string) => void;
  // Clear a stream's state
  clearStream: (featureId: string) => void;
  // Set messages for a feature (for hydration from DB)
  setMessages: (featureId: string, messages: DisplayMessage[]) => void;
  // Register callback for when panel opens a feature
  setOpenFeaturePanel: (callback: (featureId: string) => void) => void;
}

const BackgroundStreamContext = createContext<BackgroundStreamContextValue | null>(null);

interface BackgroundStreamProviderProps {
  children: React.ReactNode;
}

export function BackgroundStreamProvider({ children }: BackgroundStreamProviderProps) {
  // Store stream states by feature ID
  const [streams, setStreams] = useState<Map<string, StreamState>>(new Map());
  // Store abort controllers for each stream
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  // Store feature titles for toast notifications
  const featureTitlesRef = useRef<Map<string, string>>(new Map());
  // Callback to open feature panel
  const openFeaturePanelRef = useRef<((featureId: string) => void) | null>(null);
  // Track which panels are currently open
  const openPanelsRef = useRef<Set<string>>(new Set());

  // Get stream state for a feature
  const getStreamState = useCallback((featureId: string): StreamState | undefined => {
    return streams.get(featureId);
  }, [streams]);

  // Check if a feature is streaming
  const isStreaming = useCallback((featureId: string): boolean => {
    const state = streams.get(featureId);
    return state?.status === "streaming";
  }, [streams]);

  // Get all streaming feature IDs
  const getStreamingFeatureIds = useCallback((): string[] => {
    const ids: string[] = [];
    streams.forEach((state, id) => {
      if (state.status === "streaming") {
        ids.push(id);
      }
    });
    return ids;
  }, [streams]);

  // Update stream state helper
  const updateStreamState = useCallback((featureId: string, update: Partial<StreamState>) => {
    setStreams(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(featureId) || { status: "idle" as ChatStatus, messages: [], error: null };
      newMap.set(featureId, { ...existing, ...update });
      return newMap;
    });
  }, []);

  // Send a message
  const sendMessage = useCallback((
    featureId: string,
    message: { text: string },
    options: StreamOptions
  ) => {
    // Store feature title for toast
    if (options.featureTitle) {
      featureTitlesRef.current.set(featureId, options.featureTitle);
    }

    // Cancel any existing stream for this feature
    const existingController = abortControllersRef.current.get(featureId);
    if (existingController) {
      existingController.abort();
    }

    // Create new abort controller
    const abortController = new AbortController();
    abortControllersRef.current.set(featureId, abortController);

    // Get current messages and add user message
    const currentState = streams.get(featureId);
    const currentMessages = currentState?.messages || [];

    const userMessage: DisplayMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: "user",
      parts: [{ type: "text", text: message.text }]
    };

    const messagesWithUser = [...currentMessages, userMessage];

    // Update state with user message
    updateStreamState(featureId, { messages: messagesWithUser, status: "streaming", error: null });

    // Start streaming
    startStream(
      featureId,
      messagesWithUser,
      options.currentPrdMarkdown,
      {
        onStatusChange: (status) => {
          updateStreamState(featureId, { status });
        },
        onMessagesUpdate: (messages) => {
          updateStreamState(featureId, { messages });
        },
        onError: (error) => {
          updateStreamState(featureId, { error });
          // Show error toast if panel is closed
          if (!openPanelsRef.current.has(featureId)) {
            const title = featureTitlesRef.current.get(featureId) || "Feature";
            toast.error(`Error processing "${title}"`, {
              description: error.message
            });
          }
        },
        onComplete: () => {
          // Show completion toast if panel is closed
          if (!openPanelsRef.current.has(featureId)) {
            const title = featureTitlesRef.current.get(featureId) || "Feature";
            toast.success(`Work completed for "${title}"`, {
              action: openFeaturePanelRef.current ? {
                label: "View",
                onClick: () => openFeaturePanelRef.current?.(featureId)
              } : undefined
            });
          }
          // Clean up abort controller
          abortControllersRef.current.delete(featureId);
        },
        onPRDGenerated: options.onPRDGenerated,
        onPendingChange: options.onPendingChange
      },
      abortController
    );
  }, [streams, updateStreamState]);

  // Stop a stream
  const stopStream = useCallback((featureId: string) => {
    const controller = abortControllersRef.current.get(featureId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(featureId);
      updateStreamState(featureId, { status: "ready" });
    }
  }, [updateStreamState]);

  // Clear a stream's state
  const clearStream = useCallback((featureId: string) => {
    // Stop any active stream
    const controller = abortControllersRef.current.get(featureId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(featureId);
    }
    // Remove from state
    setStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(featureId);
      return newMap;
    });
    featureTitlesRef.current.delete(featureId);
  }, []);

  // Set messages for a feature (for hydration)
  const setMessages = useCallback((featureId: string, messages: DisplayMessage[]) => {
    updateStreamState(featureId, { messages, status: "idle", error: null });
  }, [updateStreamState]);

  // Set the open panel callback
  const setOpenFeaturePanel = useCallback((callback: (featureId: string) => void) => {
    openFeaturePanelRef.current = callback;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort all streams when provider unmounts
      abortControllersRef.current.forEach(controller => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  const value: BackgroundStreamContextValue = {
    getStreamState,
    isStreaming,
    getStreamingFeatureIds,
    sendMessage,
    stopStream,
    clearStream,
    setMessages,
    setOpenFeaturePanel
  };

  return (
    <BackgroundStreamContext.Provider value={value}>
      {children}
    </BackgroundStreamContext.Provider>
  );
}

// Hook to use background stream context
export function useBackgroundStream() {
  const context = useContext(BackgroundStreamContext);
  if (!context) {
    throw new Error("useBackgroundStream must be used within BackgroundStreamProvider");
  }
  return context;
}

// Hook for feature-specific stream state
export function useFeatureStream(featureId: string) {
  const context = useBackgroundStream();
  const streamState = context.getStreamState(featureId);

  return {
    messages: streamState?.messages || [],
    status: streamState?.status || "idle",
    error: streamState?.error || null,
    isStreaming: context.isStreaming(featureId),
    sendMessage: (message: { text: string }, options: StreamOptions) => {
      context.sendMessage(featureId, message, options);
    },
    stop: () => context.stopStream(featureId),
    clearMessages: () => context.clearStream(featureId),
    setMessages: (messages: DisplayMessage[]) => context.setMessages(featureId, messages)
  };
}

// Hook for tracking open panels (used by chat panel)
export function useTrackOpenPanel(featureId: string | null) {
  const openPanelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (featureId) {
      openPanelsRef.current.add(featureId);
      return () => {
        openPanelsRef.current.delete(featureId);
      };
    }
  }, [featureId]);
}

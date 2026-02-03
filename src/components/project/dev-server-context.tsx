"use client";

import { createContext, useContext, useCallback, useRef, useState, useEffect } from "react";
import type { DevServerStatus, LogEntry } from "@/lib/dev-server-manager";
import type { PackageManager } from "@/lib/package-manager";

interface DevServerState {
  status: DevServerStatus;
  logs: LogEntry[];
  error?: string;
  startedAt?: number;
  packageManager: PackageManager | null;
}

interface DevServerContextValue {
  state: DevServerState;
  isDrawerOpen: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const DevServerContext = createContext<DevServerContextValue | null>(null);

interface DevServerProviderProps {
  projectId: string;
  children: React.ReactNode;
}

const DEFAULT_STATE: DevServerState = {
  status: "stopped",
  logs: [],
  packageManager: null,
};

export function DevServerProvider({ projectId, children }: DevServerProviderProps) {
  const [state, setState] = useState<DevServerState>(DEFAULT_STATE);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  // Fetch initial status on mount
  useEffect(() => {
    mountedRef.current = true;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/dev-server/status`);
        if (response.ok && mountedRef.current) {
          const data = await response.json();
          setState({
            status: data.status,
            logs: data.logs || [],
            error: data.error,
            startedAt: data.startedAt,
            packageManager: data.packageManager,
          });

          // If server is running, subscribe to logs
          if (data.status === "running" || data.status === "starting") {
            subscribeToLogs();
          }
        }
      } catch (error) {
        console.error("Failed to fetch dev server status:", error);
      }
    };

    fetchStatus();

    return () => {
      mountedRef.current = false;
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Subscribe to log stream
  const subscribeToLogs = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/projects/${projectId}/dev-server/logs`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (!mountedRef.current) return;

      try {
        const logEntry: LogEntry = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          logs: [...prev.logs.slice(-999), logEntry], // Keep last 1000 entries
        }));
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // SSE connection lost - server may have stopped
      if (mountedRef.current) {
        eventSource.close();
        eventSourceRef.current = null;
        // Fetch status to get current state, but preserve existing logs
        fetch(`/api/projects/${projectId}/dev-server/status`)
          .then((res) => res.json())
          .then((data) => {
            if (mountedRef.current) {
              setState((prev) => ({
                ...prev,
                // Only update status if we got a valid response
                status: data.status || prev.status,
                error: data.error,
                startedAt: data.startedAt ?? prev.startedAt,
                packageManager: data.packageManager ?? prev.packageManager,
                // Preserve existing logs, only append new ones if server has them
                logs: data.logs?.length > prev.logs.length ? data.logs : prev.logs,
              }));
            }
          })
          .catch(() => {});
      }
    };
  }, [projectId]);

  // Start dev server
  const start = useCallback(async () => {
    // Prevent double-starts
    if (state.status === "starting" || state.status === "running") {
      return;
    }

    try {
      setState((prev) => ({ ...prev, status: "starting", error: undefined, logs: [] }));

      // Open drawer immediately so user can see startup logs
      setIsDrawerOpen(true);

      const response = await fetch(`/api/projects/${projectId}/dev-server/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        setState((prev) => ({
          ...prev,
          status: "error",
          error: error.error || "Failed to start server",
        }));
        return;
      }

      const data = await response.json();
      setState({
        status: data.status,
        logs: data.logs || [],
        error: data.error,
        startedAt: data.startedAt,
        packageManager: data.packageManager,
      });

      // Subscribe to log stream
      subscribeToLogs();

      // Poll status to catch transition to running
      const pollStatus = async (attempts = 0) => {
        if (!mountedRef.current || attempts >= 10) return;

        try {
          const statusRes = await fetch(`/api/projects/${projectId}/dev-server/status`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setState((prev) => ({
              ...prev,
              status: statusData.status,
              error: statusData.error,
            }));

            // Keep polling if still starting
            if (statusData.status === "starting") {
              setTimeout(() => pollStatus(attempts + 1), 500);
            }
          }
        } catch {
          // Ignore polling errors
        }
      };

      setTimeout(() => pollStatus(0), 500);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to start server",
      }));
    }
  }, [projectId, subscribeToLogs, state.status]);

  // Stop dev server
  const stop = useCallback(async () => {
    try {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const response = await fetch(`/api/projects/${projectId}/dev-server/stop`, {
        method: "POST",
      });

      if (response.ok) {
        setState((prev) => ({ ...prev, status: "stopped" }));
      }
    } catch (error) {
      console.error("Failed to stop dev server:", error);
    }
  }, [projectId]);

  // Open/close drawer
  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Cleanup on unmount - stop server when leaving project
  useEffect(() => {
    return () => {
      // Stop the server when the provider unmounts (project switch)
      fetch(`/api/projects/${projectId}/dev-server/stop`, { method: "POST" }).catch(() => {});
    };
  }, [projectId]);

  // Handle browser close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Best-effort stop on browser close
      navigator.sendBeacon(`/api/projects/${projectId}/dev-server/stop`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [projectId]);

  const value: DevServerContextValue = {
    state,
    isDrawerOpen,
    start,
    stop,
    openDrawer,
    closeDrawer,
  };

  return (
    <DevServerContext.Provider value={value}>
      {children}
    </DevServerContext.Provider>
  );
}

export function useDevServer() {
  const context = useContext(DevServerContext);
  if (!context) {
    throw new Error("useDevServer must be used within DevServerProvider");
  }
  return context;
}

/**
 * Optional version of useDevServer that returns null when outside provider.
 * Useful for components that may or may not have access to the dev server context.
 */
export function useOptionalDevServer() {
  return useContext(DevServerContext);
}

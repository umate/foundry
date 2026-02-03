"use client";

import { useRef, useEffect, useMemo } from "react";
import { StopIcon, CircleIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import AnsiToHtml from "ansi-to-html";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useDevServer } from "./dev-server-context";

// Create ANSI converter instance
const ansiConverter = new AnsiToHtml({
  fg: "#e4e4e7", // zinc-200
  bg: "#09090b", // zinc-950
  colors: {
    0: "#71717a", // black -> zinc-500
    1: "#f87171", // red -> red-400
    2: "#4ade80", // green -> green-400
    3: "#facc15", // yellow -> yellow-400
    4: "#60a5fa", // blue -> blue-400
    5: "#c084fc", // magenta -> purple-400
    6: "#22d3ee", // cyan -> cyan-400
    7: "#e4e4e7" // white -> zinc-200
  }
});

// Strip ANSI escape codes from text
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

// Extract localhost/127.0.0.1 URLs from log text
function extractLocalUrl(logs: { text: string }[]): string | null {
  // Search logs in reverse to find the most recent URL
  for (let i = logs.length - 1; i >= 0; i--) {
    const text = stripAnsi(logs[i].text);
    // Match http://localhost:PORT or http://127.0.0.1:PORT URLs
    const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/?/);
    if (match) {
      return match[0];
    }
  }
  return null;
}

export function DevServerDrawer() {
  const { state, isDrawerOpen, closeDrawer, stop } = useDevServer();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Extract URL from logs
  const serverUrl = useMemo(() => extractLocalUrl(state.logs), [state.logs]);

  // Auto-scroll to bottom when new logs come in
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  const getStatusColor = () => {
    switch (state.status) {
      case "running":
        return "text-green-500";
      case "starting":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      case "stopped":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = () => {
    switch (state.status) {
      case "running":
        return "Running";
      case "starting":
        return "Starting...";
      case "error":
        return "Error";
      case "stopped":
      default:
        return "Stopped";
    }
  };

  const handleStop = async () => {
    await stop();
  };

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent className="sm:max-w-3xl flex flex-col overflow-hidden">
        <SheetHeader className="flex-row items-center justify-between space-y-0 pb-4 pr-12">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono uppercase tracking-wider">Dev Server</SheetTitle>
            <div className="flex items-center gap-1.5">
              <CircleIcon weight="fill" className={`size-2 ${getStatusColor()}`} />
              <span className="font-mono text-xs text-muted-foreground">{getStatusLabel()}</span>
            </div>
            {state.packageManager && (
              <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                {state.packageManager}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {serverUrl && state.status === "running" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(serverUrl, "_blank")}
                className="gap-1.5 h-7 px-2"
              >
                <ArrowSquareOutIcon weight="bold" className="size-3" />
                <span className="font-mono text-xs uppercase tracking-wider">Open in Browser</span>
              </Button>
            )}
            {(state.status === "running" || state.status === "starting") && (
              <Button variant="destructive" size="sm" onClick={handleStop} className="gap-1.5 h-7 px-2">
                <StopIcon weight="bold" className="size-3" />
                <span className="font-mono text-xs uppercase tracking-wider">Stop</span>
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Terminal-style log display */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-auto bg-zinc-950 rounded-md p-4 font-mono text-xs leading-relaxed"
        >
          {state.logs.length === 0 ? (
            <div className="text-zinc-500">
              {state.status === "stopped" || state.status === "error"
                ? "Server is not running. Click 'Start Server' in the header to begin."
                : "Waiting for output..."}
            </div>
          ) : (
            state.logs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                className="whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{
                  __html: ansiConverter.toHtml(log.text)
                }}
              />
            ))
          )}

          {state.error && <div className="text-red-400 mt-2 pt-2 border-t border-red-900">Error: {state.error}</div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { NextRequest } from "next/server";
import { devServerManager, type LogEntry } from "@/lib/dev-server-manager";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial logs
      const existingLogs = devServerManager.getLogs(id);
      for (const log of existingLogs) {
        const data = `data: ${JSON.stringify(log)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Subscribe to new logs
      const unsubscribe = devServerManager.subscribe(id, (entry: LogEntry) => {
        try {
          const data = `data: ${JSON.stringify(entry)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Controller may be closed
        }
      });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Cleanup handled by abort event
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

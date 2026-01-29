import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { abortAgentStream } from "@/lib/agent-abort-registry";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: featureId } = await params;
  const aborted = abortAgentStream(featureId);
  console.log(`[Agent] Abort requested for feature ${featureId}: ${aborted ? "aborted" : "no active stream"}`);
  return NextResponse.json({ success: true, aborted });
}

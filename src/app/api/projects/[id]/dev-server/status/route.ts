import { NextRequest, NextResponse } from "next/server";
import { devServerManager } from "@/lib/dev-server-manager";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const state = devServerManager.getStatus(id);

    if (!state) {
      return NextResponse.json({
        status: "stopped",
        logs: [],
        packageManager: null,
      });
    }

    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to get dev server status:", error);
    return NextResponse.json(
      { error: "Failed to get dev server status" },
      { status: 500 }
    );
  }
}

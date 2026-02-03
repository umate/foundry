import { NextRequest, NextResponse } from "next/server";
import { devServerManager } from "@/lib/dev-server-manager";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stopped = devServerManager.stop(id);

    return NextResponse.json({ success: true, stopped });
  } catch (error) {
    console.error("Failed to stop dev server:", error);
    return NextResponse.json(
      { error: "Failed to stop dev server" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { projectRepository } from "@/db/repositories/project.repository";
import { devServerManager } from "@/lib/dev-server-manager";
import { type PackageManager } from "@/lib/package-manager";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await projectRepository.findById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.repoPath) {
      return NextResponse.json(
        { error: "Project has no codebase path configured" },
        { status: 400 }
      );
    }

    const packageManagerOverride = project.packageManager as PackageManager | null;
    const state = devServerManager.start(id, project.repoPath, packageManagerOverride);

    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to start dev server:", error);
    return NextResponse.json(
      { error: "Failed to start dev server" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import { discardAllChanges } from "@/lib/git";

interface DiscardRequest {
  projectId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscardRequest = await request.json();
    const { projectId } = body;

    const result = await getProjectWithRepo(projectId);
    if (!result.success) return result.response;
    const { project } = result;

    try {
      await discardAllChanges(project.repoPath);

      return NextResponse.json({ success: true });
    } catch (discardError) {
      console.error("Git discard failed:", discardError);
      return NextResponse.json(
        { error: "Failed to discard changes" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Discard error:", error);
    return NextResponse.json(
      { error: "Failed to discard changes" },
      { status: 500 }
    );
  }
}

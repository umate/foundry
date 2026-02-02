import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import { getCurrentBranch } from "@/lib/git";

const execAsync = promisify(exec);

interface CreateBranchRequest {
  projectId: string;
  branchName: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBranchRequest = await request.json();
    const { projectId, branchName } = body;

    if (!branchName?.trim()) {
      return NextResponse.json(
        { error: "Branch name is required" },
        { status: 400 }
      );
    }

    // Sanitize: spaces → hyphens, strip invalid chars
    const sanitized = branchName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._\-/]/g, "");

    if (!sanitized) {
      return NextResponse.json(
        { error: "Invalid branch name" },
        { status: 400 }
      );
    }

    const result = await getProjectWithRepo(projectId);
    if (!result.success) return result.response;
    const { project } = result;

    try {
      await execAsync(`git checkout -b ${sanitized}`, {
        cwd: project.repoPath,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("already exists")) {
        return NextResponse.json(
          { error: `Branch '${sanitized}' already exists` },
          { status: 409 }
        );
      }

      console.error("Git create branch failed:", error);
      return NextResponse.json(
        { error: "Failed to create branch" },
        { status: 500 }
      );
    }

    const newBranch = await getCurrentBranch(project.repoPath);

    return NextResponse.json({
      success: true,
      branch: newBranch,
    });
  } catch (error) {
    console.error("Create branch error:", error);
    return NextResponse.json(
      { error: "Failed to create branch" },
      { status: 500 }
    );
  }
}

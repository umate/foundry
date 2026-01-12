import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { projectRepository } from "@/db/repositories/project.repository";

const execAsync = promisify(exec);

interface CommitRequest {
  projectId: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CommitRequest = await request.json();
    const { projectId, message } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Commit message is required" },
        { status: 400 }
      );
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.repoPath) {
      return NextResponse.json(
        { error: "No repository path configured" },
        { status: 400 }
      );
    }

    // Stage all changes
    await execAsync("git add -A", { cwd: project.repoPath });

    // Commit with the provided message
    // Use JSON.stringify to safely escape the message for shell
    const sanitizedMessage = message.trim();
    const { stdout } = await execAsync(
      `git commit -m ${JSON.stringify(sanitizedMessage)}`,
      { cwd: project.repoPath }
    );

    // Extract commit hash from output
    const hashMatch = stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const commitHash = hashMatch ? hashMatch[1] : null;

    return NextResponse.json({
      success: true,
      commitHash,
      message: sanitizedMessage
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to commit:", error);

    // Handle specific git errors
    if (errorMessage.includes("nothing to commit")) {
      return NextResponse.json(
        { error: "No changes to commit" },
        { status: 400 }
      );
    }

    if (errorMessage.includes("not a git repository")) {
      return NextResponse.json(
        { error: "Not a git repository" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to commit changes" },
      { status: 500 }
    );
  }
}

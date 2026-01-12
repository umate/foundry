import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { generateText } from "ai";
import { projectRepository } from "@/db/repositories/project.repository";

const execAsync = promisify(exec);

const SYSTEM_PROMPT = `You are a commit message generator. Based on the git diff provided, write a concise commit message.

Requirements:
- First line: imperative mood summary (50 chars max), e.g., "Add user authentication" not "Added user authentication"
- If needed, add 1-2 bullet points for significant changes
- Focus on WHAT changed and WHY, not HOW
- Keep total message under 5 lines
- Do NOT include file names unless critical context
- Do NOT use generic phrases like "Update files" or "Make changes"

Examples of good messages:
- "Add dark mode toggle to settings"
- "Fix authentication redirect loop

- Handle expired tokens gracefully
- Add retry logic for network failures"
- "Refactor database queries for performance"

Examples of bad messages:
- "Updated code" (too vague)
- "Fixed bug in src/auth/login.ts" (don't include file paths)
- "Changes to support new feature" (what feature?)`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  try {
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

    // Get combined diff (staged + unstaged)
    const [stagedResult, unstagedResult] = await Promise.allSettled([
      execAsync("git diff --staged", {
        cwd: project.repoPath,
        maxBuffer: 5 * 1024 * 1024
      }),
      execAsync("git diff", {
        cwd: project.repoPath,
        maxBuffer: 5 * 1024 * 1024
      })
    ]);

    const stagedDiff =
      stagedResult.status === "fulfilled" ? stagedResult.value.stdout : "";
    const unstagedDiff =
      unstagedResult.status === "fulfilled" ? unstagedResult.value.stdout : "";
    const combinedDiff = `${stagedDiff}\n${unstagedDiff}`.trim();

    if (!combinedDiff) {
      return NextResponse.json({ error: "No changes to commit" }, { status: 400 });
    }

    // Truncate diff if too large (keep first 10KB for context)
    const maxDiffLength = 10000;
    const truncatedDiff =
      combinedDiff.length > maxDiffLength
        ? combinedDiff.slice(0, maxDiffLength) + "\n\n[diff truncated...]"
        : combinedDiff;

    const { text } = await generateText({
      model: "google/gemini-2.0-flash",
      system: SYSTEM_PROMPT,
      prompt: `Generate a commit message for this diff:\n\n${truncatedDiff}`,
      temperature: 0.3
    });

    return NextResponse.json({ message: text.trim() });
  } catch (error) {
    console.error("Failed to generate commit message:", error);
    return NextResponse.json(
      { error: "Failed to generate commit message" },
      { status: 500 }
    );
  }
}

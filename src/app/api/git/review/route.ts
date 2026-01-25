import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";

const execAsync = promisify(exec);

const suggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      file: z.string().describe("File path relative to repo root"),
      lines: z.string().optional().describe("Line number(s), e.g., '24', '24-30', or undefined for file-level"),
      severity: z.enum(["high", "medium", "low"]).describe("Issue severity: high for critical/security issues, medium for significant problems, low for minor improvements"),
      comment: z.string().describe("The code review suggestion or feedback"),
    })
  ),
});

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the git diff and provide actionable code review suggestions.

IMPORTANT: Focus ONLY on high-impact issues. Do NOT mention minor things like formatting, naming preferences, or stylistic nitpicks.

Focus on these categories (high to medium priority only):
- Security vulnerabilities (injection, auth issues, data exposure)
- Performance problems (inefficient algorithms, memory leaks, N+1 queries)
- Critical bugs (logic errors, null/undefined issues, race conditions)
- Tech debt (code duplication, missing abstractions, tight coupling)
- Error handling gaps (uncaught exceptions, missing validation)
- Architectural concerns (breaking patterns, scalability issues)

Do NOT mention:
- Minor style preferences
- Formatting issues
- Small naming improvements
- Personal opinions on code organization
- Trivial suggestions

Guidelines:
- Be specific and actionable - explain WHAT to change and WHY
- Reference specific line numbers when relevant
- Keep suggestions concise but clear
- Only include genuinely important issues that could cause problems
- Suggest 2-8 items depending on the size and complexity of the diff

Severity levels:
- high: Security issues, critical bugs, data loss risks
- medium: Performance problems, tech debt, missing error handling
- low: Minor improvements (only include if truly valuable)

For each suggestion:
- file: The file path (e.g., "src/utils/helpers.ts")
- lines: Specific line number(s) if applicable (e.g., "24" or "24-30"), omit for file-level comments
- severity: "high", "medium", or "low"
- comment: Clear, actionable feedback explaining the issue and suggested fix`;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const result = await getProjectWithRepo(searchParams.get("projectId"));
  if (!result.success) return result.response;
  const { project } = result;

  try {
    // Get combined diff (staged + unstaged) for all uncommitted changes
    const [stagedResult, unstagedResult] = await Promise.allSettled([
      execAsync("git diff --staged", {
        cwd: project.repoPath,
        maxBuffer: 10 * 1024 * 1024,
      }),
      execAsync("git diff", {
        cwd: project.repoPath,
        maxBuffer: 10 * 1024 * 1024,
      }),
    ]);

    const stagedDiff =
      stagedResult.status === "fulfilled" ? stagedResult.value.stdout : "";
    const unstagedDiff =
      unstagedResult.status === "fulfilled" ? unstagedResult.value.stdout : "";
    const combinedDiff = `${stagedDiff}\n${unstagedDiff}`.trim();

    if (!combinedDiff) {
      return NextResponse.json({ error: "No changes to review" }, { status: 400 });
    }

    // Truncate diff if too large (keep first 30KB for context)
    const maxDiffLength = 30000;
    const truncatedDiff =
      combinedDiff.length > maxDiffLength
        ? combinedDiff.slice(0, maxDiffLength) + "\n\n[diff truncated...]"
        : combinedDiff;

    // Use AI SDK with structured output
    const { output } = await generateText({
      model: "google/gemini-2.5-pro",
      output: Output.object({
        schema: suggestionSchema,
      }),
      system: SYSTEM_PROMPT,
      prompt: `Analyze this git diff and provide code review suggestions:\n\n${truncatedDiff}`,
      temperature: 0.3,
    });

    return NextResponse.json({
      suggestions: output.suggestions,
      fileCount: combinedDiff.split("diff --git").length - 1,
    });
  } catch (error) {
    console.error("Failed to generate code review:", error);
    return NextResponse.json(
      { error: "Failed to generate code review" },
      { status: 500 }
    );
  }
}

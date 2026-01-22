import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const suggestionSchema = z.object({
  file: z.string(),
  lines: z.string().optional(),
  severity: z.enum(["high", "medium", "low"]),
  comment: z.string(),
});

const requestSchema = z.object({
  suggestions: z.array(suggestionSchema),
});

/**
 * Formats selected code review suggestions into a prompt for Claude Code.
 * This moves prompt engineering logic out of the frontend for better maintainability.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestions } = requestSchema.parse(body);

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "No suggestions provided" },
        { status: 400 }
      );
    }

    // Sort by severity (high first, then medium, then low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...suggestions].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    // Format suggestions into a structured prompt
    const suggestionsText = sorted
      .map((s) => {
        const location = s.lines ? `${s.file}:${s.lines}` : s.file;
        return `## [${s.severity.toUpperCase()}] ${location}\n${s.comment}`;
      })
      .join("\n\n");

    const prompt = `Based on the code review, please implement the following changes:

${suggestionsText}

---
Please make these changes to the codebase.`;

    return NextResponse.json({ prompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Failed to format code review prompt:", error);
    return NextResponse.json(
      { error: "Failed to format prompt" },
      { status: 500 }
    );
  }
}

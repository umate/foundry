import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { projectRepository } from "@/db/repositories/project.repository";

const descriptionSchema = z.object({
  description: z.string().describe("A 1-2 sentence description of what this project does")
});

const SYSTEM_PROMPT = `Extract a concise 1-2 sentence description of what this project does from the README.
Focus on the primary purpose and key functionality.
Be specific, not generic. Avoid marketing language.

Examples:
- "A CLI tool for managing Docker containers with simplified commands and visual feedback."
- "Real-time collaboration platform for remote teams with video chat and shared workspaces."
- "Automated testing framework for React components with snapshot and visual regression support."`;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const project = await projectRepository.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Skip if no repoPath set
    if (!project.repoPath) {
      return NextResponse.json({ skipped: true, reason: "No repository path set" });
    }

    // Try to read README.md
    const readmePath = path.join(project.repoPath, "README.md");
    let readmeContent: string;

    try {
      readmeContent = await fs.readFile(readmePath, "utf-8");
    } catch {
      // Try lowercase readme.md
      try {
        readmeContent = await fs.readFile(path.join(project.repoPath, "readme.md"), "utf-8");
      } catch {
        return NextResponse.json({ skipped: true, reason: "No README.md found" });
      }
    }

    // Truncate if too long (keep first 4000 chars)
    if (readmeContent.length > 4000) {
      readmeContent = readmeContent.slice(0, 4000) + "\n\n[truncated]";
    }

    const { output } = await generateText({
      model: "google/gemini-3-flash",
      output: Output.object({ schema: descriptionSchema }),
      system: SYSTEM_PROMPT,
      prompt: readmeContent,
      temperature: 0.3
    });

    // Update project with generated description
    const updatedProject = await projectRepository.update(id, {
      description: output.description
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Failed to extract description:", error);
    return NextResponse.json({ error: "Failed to extract description" }, { status: 500 });
  }
}

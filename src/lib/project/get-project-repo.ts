import { stat } from "fs/promises";
import { NextResponse } from "next/server";
import { projectRepository } from "@/db/repositories/project.repository";
import type { Project } from "@/db/schema";

export type ProjectWithRepo = Project & { repoPath: string };

type SuccessResult = { success: true; project: ProjectWithRepo };
type ErrorResult = { success: false; response: NextResponse };
export type RepoResult = SuccessResult | ErrorResult;

export async function getProjectWithRepo(projectId: string | null): Promise<RepoResult> {
  if (!projectId) {
    return {
      success: false,
      response: NextResponse.json({ error: "projectId is required" }, { status: 400 }),
    };
  }

  const project = await projectRepository.findById(projectId);

  if (!project) {
    return {
      success: false,
      response: NextResponse.json({ error: "Project not found" }, { status: 404 }),
    };
  }

  if (!project.repoPath) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "No repository path configured for this project" },
        { status: 400 }
      ),
    };
  }

  try {
    await stat(project.repoPath);
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: `Directory not found: ${project.repoPath}` },
        { status: 400 }
      ),
    };
  }

  return { success: true, project: project as ProjectWithRepo };
}

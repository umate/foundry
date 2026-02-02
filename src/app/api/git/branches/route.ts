import { NextRequest, NextResponse } from "next/server";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import { listBranches } from "@/lib/git";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const result = await getProjectWithRepo(searchParams.get("projectId"));
  if (!result.success) return result.response;
  const { project } = result;

  try {
    const branches = await listBranches(project.repoPath);

    return NextResponse.json(branches);
  } catch (error) {
    console.error("Failed to list branches:", error);
    return NextResponse.json(
      { error: "Failed to list branches" },
      { status: 500 }
    );
  }
}

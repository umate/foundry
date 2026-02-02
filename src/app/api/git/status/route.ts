import { NextRequest, NextResponse } from "next/server";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import {
  getCurrentBranch,
  getRemotes,
  getUncommittedCount,
  getCommitsBehind,
  getCommitsAhead,
  fetchRemote,
} from "@/lib/git";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const result = await getProjectWithRepo(searchParams.get("projectId"));
  if (!result.success) return result.response;
  const { project } = result;

  try {
    const cwd = project.repoPath;

    // Fetch remote updates first (non-blocking failure)
    const remotes = await getRemotes(cwd);
    if (remotes.length > 0) {
      await fetchRemote(cwd);
    }

    const [branch, uncommittedCount, commitsBehind, commitsAhead] = await Promise.all([
      getCurrentBranch(cwd),
      getUncommittedCount(cwd),
      remotes.length > 0 ? getCommitsBehind(cwd) : Promise.resolve(0),
      remotes.length > 0 ? getCommitsAhead(cwd) : Promise.resolve(0),
    ]);

    return NextResponse.json({
      branch,
      uncommittedCount,
      commitsBehind,
      commitsAhead,
      hasRemote: remotes.length > 0,
    });
  } catch (error) {
    console.error("Failed to get git status:", error);
    return NextResponse.json(
      { error: "Failed to get git status" },
      { status: 500 }
    );
  }
}

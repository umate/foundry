import { NextRequest, NextResponse } from "next/server";
import { getProjectWithRepo } from "@/lib/project/get-project-repo";
import { checkoutBranch, getCurrentBranch } from "@/lib/git";

interface CheckoutRequest {
  projectId: string;
  branch: string;
  isRemote?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json();
    const { projectId, branch, isRemote } = body;

    const result = await getProjectWithRepo(projectId);
    if (!result.success) return result.response;
    const { project } = result;

    try {
      await checkoutBranch(project.repoPath, branch, isRemote);
    } catch (checkoutError) {
      const errorMessage =
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unknown error";

      if (errorMessage.includes("already exists")) {
        // Local branch already exists for this remote branch, just switch to it
        const localName = branch.includes("/")
          ? branch.slice(branch.indexOf("/") + 1)
          : branch;
        try {
          await checkoutBranch(project.repoPath, localName);
        } catch {
          return NextResponse.json(
            { error: `Failed to switch to branch: ${localName}` },
            { status: 500 }
          );
        }
      } else if (
        errorMessage.includes("did not match any") ||
        errorMessage.includes("not found")
      ) {
        return NextResponse.json(
          { error: `Branch not found: ${branch}` },
          { status: 404 }
        );
      } else if (errorMessage.includes("local changes")) {
        return NextResponse.json(
          {
            error:
              "Cannot switch branches: you have uncommitted changes that would be overwritten",
            code: "UNCOMMITTED_CHANGES",
          },
          { status: 409 }
        );
      } else {
        console.error("Git checkout failed:", checkoutError);
        return NextResponse.json(
          { error: "Failed to switch branch" },
          { status: 500 }
        );
      }
    }

    const newBranch = await getCurrentBranch(project.repoPath);

    return NextResponse.json({
      success: true,
      branch: newBranch,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to switch branch" },
      { status: 500 }
    );
  }
}

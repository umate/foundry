import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { projectRepository } from '@/db/repositories/project.repository';

const execAsync = promisify(exec);

interface FileDiff {
  filename: string;
  additions: number;
  deletions: number;
  chunks: string;
  staged: boolean;
}

function parseDiff(diffOutput: string, staged: boolean): FileDiff[] {
  if (!diffOutput.trim()) return [];

  const files: FileDiff[] = [];
  // Split by "diff --git" to get individual file diffs
  const fileDiffs = diffOutput.split(/^diff --git /m).filter(Boolean);

  for (const fileDiff of fileDiffs) {
    // Extract filename from "a/path/to/file b/path/to/file"
    const headerMatch = fileDiff.match(/^a\/(.+?) b\/(.+?)$/m);
    if (!headerMatch) continue;

    const filename = headerMatch[2]; // Use the "b" path (destination)

    // Count additions and deletions
    const lines = fileDiff.split('\n');
    let additions = 0;
    let deletions = 0;

    for (const line of lines) {
      // Skip diff headers
      if (line.startsWith('+++') || line.startsWith('---')) continue;
      if (line.startsWith('+')) additions++;
      else if (line.startsWith('-')) deletions++;
    }

    files.push({
      filename,
      additions,
      deletions,
      chunks: 'diff --git ' + fileDiff,
      staged,
    });
  }

  return files;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json(
      { error: 'projectId is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch project to get repoPath
    const project = await projectRepository.findById(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.repoPath) {
      return NextResponse.json(
        { error: 'No repository path configured for this project' },
        { status: 400 }
      );
    }

    // Run git diff commands
    const [unstagedResult, stagedResult] = await Promise.allSettled([
      execAsync('git diff', { cwd: project.repoPath, maxBuffer: 10 * 1024 * 1024 }),
      execAsync('git diff --staged', { cwd: project.repoPath, maxBuffer: 10 * 1024 * 1024 }),
    ]);

    // Extract outputs (empty string if failed/empty)
    const unstagedDiff = unstagedResult.status === 'fulfilled'
      ? unstagedResult.value.stdout
      : '';
    const stagedDiff = stagedResult.status === 'fulfilled'
      ? stagedResult.value.stdout
      : '';

    // Parse diffs into structured data
    const stagedFiles = parseDiff(stagedDiff, true);
    const unstagedFiles = parseDiff(unstagedDiff, false);
    const files = [...stagedFiles, ...unstagedFiles];

    // Calculate totals
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return NextResponse.json({
      files,
      totalAdditions,
      totalDeletions,
      hasStagedChanges: stagedFiles.length > 0,
      hasUnstagedChanges: unstagedFiles.length > 0,
      repoPath: project.repoPath,
    });

  } catch (error) {
    // Check for common git errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('not a git repository')) {
      return NextResponse.json(
        { error: 'The configured path is not a git repository' },
        { status: 400 }
      );
    }

    if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file')) {
      return NextResponse.json(
        { error: 'Repository path does not exist' },
        { status: 400 }
      );
    }

    console.error('Failed to get git diff:', error);
    return NextResponse.json(
      { error: 'Failed to get git diff' },
      { status: 500 }
    );
  }
}

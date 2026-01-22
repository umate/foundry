import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { projectRepository } from '@/db/repositories/project.repository';

const execAsync = promisify(exec);

// Maximum file size to read for untracked files (1MB)
const MAX_UNTRACKED_FILE_SIZE = 1024 * 1024;
// Maximum number of lines to include for large files
const MAX_LINES_PREVIEW = 500;

interface FileDiff {
  filename: string;
  additions: number;
  deletions: number;
  chunks: string;
  staged: boolean;
  untracked?: boolean;
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

async function getUntrackedFiles(repoPath: string): Promise<FileDiff[]> {
  try {
    // Get list of untracked files
    const { stdout } = await execAsync(
      'git ls-files --others --exclude-standard',
      { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
    );

    const filenames = stdout.trim().split('\n').filter(Boolean);
    if (filenames.length === 0) return [];

    const untrackedFiles: FileDiff[] = [];

    for (const filename of filenames) {
      try {
        const filePath = join(repoPath, filename);

        // Check file size before reading to prevent memory issues
        const fileStat = await stat(filePath);
        if (fileStat.size > MAX_UNTRACKED_FILE_SIZE) {
          console.warn(`Skipping large untracked file (${Math.round(fileStat.size / 1024)}KB): ${filename}`);
          // Still include the file in the list but with truncated content indication
          untrackedFiles.push({
            filename,
            additions: 0,
            deletions: 0,
            chunks: `diff --git a/${filename} b/${filename}\nnew file mode 100644\n--- /dev/null\n+++ b/${filename}\n@@ -0,0 +1 @@\n+[File too large to display - ${Math.round(fileStat.size / 1024)}KB]`,
            staged: false,
            untracked: true,
          });
          continue;
        }

        const content = await readFile(filePath, 'utf-8');
        let lines = content.split('\n');
        let truncated = false;

        // Limit number of lines for large files
        if (lines.length > MAX_LINES_PREVIEW) {
          lines = lines.slice(0, MAX_LINES_PREVIEW);
          truncated = true;
        }

        const additions = lines.length;

        // Generate diff-like output for new file
        const diffLines = [
          `diff --git a/${filename} b/${filename}`,
          'new file mode 100644',
          '--- /dev/null',
          `+++ b/${filename}`,
          `@@ -0,0 +1,${additions} @@`,
          ...lines.map(line => `+${line}`),
          ...(truncated ? [`+[... ${content.split('\n').length - MAX_LINES_PREVIEW} more lines truncated ...]`] : [])
        ];

        untrackedFiles.push({
          filename,
          additions: truncated ? content.split('\n').length : additions,
          deletions: 0,
          chunks: diffLines.join('\n'),
          staged: false,
          untracked: true,
        });
      } catch (error) {
        // Log warning for debugging but continue processing other files
        console.warn(`Failed to read untracked file "${filename}":`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    return untrackedFiles;
  } catch {
    return [];
  }
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

    // Run git diff commands and get untracked files
    // Note: git diff exits with code 1 when there are differences, which execAsync treats as an error.
    // We need to capture stdout from the error object in that case.
    const [unstagedResult, stagedResult, untrackedFiles] = await Promise.all([
      execAsync('git diff', { cwd: project.repoPath, maxBuffer: 10 * 1024 * 1024 })
        .then(r => r.stdout)
        .catch((error: { stdout?: string }) => error.stdout || ''),
      execAsync('git diff --staged', { cwd: project.repoPath, maxBuffer: 10 * 1024 * 1024 })
        .then(r => r.stdout)
        .catch((error: { stdout?: string }) => error.stdout || ''),
      getUntrackedFiles(project.repoPath),
    ]);

    // Parse diffs into structured data
    const stagedFiles = parseDiff(stagedResult, true);
    const unstagedFiles = parseDiff(unstagedResult, false);
    const files = [...stagedFiles, ...unstagedFiles, ...untrackedFiles];

    // Calculate totals
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    return NextResponse.json({
      files,
      totalAdditions,
      totalDeletions,
      hasStagedChanges: stagedFiles.length > 0,
      hasUnstagedChanges: unstagedFiles.length > 0,
      hasUntrackedFiles: untrackedFiles.length > 0,
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

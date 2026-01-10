import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedPath = searchParams.get('path') || homedir();

  try {
    // Resolve and normalize the path
    const resolvedPath = path.resolve(requestedPath);

    // Read directory contents
    const entries = await readdir(resolvedPath, { withFileTypes: true });

    // Filter to only directories and sort alphabetically
    const directories = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(resolvedPath, entry.name)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get parent directory (if not at root)
    const parentPath = path.dirname(resolvedPath);
    const hasParent = parentPath !== resolvedPath;

    return NextResponse.json({
      currentPath: resolvedPath,
      parentPath: hasParent ? parentPath : null,
      directories
    });
  } catch (error) {
    console.error('Failed to browse filesystem:', error);
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 400 }
    );
  }
}

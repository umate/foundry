'use client';

import { useMemo } from 'react';

interface WireframeViewerProps {
  wireframe: string;
}

/**
 * Normalize ASCII wireframe by padding all rows to equal length.
 * This fixes alignment issues when the AI generates inconsistent row lengths.
 */
function normalizeWireframe(wireframe: string): string {
  const lines = wireframe.split('\n');
  const maxLength = Math.max(...lines.map(line => line.length));
  return lines.map(line => line.padEnd(maxLength)).join('\n');
}

export function WireframeViewer({ wireframe }: WireframeViewerProps) {
  const normalized = useMemo(() => normalizeWireframe(wireframe), [wireframe]);

  return (
    <div className="p-6">
      <pre
        className="whitespace-pre overflow-x-auto bg-background border border-border rounded-md p-4"
        style={{
          fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: '14px',
          lineHeight: '1.2',
          letterSpacing: '0',
        }}
      >
        {normalized}
      </pre>
    </div>
  );
}

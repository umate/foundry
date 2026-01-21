'use client';

interface WireframeViewerProps {
  wireframe: string;
}

export function WireframeViewer({ wireframe }: WireframeViewerProps) {
  return (
    <div className="p-6">
      <pre className="font-mono text-sm leading-none whitespace-pre overflow-x-auto bg-background border border-border rounded-md p-4">
        {wireframe}
      </pre>
    </div>
  );
}

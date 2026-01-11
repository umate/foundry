'use client';

interface SubtaskProgressProps {
  completed: number;
  total: number;
}

export function SubtaskProgress({ completed, total }: SubtaskProgressProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex items-center gap-1.5">
      {/* Progress bar */}
      <div className="w-12 h-1.5 bg-foreground/10 rounded-sm overflow-hidden">
        <div
          className="h-full bg-secondary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Count text */}
      <span className="text-[10px] font-mono text-muted-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}

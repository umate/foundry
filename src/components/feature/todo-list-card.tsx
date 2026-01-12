"use client";

import type { TodoItem } from "@/lib/hooks/use-claude-code-chat";
import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";

interface TodoListCardProps {
  todos: TodoItem[];
}

export function TodoListCard({ todos }: TodoListCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-3 space-y-2">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        Tasks
      </div>
      <div className="space-y-1">
        {todos.map((todo, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {todo.status === "completed" ? (
              <CheckCircleIcon className="size-4 text-success shrink-0" weight="fill" />
            ) : todo.status === "in_progress" ? (
              <CircleIcon className="size-4 text-secondary shrink-0" weight="bold" />
            ) : (
              <CircleIcon className="size-4 text-muted-foreground shrink-0" />
            )}
            <span className={todo.status === "completed" ? "line-through text-muted-foreground" : ""}>
              {todo.status === "in_progress" ? todo.activeForm : todo.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

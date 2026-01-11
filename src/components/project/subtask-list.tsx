'use client';

import { useState } from 'react';
import { Plus, Trash, Check, CheckSquare } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SubTask } from '@/types/feature';

interface SubtaskListProps {
  subtasks: SubTask[];
  onSubtasksChange: (subtasks: SubTask[]) => void;
}

export function SubtaskList({ subtasks, onSubtasksChange }: SubtaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: SubTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
      order: subtasks.length,
    };

    onSubtasksChange([...subtasks, newTask]);
    setNewTaskTitle('');
  };

  const handleToggleTask = (taskId: string) => {
    const updated = subtasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    onSubtasksChange(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = subtasks.filter(task => task.id !== taskId);
    onSubtasksChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <div className="space-y-2">
      {/* Task List */}
      {subtasks.length === 0 ? (
        <div className="flex items-center gap-2 py-2 text-muted-foreground">
          <CheckSquare weight="duotone" className="size-4" />
          <p className="text-xs">Add your first task below</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {subtasks
            .sort((a, b) => a.order - b.order)
            .map(task => (
              <li
                key={task.id}
                className="flex items-center gap-2 group"
              >
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className={`size-4 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
                    task.completed
                      ? 'bg-secondary border-secondary'
                      : 'border-foreground/30 hover:border-foreground/50'
                  }`}
                >
                  {task.completed && (
                    <Check weight="bold" className="size-3 text-secondary-foreground" />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm truncate ${
                    task.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {task.title}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash weight="bold" className="size-3" />
                </button>
              </li>
            ))}
        </ul>
      )}

      {/* Add Task Input */}
      <div className="flex items-center gap-2">
        <Input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task..."
          className="h-8 text-sm"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddTask}
          disabled={!newTaskTitle.trim()}
          className="size-8 shrink-0"
        >
          <Plus weight="bold" className="size-4" />
        </Button>
      </div>
    </div>
  );
}

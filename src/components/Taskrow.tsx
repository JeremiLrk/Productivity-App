import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Task, Priority, Status } from "@/lib/tasks";

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  finished: "Finished",
};

const PRIORITY_OPTIONS: Priority[] = ["high", "medium", "low"];
const STATUS_OPTIONS: Status[] = ["todo", "in_progress", "finished"];

type TaskRowProps = {
  task: Task;
  onToggleDone: (done: boolean) => void;
  onPriority: (priority: Priority) => void;
  onStatus: (status: Status) => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

export function TaskRow({
  task,
  onToggleDone,
  onPriority,
  onStatus,
  onRename,
  onDelete,
}: TaskRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function commitDraft() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) onRename(trimmed);
    setEditing(false);
  }

  return (
    <li className="grid gap-3 rounded-lg border bg-card p-3 text-card-foreground shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_9rem_9rem_auto] sm:items-center">
      <label className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(event) => onToggleDone(event.currentTarget.checked)}
          className="sr-only"
        />
        <Check className={cn("h-4 w-4", task.done ? "text-emerald-500" : "text-transparent")} />
      </label>

      <div className="min-w-0">
        {editing ? (
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitDraft();
              if (event.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "block w-full truncate rounded-md px-1 py-1 text-left text-sm font-medium",
              "hover:bg-accent hover:text-accent-foreground",
              task.done && "text-muted-foreground line-through"
            )}
            title="Click to edit"
          >
            {task.title}
          </button>
        )}
      </div>

      <select
        value={task.priority}
        onChange={(event) => onPriority(event.target.value as Priority)}
        title="Priority"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {PRIORITY_OPTIONS.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>

      <select
        value={task.status}
        onChange={(event) => onStatus(event.target.value as Status)}
        title="Status"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="Rename task" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Delete task" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}

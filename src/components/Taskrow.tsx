import React, {useState} from "react";
import { Task, Priority, Status } from "@/lib/tasks";

export function TaskRow(props: {
    task: Task;
    onToggleDone: (done: boolean) => void;
    onPriority: (p: Priority) => void;
    onStatus: (s: Status) => void;
    onRename: (title: string) => void;
    onDelete: () => void;
  }) {
    const { task, onToggleDone, onPriority, onStatus, onRename, onDelete } = props;
  
    // Local UI state for inline editing.
    const [editing, setEditing] = useState<boolean>(false);
    const [draft, setDraft] = useState<string>(task.title);
  
    // Save and exit editing mode if content changed & is non-empty.
    function commitDraft(): void {
      const trimmed = draft.trim();
      if (trimmed && trimmed !== task.title) onRename(trimmed);
      setEditing(false);
    }
  
    return (
      <li
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto auto",
          gap: 8,
          alignItems: "center",
          padding: 8,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
        }}
      >
        {/* Checkbox:
            - onChange uses e.currentTarget.checked (boolean) */}
        <input
          type="checkbox"
          checked={task.done}
          onChange={(e) => onToggleDone(e.currentTarget.checked)}
          title="Mark done"
        />
  
        {/* Title:
            - If editing, show an input
            - Else, show a button-like span to start editing
            - Escape cancels, Enter/blur commits
        */}
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitDraft();
              if (e.key === "Escape") {
                setDraft(task.title);
                setEditing(false);
              }
            }}
            autoFocus
            style={{ padding: "8px 10px" }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              textAlign: "left",
              padding: "6px 8px",
              background: "transparent",
              border: 0,
              cursor: "text",
              color: task.done ? "#6b7280" : "inherit",
              textDecoration: task.done ? "line-through" : "none",
            }}
            title="Click to edit"
          >
            {task.title}
          </button>
        )}
  
        {/* Priority select:
            - e.target.value is string -> cast to Priority (safe due to options) */}
        <select
          value={task.priority}
          onChange={(e) => onPriority(e.target.value as Priority)}
          title="Priority"
          style={{ padding: "6px 8px" }}
        >
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
  
        {/* Status select:
            - same pattern as priority */}
        <select
          value={task.status}
          onChange={(e) => onStatus(e.target.value as Status)}
          title="Status"
          style={{ padding: "6px 8px" }}
        >
          <option value="todo">todo</option>
          <option value="in_progress">in_progress</option>
          <option value="finished">finished</option>
        </select>
  
        {/* Delete button */}
        <button type="button" onClick={onDelete} title="Delete">
          Delete
        </button>
      </li>
    );
  }
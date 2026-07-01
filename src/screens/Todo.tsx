import React, {useMemo, useState} from "react";
import { useTasks } from "@/hooks/useTasks";
import { Task, Priority, Status } from "@/lib/tasks";
import { TaskRow } from "@/components/Taskrow";

export default function TasksScreen(){
  const {
    tasks,
    loading,
    create,
    setDone,
    setPriority,
    setStatus,
    updateTitle,
    remove,
    refresh
  } = useTasks();

  //Local state for "Add task" input
  const [title, setTitle] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");


  //Filtered tasks based on Status or Priority
  const filteredTasks: Task[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter( (t) => {
      const matchesPriority = 
        priorityFilter === "all" || t.priority === priorityFilter;
      
      const matchesStatus =
        statusFilter === "all" || t.status === priorityFilter;
      
      const matchesQuery =
        q === "" || t.title.toLowerCase().includes(q);

      return matchesPriority && matchesStatus && matchesQuery
    });
  }, [tasks, query, priorityFilter, statusFilter]);

  async function handleAdd(e : React.FormEvent<HTMLFormElement>) : Promise<void> {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return; //don't add empty titles
    await create(trimmed); //add a new to do
    setTitle(""); //Cleat the input after adding the task
  }

  //render the day of today
  const currentDate = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  
  return (
    <div style={{ maxWidth: 740, margin: "0 auto", padding: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 16, color: "#6b7280" }}>
        {currentDate.toLocaleDateString('en-US', options)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>Tasks</h1>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Add Task Form */}
      <form
        onSubmit={handleAdd}
        style={{ display: "flex", gap: 8, marginTop: 16 }}
      >
        <input
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ flex: 1, padding: "10px 12px" }}
        />
        <button type="submit">Add</button>
      </form>

      {/* Filters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 8,
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <input
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ padding: "8px 10px" }}
        />

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as "all" | Priority)}
          style={{ padding: "8px 10px" }}
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | Status)}
          style={{ padding: "8px 10px" }}
        >
          <option value="all">All statuses</option>
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="finished">Finished</option>
        </select>
      </div>

      {/* Task List */}
      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div>Loading…</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: "24px 8px", textAlign: "center", color: "#6b7280" }}>
            No tasks yet.
          </div>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleDone={(done) => void setDone(task.id, done)}
                onPriority={(p) => void setPriority(task.id, p)}
                onStatus={(s) => void setStatus(task.id, s)}
                onRename={(newTitle) => void updateTitle(task.id, newTitle)}
                onDelete={() => void remove(task.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}



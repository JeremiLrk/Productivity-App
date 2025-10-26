import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";

export default function TasksScreen() {
  const { tasks, loading, create, setDone, setPriority, setStatus, updateTitle, remove } = useTasks();
  const [title, setTitle] = useState("");

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); void create(title); setTitle(""); }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <button>Add</button>
      </form>

      {loading ? "Loading..." : tasks.map(t => (
        <div key={t.id}>
          <input type="checkbox" checked={t.done} onChange={(e) => setDone(t.id, e.target.checked)} />
          <input value={t.title} onChange={(e) => updateTitle(t.id, e.target.value)} />
          <select value={t.priority} onChange={(e) => setPriority(t.id, e.target.value as any)}>
            <option>low</option><option>medium</option><option>high</option>
          </select>
          <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value as any)}>
            <option>todo</option><option>in_progress</option><option>finished</option>
          </select>
          <button onClick={() => remove(t.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

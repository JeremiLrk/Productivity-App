import { FormEvent, useMemo, useState } from "react";
import { ListFilter, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/hooks/useTasks";
import { Task, Priority, Status } from "@/lib/tasks";
import { PRIORITY_LABELS, STATUS_LABELS, TaskRow } from "@/components/Taskrow";

const PRIORITY_OPTIONS: Priority[] = ["high", "medium", "low"];
const STATUS_OPTIONS: Status[] = ["todo", "in_progress", "finished"];

export default function TasksScreen() {
  const {
    tasks,
    loading,
    create,
    setDone,
    setPriority,
    setStatus,
    updateTitle,
    remove,
    refresh,
  } = useTasks();

  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const filteredTasks: Task[] = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesQuery = search === "" || task.title.toLowerCase().includes(search);
      return matchesPriority && matchesStatus && matchesQuery;
    });
  }, [tasks, query, priorityFilter, statusFilter]);

  const openTaskCount = tasks.filter((task) => !task.done).length;
  const finishedTaskCount = tasks.filter((task) => task.done).length;
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    await create(trimmed);
    setTitle("");
  }

  return (
    <div className="h-full w-full overflow-hidden p-4 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4">
        <div className="shrink-0 space-y-1 pl-12 xl:pl-0">
          <div className="text-sm text-muted-foreground">{currentDate}</div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tasks</h1>
              <p className="text-sm text-muted-foreground">
                {openTaskCount} open, {finishedTaskCount} finished
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
              {loading ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </div>

        <Card className="shrink-0 rounded-lg">
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Add a task..."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shrink-0 rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListFilter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Search and narrow the task list without changing task order.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <Input
              placeholder="Search tasks..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as "all" | Priority)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All priorities</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <Card className="rounded-lg">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">Loading tasks...</CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">No matching tasks.</CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggleDone={(done) => void setDone(task.id, done)}
                  onPriority={(priority) => void setPriority(task.id, priority)}
                  onStatus={(status) => void setStatus(task.id, status)}
                  onRename={(newTitle) => void updateTitle(task.id, newTitle)}
                  onDelete={() => void remove(task.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

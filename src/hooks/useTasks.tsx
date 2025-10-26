import { useCallback, useEffect, useState } from "react";
import {
  listTasks,
  addTask,
  setPriority as setPriorityApi,
  setStatus as setStatusApi,
  toggleDone as toggleDoneApi,
  deleteTask as deleteTaskApi,
  updateTitle as updateTitleApi,
  type Task,
  type Priority,
  type Status,
} from "../lib/tasks";


export function useTasks(){
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback( async () => {
        setLoading(true);
        const data = await listTasks();
        setTasks(data);
        setLoading(false);
    }, [])

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const create = useCallback(async (title: string, priority: Priority = "medium") => {
        if (!title.trim()) return;
        await addTask(title.trim(), priority);
        await refresh();
    }, [refresh]);
    
    const setDone = useCallback(async (id: number, done: boolean) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, done, status: done ? "finished" : "todo" } : t));
        await toggleDoneApi(id, done);
        await refresh();
    }, [refresh]);
    
    const setPriority = useCallback(async (id: number, priority: Priority) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
        await setPriorityApi(id, priority);
        await refresh();
    }, [refresh]);
    
    const setStatus = useCallback(async (id: number, status: Status) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status, done: status === "finished" } : t));
        await setStatusApi(id, status);
        await refresh();
    }, [refresh]);
    
    const updateTitle = useCallback(async (id: number, title: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
        await updateTitleApi(id, title);
        await refresh();
    }, [refresh]);
    
    const remove = useCallback(async (id: number) => {
        setTasks(prev => prev.filter(t => t.id !== id));
        await deleteTaskApi(id);
        await refresh();
    }, [refresh]);
    
    return {
        tasks,
        loading,
        refresh,
        create,
        setDone,
        setPriority,
        setStatus,
        updateTitle,
        remove,
    };
}
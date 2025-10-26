import { getDb } from "./db";

export type Priority = "low" | "medium" | "high"
export type Status = "todo" | "in_progress" | "finished"

export type TaskRow = {id : number, title : string, done : number, priority : string, status : string}; //SQLLite stores a bool as an integer
export type Task = {id : number, title : string, done : boolean, priority : string, status : string};

const rowToTask = (r : TaskRow): Task => ({
    id : r.id,
    title : r.title,
    done: !!r.done,
    priority : (["low", "medium", "high"] as const).includes(r.priority as Priority)
    ? (r.priority as Priority)
    : "medium",
    status : (["todo", "in_progress", "finished"] as const).includes(r.status as Status)
    ? (r.status as Status)
    : "todo"         
});


//CRUD

// List tasks (high first, then medium, then low; keep TODO before others; newest first)
export async function listTasks() : Promise<Task[]> {
    const db = await getDb();
    const rows = await db.select<TaskRow[]>(
        `
        SELECT id, title, done, priority, status
        FROM tasks
        ORDER BY 
        CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
        CASE status   WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        id DESC       
        `
    )
    return rows.map(rowToTask);
}

// Create a task (default priority: medium, default status: todo)
export async function addTask(title:string, priority : Priority = "medium") : Promise<void> {
    const db = await getDb();
    await db.execute(
        `INSERT INTO tasks (title, priority, status) VALUES (?, ?, 'todo')`, [title, priority]
    );    
}


//Update only the title
export async function updateTitel(id :number, title : string) : Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE tasks SET title = ? WHERE id = ?`, [title, id]);    
}


// Change priority
export async function setPriority(id: number, priority: Priority): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE tasks SET priority = ? WHERE id = ?`, [priority, id]);
}


// Change status; keep done in sync (finished => done = 1, others => 0)
export async function setStatus(id: number, status: Status): Promise<void> {
    const db = await getDb();
    const done = status === "finished" ? 1 : 0;
    await db.execute(`UPDATE tasks SET status = ?, done = ? WHERE id = ?`, [status, done, id]);
}


// Toggle the boolean; keep status in sync (true => finished, false => todo)
export async function toggleDone(id: number, done: boolean): Promise<void> {
    const db = await getDb();
    const status: Status = done ? "finished" : "todo";
    await db.execute(`UPDATE tasks SET done = ?, status = ? WHERE id = ?`, [done ? 1 : 0, status, id]);
}


// Delete a task (you said finishing should NOT delete, so this is only on explicit delete)
export async function deleteTask(id: number): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM tasks WHERE id = ?`, [id]);
}

// import Database from "@tauri-apps/plugin-sql";

// const db = await Database.load("sqlite:tasks.db");


// //create tables for tasks
// await db.execute(
//   `CREATE TABLE IF NOT EXISTS tasks (
// 	  id INTEGER PRIMARY KEY AUTOINCREMENT,
//   	title TEXT NOT NULL,
//   	done BOOLEAN default 0
//   )`
// )

/*
//add tasks
await db.execute("INSERT INTO tasks (title, done) VALUES (?, ?)", ["Learn Tauri", 0])
//Get all tasks
const tasks = await db.select("SELECT * FROM TASKS")
//Mark task as done
await db.execute("UPDATE tasks SET done = 1 WHERE ID = ?",[taskId])
//delete a task
await db.execute("DELETE FROM tasks WHERE id = ?", [taskId]);
*/


export default function Todo() {
    return <h1>Your todo list</h1>
}
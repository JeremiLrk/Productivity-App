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

import { useState } from "react";
import "./app.css";
import Hamburger from "./components/Burger";
import Sidebar from "./components/Sidebar";
import Home from "./screens/Home";
import Contributions from "./screens/Contributions";
import Pomodoro from "./screens/Pomodoro";
import Todo from "./screens/Todo";

type View = 'home' | 'pomodoro' | 'todo' | 'contrib';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<View>('home');

  return (
    <div className="h-screen relative">
      
      <div className="fixed top-3 left-3 z-[60]">
        <Hamburger active={menuOpen} onClick={() => setMenuOpen(!menuOpen)}/>
      </div>

      {/* Content */}
      <main className="h-[calc(100vh-3rem)] grid place-items-center">
        {view === "home" && <Home/>}
        {view === "pomodoro" && <Pomodoro/>}
        {view === "todo" && <Todo/>}
        {view === "contrib" && <Contributions/>}
      </main>

      {/* Overlay sidebar */}
      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(v) => { setView(v); setMenuOpen(false); }}
      />
    </div>
  );
}

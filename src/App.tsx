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
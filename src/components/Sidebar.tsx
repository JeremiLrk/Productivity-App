type View = 'home' | 'pomodoro' | 'todo' | 'contrib' | 'settings';

type SidebarProps = {
  open: boolean;                       // show/hide
  onClose: () => void;                 // click backdrop to close
  onSelect: (v: View) => void;         // choose a screen + close
};

export default function Sidebar({ open, onClose, onSelect }: SidebarProps) {
  return (
    <>
      {/* Backdrop (dim the page but keep it visible) */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 z-40"
        />
      )}

      {/* Sliding panel */}
      <nav
        className={[
          "fixed top-0 left-0 h-screen w-72 border-r bg-card text-card-foreground shadow-lg z-50",
          "flex flex-col items-center justify-center",
          "transform transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <ul className="p-2 space-y-1 w-full">
          <li><button className="w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground" onClick={() => onSelect('home')}>Home</button></li>
          <li><button className="w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground" onClick={() => onSelect('pomodoro')}>Pomodoro</button></li>
          <li><button className="w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground" onClick={() => onSelect('todo')}>To-Do</button></li>
          <li><button className="w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground" onClick={() => onSelect('contrib')}>Contribution Graph</button></li>
          <li><button className="w-full text-left px-3 py-2 rounded hover:bg-accent hover:text-accent-foreground" onClick={() => onSelect('settings')}>Settings</button></li>
        </ul>
      </nav>
    </>
  );
}

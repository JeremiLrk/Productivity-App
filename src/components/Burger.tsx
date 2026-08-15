type HamburgerProps = {
    active: boolean;
    onClick: () => void;
}

export default function Hamburger({ active, onClick }: HamburgerProps) {
    return (
        <button
        aria-label={active ? "Close menu" : "Open menu"}
        onClick={onClick}
        className="rounded p-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
        <div className={`tham tham-e-squeeze tham-w-6 ${active ? "tham-active" : ""}`}>
            <div className="tham-box">
            <div className="tham-inner bg-current" />
            </div>
        </div>
        </button>
      );
  }

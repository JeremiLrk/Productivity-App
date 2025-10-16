type HamburgerProps = {
    active: boolean;
    onClick: () => void;
}

export default function Hamburger({ active, onClick }: HamburgerProps) {
    return (
        <button
        aria-label="Open menu"
        onClick={onClick}
        className="p-2 rounded hover:bg-gray-100"
        >
        <div className={`tham tham-e-squeeze tham-w-6 ${active ? "tham-active" : ""}`}>
            <div className="tham-box">
            <div className="tham-inner bg-black" />
            </div>
        </div>
        </button>
      );
  }
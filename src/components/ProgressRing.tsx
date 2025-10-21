type ProgressRingProps = {
    value: number;           // 0..100
    size?: number;           // px
    strokeWidth?: number;    // px
    className?: string;
    children?: React.ReactNode; // center content (my MM:SS)
  };
  
  export function ProgressRing({
    value,
    size = 220,
    strokeWidth = 10,
    className,
    children,
  }: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, value));
    const dashOffset = circumference * (1 - clamped / 100);
  
    return (
      <div
        className={`relative inline-grid place-items-center ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            className="text-gray-200"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            className="text-black"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            // smooth animate the arc
            style={{ transition: "stroke-dashoffset 1000ms linear" }}
          />
        </svg>
  
        {/* Center content */}
        <div className="absolute inset-0 grid place-items-center">
          {children}
        </div>
      </div>
    );
  }
  
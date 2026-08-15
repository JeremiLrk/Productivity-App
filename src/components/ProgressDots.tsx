// src/components/ProgressDots.tsx
type Props = {
    count: number;        // total dots (cyclesBeforeLongBreak)
    filled: number;       // completed focuses in current cycle
    activeIndex?: number; // index of the CURRENT focus (animated). undefined = no animation
    size?: number;        // px
  };
  
  export function ProgressDots({ count, filled, activeIndex, size = 12 }: Props) {
    const safeCount = Math.max(1, count);
    const safeFilled = Math.min(Math.max(0, filled), safeCount);
  
    return (
      <div className="flex items-center gap-2" aria-label="Focus sessions progress">
        {Array.from({ length: safeCount }).map((_, i) => {
          const isFilled = i < safeFilled;
          const isActive = activeIndex === i;
  
          return (
            <span
              key={i}
              className={[
                "rounded-full border transition-transform",
                isFilled ? "border-foreground bg-foreground" : "border-border bg-background",
                // subtle highlight ring on active
                isActive ? "animate-pulse ring-2 ring-ring/40" : "",
                "shadow-[0_1px_0_rgba(0,0,0,0.05)]",
                "hover:scale-105"
              ].join(" ")}
              style={{ width: size, height: size }}
              aria-label={
                isActive
                  ? "current focus session"
                  : isFilled
                  ? "completed focus session"
                  : "pending focus session"
              }
            />
          );
        })}
      </div>
    );
  }
  

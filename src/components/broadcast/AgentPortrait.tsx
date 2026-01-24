import { cn } from "@/lib/utils";

interface AgentPortraitProps {
  name: string;
  badge: string;
  color: string;
  type: string;
  score: number;
  rank?: number;
  cooperationRate?: number;
  side: "left" | "right";
  isActive?: boolean;
  decision?: "split" | "steal" | null;
  showDecision?: boolean;
}

export function AgentPortrait({
  name,
  badge,
  color,
  score,
  rank,
  cooperationRate = 0,
  side,
  isActive,
  decision,
  showDecision,
}: AgentPortraitProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 p-6 rounded-xl transition-all duration-300",
        side === "left" ? "items-start text-left" : "items-end text-right",
        isActive && "bg-elevated/50"
      )}
    >
      {/* Rank Badge */}
      {rank && (
        <div className="text-xs text-muted-foreground font-medium">
          #{rank}
        </div>
      )}

      {/* Agent Badge */}
      <div
        className={cn(
          "text-4xl font-mono font-bold tracking-tight transition-all duration-300",
          isActive && "scale-110"
        )}
        style={{ color }}
      >
        {badge}
      </div>

      {/* Agent Name */}
      <div className="text-lg font-semibold text-foreground">
        {name}
      </div>

      {/* Stats */}
      <div className={cn(
        "flex flex-col gap-1 text-sm",
        side === "left" ? "items-start" : "items-end"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Score</span>
          <span className="font-mono font-semibold text-foreground">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Coop</span>
          <span className={cn(
            "font-mono font-semibold",
            cooperationRate >= 0.7 ? "text-split" : cooperationRate >= 0.4 ? "text-negotiate" : "text-steal"
          )}>
            {Math.round(cooperationRate * 100)}%
          </span>
        </div>
      </div>

      {/* Decision Reveal */}
      {showDecision && decision && (
        <div
          className={cn(
            "mt-4 px-6 py-3 rounded-lg font-bold text-lg uppercase tracking-wider animate-scale-in",
            decision === "split"
              ? "bg-split/20 text-split glow-split"
              : "bg-steal/20 text-steal glow-steal"
          )}
        >
          {decision}
        </div>
      )}
    </div>
  );
}

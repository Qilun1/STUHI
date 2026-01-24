import { cn } from "@/lib/utils";
import { Handshake, ShieldSlash } from "@phosphor-icons/react";

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
        isActive && "bg-zinc-800/30 backdrop-blur-sm"
      )}
    >
      {/* Rank Badge */}
      {rank && (
        <div className="text-xs text-zinc-500 font-medium font-mono">
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
      <div className="text-lg font-semibold text-zinc-100">
        {name}
      </div>

      {/* Stats */}
      <div className={cn(
        "flex flex-col gap-1.5 text-sm",
        side === "left" ? "items-start" : "items-end"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Score</span>
          <span className="font-mono font-semibold text-zinc-200">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Coop</span>
          <span className={cn(
            "font-mono font-semibold",
            cooperationRate >= 0.7 ? "text-green-400" : cooperationRate >= 0.4 ? "text-amber-400" : "text-red-400"
          )}>
            {Math.round(cooperationRate * 100)}%
          </span>
        </div>
      </div>

      {/* Decision Reveal */}
      {showDecision && decision && (
        <div
          className={cn(
            "mt-4 px-6 py-3 rounded-xl font-bold text-lg flex items-center gap-2 animate-scale-in border",
            decision === "split"
              ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-lg shadow-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/30 shadow-lg shadow-red-500/20"
          )}
        >
          {decision === "split" ? (
            <Handshake className="size-5" weight="fill" />
          ) : (
            <ShieldSlash className="size-5" weight="fill" />
          )}
          {decision.toUpperCase()}
        </div>
      )}
    </div>
  );
}

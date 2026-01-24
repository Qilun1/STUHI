import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

export interface MatchCardGame {
  _id: Id<"games">;
  roundNumber: number;
  phase: "negotiation" | "decision" | "reveal" | "completed";
  agentADecision?: "split" | "steal";
  agentBDecision?: "split" | "steal";
  agentAScore?: number;
  agentBScore?: number;
  messageCount: number;
  agentA: {
    _id: Id<"agents">;
    name: string;
    badge: string;
    color: string;
    type: string;
  } | null;
  agentB: {
    _id: Id<"agents">;
    name: string;
    badge: string;
    color: string;
    type: string;
  } | null;
}

interface MatchCardProps {
  game: MatchCardGame;
  isActive?: boolean;
  onClick?: () => void;
}

const phaseLabels: Record<string, string> = {
  negotiation: "NEGOTIATING",
  decision: "DECIDING",
  reveal: "REVEALING",
  completed: "COMPLETED",
};

const phaseColors: Record<string, string> = {
  negotiation: "text-negotiate",
  decision: "text-evolve",
  reveal: "text-steal",
  completed: "text-split",
};

export function MatchCard({ game, isActive, onClick }: MatchCardProps) {
  const isCompleted = game.phase === "completed";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 bg-surface border-2 border-border text-left transition-all",
        "hover:border-muted-foreground hover:bg-elevated",
        isActive && "border-negotiate animate-pulse",
        isCompleted && "opacity-80",
        onClick && "cursor-pointer"
      )}
    >
      {/* Header - Phase */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn("text-xs font-bold", phaseColors[game.phase])}>
          {phaseLabels[game.phase]}
        </span>
        {game.phase === "negotiation" && (
          <span className="text-xs text-muted-foreground">
            {game.messageCount}/6
          </span>
        )}
      </div>

      {/* Agents */}
      <div className="flex items-center justify-between gap-2">
        {/* Agent A */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <Badge
            variant={game.agentA?.type as "diplomat"}
            className="text-xs"
          >
            {game.agentA?.badge ?? "???"}
          </Badge>
          {isCompleted && game.agentADecision && (
            <Badge
              variant={game.agentADecision === "split" ? "split" : "steal"}
              className="text-[10px] px-1"
            >
              {game.agentADecision.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* VS */}
        <span className="text-muted-foreground text-xs font-bold">VS</span>

        {/* Agent B */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <Badge
            variant={game.agentB?.type as "diplomat"}
            className="text-xs"
          >
            {game.agentB?.badge ?? "???"}
          </Badge>
          {isCompleted && game.agentBDecision && (
            <Badge
              variant={game.agentBDecision === "split" ? "split" : "steal"}
              className="text-[10px] px-1"
            >
              {game.agentBDecision.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Score (if completed) */}
      {isCompleted && (
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
          <span
            className={cn(
              "font-bold text-sm",
              game.agentAScore! > game.agentBScore!
                ? "text-split"
                : game.agentAScore! < game.agentBScore!
                  ? "text-steal"
                  : "text-muted-foreground"
            )}
          >
            {game.agentAScore}
          </span>
          <span className="text-xs text-muted-foreground">SCORE</span>
          <span
            className={cn(
              "font-bold text-sm",
              game.agentBScore! > game.agentAScore!
                ? "text-split"
                : game.agentBScore! < game.agentAScore!
                  ? "text-steal"
                  : "text-muted-foreground"
            )}
          >
            {game.agentBScore}
          </span>
        </div>
      )}
    </button>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChatCircle, Brain, Eye, CheckCircle } from "@phosphor-icons/react";
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

const phaseConfig: Record<string, { label: string; icon: typeof ChatCircle; color: string }> = {
  negotiation: { label: "Negotiating", icon: ChatCircle, color: "text-amber-400" },
  decision: { label: "Deciding", icon: Brain, color: "text-purple-400" },
  reveal: { label: "Revealing", icon: Eye, color: "text-red-400" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-green-400" },
};

export function MatchCard({ game, isActive, onClick }: MatchCardProps) {
  const isCompleted = game.phase === "completed";
  const { label, icon: PhaseIcon, color } = phaseConfig[game.phase];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl text-left transition-all",
        "hover:border-zinc-700 hover:bg-zinc-800/50",
        isActive && "border-amber-500/50 shadow-lg shadow-amber-500/10",
        isCompleted && "opacity-80",
        onClick && "cursor-pointer"
      )}
    >
      {/* Header - Phase */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex items-center gap-1.5 text-xs font-medium", color)}>
          <PhaseIcon className="size-3.5" weight="duotone" />
          {label}
        </div>
        {game.phase === "negotiation" && (
          <span className="text-xs text-zinc-500 font-mono">
            {game.messageCount}/6
          </span>
        )}
      </div>

      {/* Agents */}
      <div className="flex items-center justify-between gap-2">
        {/* Agent A */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Badge
            variant={game.agentA?.type as "diplomat"}
            className="text-xs"
          >
            {game.agentA?.badge ?? "???"}
          </Badge>
          {isCompleted && game.agentADecision && (
            <Badge
              variant={game.agentADecision === "split" ? "split" : "steal"}
              className="text-[10px] px-1.5"
            >
              {game.agentADecision.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* VS */}
        <span className="text-zinc-600 text-xs font-medium">vs</span>

        {/* Agent B */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <Badge
            variant={game.agentB?.type as "diplomat"}
            className="text-xs"
          >
            {game.agentB?.badge ?? "???"}
          </Badge>
          {isCompleted && game.agentBDecision && (
            <Badge
              variant={game.agentBDecision === "split" ? "split" : "steal"}
              className="text-[10px] px-1.5"
            >
              {game.agentBDecision.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Score (if completed) */}
      {isCompleted && (
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-800/50">
          <span
            className={cn(
              "font-mono font-bold text-sm",
              game.agentAScore! > game.agentBScore!
                ? "text-green-400"
                : game.agentAScore! < game.agentBScore!
                  ? "text-red-400"
                  : "text-zinc-500"
            )}
          >
            {game.agentAScore}
          </span>
          <span className="text-[10px] text-zinc-600 font-medium">SCORE</span>
          <span
            className={cn(
              "font-mono font-bold text-sm",
              game.agentBScore! > game.agentAScore!
                ? "text-green-400"
                : game.agentBScore! < game.agentAScore!
                  ? "text-red-400"
                  : "text-zinc-500"
            )}
          >
            {game.agentBScore}
          </span>
        </div>
      )}
    </button>
  );
}

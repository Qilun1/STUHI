import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface RoundIndicatorProps {
  roundNumber: number;
  activeGameId?: Id<"games">;
  onGameSelect?: (gameId: Id<"games">) => void;
}

export function RoundIndicator({ roundNumber, activeGameId, onGameSelect }: RoundIndicatorProps) {
  const games = useQuery(api.games.byRoundWithAgents, { roundNumber });

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {games.map((game) => {
        const isActive = game._id === activeGameId;
        const isCompleted = game.phase === "completed";
        const isInProgress = game.phase !== "completed" && !isActive;

        // Determine outcome for completed games
        let outcomeColor = "bg-zinc-700";
        if (isCompleted) {
          if (game.agentADecision === "split" && game.agentBDecision === "split") {
            outcomeColor = "bg-green-400";
          } else if (game.agentADecision === "steal" && game.agentBDecision === "steal") {
            outcomeColor = "bg-red-400";
          } else {
            outcomeColor = "bg-amber-400";
          }
        }

        return (
          <button
            key={game._id}
            onClick={() => onGameSelect?.(game._id)}
            className={cn(
              "relative group transition-all duration-200",
              onGameSelect && "cursor-pointer"
            )}
          >
            {/* Dot */}
            <div
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200",
                isActive && "w-4 h-4 bg-cyan-400 ring-2 ring-cyan-400/30 animate-subtle-pulse",
                !isActive && isCompleted && outcomeColor,
                !isActive && !isCompleted && isInProgress && "bg-zinc-600",
                !isActive && !isCompleted && !isInProgress && "bg-zinc-700/50"
              )}
            />

            {/* Tooltip on hover */}
            <div className={cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg",
              "bg-zinc-900/95 backdrop-blur-sm text-zinc-300 text-xs whitespace-nowrap",
              "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
              "border border-zinc-800/50 shadow-lg"
            )}>
              <span className="font-mono">{game.agentA?.badge}</span>
              <span className="text-zinc-500 mx-1.5">vs</span>
              <span className="font-mono">{game.agentB?.badge}</span>
              {isCompleted && (
                <span className="ml-1.5 text-zinc-500 font-mono">
                  ({game.agentAScore}-{game.agentBScore})
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

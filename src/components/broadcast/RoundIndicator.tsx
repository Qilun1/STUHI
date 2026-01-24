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
      {games.map((game, index) => {
        const isActive = game._id === activeGameId;
        const isCompleted = game.phase === "completed";
        const isInProgress = game.phase !== "completed" && !isActive;

        // Determine outcome for completed games
        let outcomeColor = "bg-muted-foreground/30";
        if (isCompleted) {
          if (game.agentADecision === "split" && game.agentBDecision === "split") {
            outcomeColor = "bg-split";
          } else if (game.agentADecision === "steal" && game.agentBDecision === "steal") {
            outcomeColor = "bg-steal";
          } else {
            outcomeColor = "bg-negotiate";
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
                isActive && "w-4 h-4 bg-foreground ring-2 ring-foreground/30 animate-subtle-pulse",
                !isActive && isCompleted && outcomeColor,
                !isActive && !isCompleted && isInProgress && "bg-muted-foreground/50",
                !isActive && !isCompleted && !isInProgress && "bg-muted-foreground/20"
              )}
            />

            {/* Tooltip on hover */}
            <div className={cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md",
              "bg-popover text-popover-foreground text-xs whitespace-nowrap",
              "opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
              "border border-border"
            )}>
              {game.agentA?.badge} vs {game.agentB?.badge}
              {isCompleted && (
                <span className="ml-1 text-muted-foreground">
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

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MatchCard, type MatchCardGame } from "./MatchCard";
import type { Id } from "../../../convex/_generated/dataModel";

interface ActiveMatchesProps {
  roundNumber: number;
  onSelectGame: (gameId: Id<"games">) => void;
}

export function ActiveMatches({ roundNumber, onSelectGame }: ActiveMatchesProps) {
  const games = useQuery(api.games.byRoundWithAgents, { roundNumber });

  if (games === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-elevated animate-pulse border-2 border-border" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No games in this round yet
      </div>
    );
  }

  // Find the currently active game (first non-completed)
  const activeGameId = games.find((g) => g.phase !== "completed")?._id;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {games.map((game) => (
        <MatchCard
          key={game._id}
          game={game as MatchCardGame}
          isActive={game._id === activeGameId}
          onClick={() => onSelectGame(game._id)}
        />
      ))}
    </div>
  );
}

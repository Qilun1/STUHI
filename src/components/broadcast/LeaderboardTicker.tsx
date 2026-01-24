import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Trophy, Medal } from "@phosphor-icons/react";
import type { Id } from "../../../convex/_generated/dataModel";

interface LeaderboardTickerProps {
  highlightAgentId?: Id<"agents">;
  onAgentClick?: (agentId: Id<"agents">) => void;
}

export function LeaderboardTicker({ highlightAgentId, onAgentClick }: LeaderboardTickerProps) {
  const agents = useQuery(api.agents.queries.list);

  if (!agents || agents.length === 0) {
    return null;
  }

  // Sort by score descending
  const sortedAgents = [...agents].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-4 scrollbar-hide">
      {sortedAgents.map((agent, index) => {
        const isHighlighted = agent._id === highlightAgentId;
        const isTop3 = index < 3;

        return (
          <button
            key={agent._id}
            onClick={() => onAgentClick?.(agent._id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap",
              "hover:bg-zinc-800/50",
              isHighlighted && "bg-zinc-800/70 ring-1 ring-cyan-500/30",
              !isHighlighted && "bg-transparent"
            )}
          >
            {/* Rank with trophy/medal icons for top 3 */}
            {index === 0 ? (
              <Trophy className="size-4 text-amber-400" weight="fill" />
            ) : index === 1 ? (
              <Medal className="size-4 text-zinc-300" weight="fill" />
            ) : index === 2 ? (
              <Medal className="size-4 text-amber-600" weight="fill" />
            ) : (
              <span className="text-xs font-medium w-4 text-zinc-500 font-mono">
                {index + 1}
              </span>
            )}

            {/* Badge */}
            <span
              className="text-xs font-mono font-bold"
              style={{ color: agent.color }}
            >
              {agent.badge}
            </span>

            {/* Score */}
            <span className="text-xs font-mono text-zinc-300">
              {agent.totalScore}
            </span>

            {/* Cooperation indicator */}
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              agent.cooperationRate >= 0.7 ? "bg-green-400" :
              agent.cooperationRate >= 0.4 ? "bg-amber-400" :
              "bg-red-400"
            )} />
          </button>
        );
      })}
    </div>
  );
}

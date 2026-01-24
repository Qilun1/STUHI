import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

export function TrustNetwork() {
  const agents = useQuery(api.agents.queries.list);
  const trustData = useQuery(api.agents.queries.trustNetwork);

  if (!agents || agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        No agents to display
      </div>
    );
  }

  // Create a simple grid layout showing trust relationships
  return (
    <div className="h-full w-full overflow-auto p-2">
      <div className="grid gap-2" style={{
        gridTemplateColumns: `repeat(${Math.min(5, agents.length)}, 1fr)`
      }}>
        {agents.map((agent) => {
          // Find trust relationships for this agent
          const trusts = trustData?.edges.filter(e => e.source === agent._id) || [];
          const avgTrust = trusts.length > 0
            ? trusts.reduce((sum, t) => sum + t.trustScore, 0) / trusts.length
            : 0;

          return (
            <div
              key={agent._id}
              className={cn(
                "relative p-2.5 rounded-lg border text-center transition-all",
                avgTrust > 20 && "border-green-500/30 bg-green-500/5 shadow-lg shadow-green-500/10",
                avgTrust < -20 && "border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/10",
                avgTrust >= -20 && avgTrust <= 20 && "border-zinc-800/50 bg-zinc-800/30"
              )}
            >
              {/* Agent badge */}
              <div
                className="text-xs font-mono font-bold mb-1"
                style={{ color: agent.color }}
              >
                {agent.badge}
              </div>

              {/* Trust indicator */}
              <div className={cn(
                "text-xs font-mono font-semibold",
                avgTrust > 0 ? "text-green-400" : avgTrust < 0 ? "text-red-400" : "text-zinc-500"
              )}>
                {avgTrust > 0 ? "+" : ""}{Math.round(avgTrust)}
              </div>

              {/* Cooperation rate bar */}
              <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all rounded-full"
                  style={{ width: `${agent.cooperationRate * 100}%` }}
                />
              </div>

              {/* Score */}
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">
                {agent.totalScore} pts
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-green-400" />
          <span>Trusted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-red-400" />
          <span>Distrusted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm bg-zinc-600" />
          <span>Neutral</span>
        </div>
      </div>
    </div>
  );
}

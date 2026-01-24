import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

export function TrustNetwork() {
  const agents = useQuery(api.agents.queries.list);
  const trustData = useQuery(api.agents.queries.trustNetwork);

  if (!agents || agents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
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
                "relative p-2 border-2 text-center transition-all",
                avgTrust > 20 && "border-split bg-split/10",
                avgTrust < -20 && "border-steal bg-steal/10",
                avgTrust >= -20 && avgTrust <= 20 && "border-border bg-elevated"
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
                "text-xs",
                avgTrust > 0 ? "text-split" : avgTrust < 0 ? "text-steal" : "text-muted-foreground"
              )}>
                {avgTrust > 0 ? "+" : ""}{Math.round(avgTrust)}
              </div>

              {/* Cooperation rate bar */}
              <div className="mt-1 h-1 bg-border overflow-hidden">
                <div
                  className="h-full bg-split transition-all"
                  style={{ width: `${agent.cooperationRate * 100}%` }}
                />
              </div>

              {/* Score */}
              <div className="text-[10px] text-muted-foreground mt-1">
                {agent.totalScore} pts
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-split" />
          <span>Trusted</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-steal" />
          <span>Distrusted</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-border" />
          <span>Neutral</span>
        </div>
      </div>
    </div>
  );
}

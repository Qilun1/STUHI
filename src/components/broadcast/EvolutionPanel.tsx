import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface EvolutionPanelProps {
  agentId: Id<"agents">;
  onClose?: () => void;
}

export function EvolutionPanel({ agentId, onClose }: EvolutionPanelProps) {
  const agent = useQuery(api.agents.queries.getById, { agentId });
  const evolutions = useQuery(api.agents.queries.getEvolutionHistory, { agentId });

  if (!agent) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading agent...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-mono font-bold"
            style={{ color: agent.color }}
          >
            {agent.badge}
          </span>
          <span className="font-semibold">{agent.name}</span>
          <span className="text-xs text-muted-foreground">
            v{agent.promptVersion}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-border bg-elevated/50">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-foreground">{agent.totalScore}</div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-foreground">{agent.gamesPlayed}</div>
          <div className="text-xs text-muted-foreground">Games</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold font-mono",
            agent.cooperationRate >= 0.7 ? "text-split" : agent.cooperationRate >= 0.4 ? "text-negotiate" : "text-steal"
          )}>
            {Math.round(agent.cooperationRate * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">Cooperation</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold font-mono",
            agent.promiseKeepingRate >= 0.7 ? "text-split" : agent.promiseKeepingRate >= 0.4 ? "text-negotiate" : "text-steal"
          )}>
            {Math.round(agent.promiseKeepingRate * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">Promises Kept</div>
        </div>
      </div>

      {/* Current Strategy */}
      <div className="p-4 border-b border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Current Strategy
        </div>
        <div className="text-sm text-foreground leading-relaxed bg-elevated p-3 rounded-lg font-mono">
          {agent.systemPrompt.length > 300
            ? agent.systemPrompt.slice(0, 300) + "..."
            : agent.systemPrompt}
        </div>
      </div>

      {/* Evolution History */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          Evolution History
        </div>

        {!evolutions || evolutions.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No evolutions yet. Agent is using original strategy.
          </div>
        ) : (
          <div className="space-y-4">
            {evolutions.map((evolution, index) => (
              <div
                key={evolution._id}
                className="relative pl-6 pb-4 border-l border-border last:border-l-transparent"
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full",
                  index === 0 ? "bg-evolve" : "bg-muted-foreground"
                )} />

                {/* Evolution content */}
                <div className="bg-elevated p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-evolve">
                      Version {evolution.version}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Round {evolution.gamesInPeriod}
                    </span>
                  </div>

                  <div className="text-sm text-foreground mb-2">
                    {evolution.evolutionReason}
                  </div>

                  {/* Performance at evolution */}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Win: {Math.round(evolution.winRate * 100)}%</span>
                    <span>Avg: {evolution.averageScore.toFixed(1)}</span>
                    <span>Coop: {Math.round(evolution.cooperationRate * 100)}%</span>
                  </div>

                  {evolution.selfReflection && (
                    <div className="mt-2 text-xs text-muted-foreground italic border-t border-border pt-2">
                      "{evolution.selfReflection}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

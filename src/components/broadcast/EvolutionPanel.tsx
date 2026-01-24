import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { X, GitBranch, ChartLine, Brain, DNA } from "@phosphor-icons/react";
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
      <div className="p-6 text-center text-zinc-500">
        Loading agent...
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800/50 overflow-hidden shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-gradient-to-b from-zinc-800/20 to-transparent">
        <div className="flex items-center gap-3">
          <span
            className="text-lg font-mono font-bold"
            style={{ color: agent.color }}
          >
            {agent.badge}
          </span>
          <span className="font-semibold text-zinc-100">{agent.name}</span>
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <GitBranch className="size-3" weight="duotone" />
            v{agent.promptVersion}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800/50 bg-zinc-800/20">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-zinc-100">{agent.totalScore}</div>
          <div className="text-xs text-zinc-500 flex items-center justify-center gap-1">
            <ChartLine className="size-3" weight="duotone" />
            Score
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-zinc-100">{agent.gamesPlayed}</div>
          <div className="text-xs text-zinc-500">Games</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold font-mono",
            agent.cooperationRate >= 0.7 ? "text-green-400" : agent.cooperationRate >= 0.4 ? "text-amber-400" : "text-red-400"
          )}>
            {Math.round(agent.cooperationRate * 100)}%
          </div>
          <div className="text-xs text-zinc-500">Cooperation</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold font-mono",
            agent.promiseKeepingRate >= 0.7 ? "text-green-400" : agent.promiseKeepingRate >= 0.4 ? "text-amber-400" : "text-red-400"
          )}>
            {Math.round(agent.promiseKeepingRate * 100)}%
          </div>
          <div className="text-xs text-zinc-500">Promises Kept</div>
        </div>
      </div>

      {/* Current Strategy */}
      <div className="p-4 border-b border-zinc-800/50">
        <div className="text-xs text-zinc-500 flex items-center gap-1.5 mb-2">
          <Brain className="size-3" weight="duotone" />
          Current Strategy
        </div>
        <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-800/30 p-3 rounded-lg font-mono border border-zinc-800/50">
          {agent.systemPrompt.length > 300
            ? agent.systemPrompt.slice(0, 300) + "..."
            : agent.systemPrompt}
        </div>
      </div>

      {/* Evolution History */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs text-zinc-500 flex items-center gap-1.5 mb-3">
          <DNA className="size-3" weight="duotone" />
          Evolution History
        </div>

        {!evolutions || evolutions.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-8 bg-zinc-800/20 rounded-lg border border-zinc-800/30">
            No evolutions yet. Agent is using original strategy.
          </div>
        ) : (
          <div className="space-y-4">
            {evolutions.map((evolution, index) => (
              <div
                key={evolution._id}
                className="relative pl-6 pb-4 border-l border-zinc-700/50 last:border-l-transparent"
              >
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-zinc-900",
                  index === 0 ? "bg-purple-400 shadow-lg shadow-purple-500/30" : "bg-zinc-600"
                )} />

                {/* Evolution content */}
                <div className="bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                      <GitBranch className="size-3" weight="duotone" />
                      Version {evolution.version}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      Round {evolution.gamesInPeriod}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-300 mb-2">
                    {evolution.evolutionReason}
                  </div>

                  {/* Performance at evolution */}
                  <div className="flex gap-4 text-xs text-zinc-500 font-mono">
                    <span>Win: {Math.round(evolution.winRate * 100)}%</span>
                    <span>Avg: {evolution.averageScore.toFixed(1)}</span>
                    <span>Coop: {Math.round(evolution.cooperationRate * 100)}%</span>
                  </div>

                  {evolution.selfReflection && (
                    <div className="mt-2 text-xs text-zinc-500 italic border-t border-zinc-800/50 pt-2">
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

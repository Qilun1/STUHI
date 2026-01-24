import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";
import { VoiceQA } from "./VoiceQA";

type TabType = "overview" | "memories" | "evolution";

interface Agent {
  _id: Id<"agents">;
  name: string;
  type: string;
  badge: string;
  color: string;
  systemPrompt: string;
  promptVersion: number;
  totalScore: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  cooperationRate: number;
  promiseKeepingRate: number;
}

interface Memory {
  _id: Id<"agentMemories">;
  aboutAgentId: Id<"agents">;
  aboutAgentName: string;
  notes: string[];
  timesBetrayed: number;
  timesBetrayedThem: number;
  gamesPlayed: number;
  trustLevel: "trusted" | "neutral" | "distrusted" | "enemy";
}

interface TriggerEvent {
  type: string;
  description: string;
  opponent?: string;
  round?: number;
  impact?: string;
}

interface KeyMoment {
  round: number;
  opponent: string;
  event: string;
  score: number;
  significance: string;
}

interface Evolution {
  _id: string;
  version: number;
  prompt: string;
  gamesInPeriod: number;
  winRate: number;
  averageScore: number;
  cooperationRate: number;
  promiseKeepingRate: number;
  trustGained: number;
  evolutionReason: string;
  selfReflection?: string;
  // Enhanced evolution data
  triggerEvents?: TriggerEvent[];
  keyMoments?: KeyMoment[];
  strategyChanges?: string[];
  enemiesIdentified?: string[];
  alliesIdentified?: string[];
  performanceAnalysis?: string;
  previousPromptSummary?: string;
  roundRange?: { start: number; end: number };
  betrayalsReceived?: number;
  betrayalsMade?: number;
  emotionalState?: string;
  lessonLearned?: string;
  evolutionNarrative?: string;
  nemesis?: string;
  ally?: string;
}

interface AgentProfileModalProps {
  agent: Agent;
  rank: number;
  memories: Memory[] | undefined;
  evolution: Evolution[] | undefined;
  onClose: () => void;
  onViewMemoryAgent?: (agentId: Id<"agents">) => void;
}

export function AgentProfileModal({
  agent,
  rank,
  memories,
  evolution,
  onClose,
  onViewMemoryAgent,
}: AgentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedEvolution, setExpandedEvolution] = useState<string | null>(null);

  const winRate = agent.gamesPlayed > 0 ? agent.wins / agent.gamesPlayed : 0;

  const trustCounts = memories?.reduce(
    (acc, mem) => {
      acc[mem.trustLevel] = (acc[mem.trustLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-black border border-white/20 rounded-lg shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative border-b border-white/10 bg-gradient-to-r from-black to-white/5">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Rank Badge */}
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold",
                  rank === 1 ? "bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/50" :
                  rank === 2 ? "bg-gray-400/20 text-gray-300 ring-2 ring-gray-400/50" :
                  rank === 3 ? "bg-orange-600/20 text-orange-400 ring-2 ring-orange-500/50" :
                  "bg-white/10 text-white/60"
                )}>
                  #{rank}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{agent.name}</h2>
                    <span
                      className="text-sm font-mono px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
                    >
                      {agent.badge}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mt-1 capitalize">
                    {agent.type} Agent · Strategy v{agent.promptVersion}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Stats Bar */}
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-2xl font-bold font-mono">{agent.totalScore}</span>
                <span className="text-white/40 text-xs uppercase">Score</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold font-mono",
                  winRate > 0.5 ? "text-emerald-400" : winRate < 0.3 ? "text-red-400" : "text-white/60"
                )}>
                  {Math.round(winRate * 100)}%
                </span>
                <span className="text-white/40 text-xs uppercase">Win Rate</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold font-mono",
                  agent.cooperationRate > 0.7 ? "text-emerald-400" :
                  agent.cooperationRate < 0.3 ? "text-red-400" : "text-amber-400"
                )}>
                  {Math.round(agent.cooperationRate * 100)}%
                </span>
                <span className="text-white/40 text-xs uppercase">Coop Rate</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-white/60 text-lg font-bold font-mono">{agent.gamesPlayed}</span>
                <span className="text-white/40 text-xs uppercase">Games</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-white/10">
            {(["overview", "memories", "evolution"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 px-6 py-3 text-sm font-medium transition-colors relative",
                  activeTab === tab
                    ? "text-white bg-white/5"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                )}
              >
                {tab === "overview" && "Overview"}
                {tab === "memories" && `Memories (${memories?.length || 0})`}
                {tab === "evolution" && `Evolution (v${agent.promptVersion})`}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="p-6 space-y-6">
              {/* Strategy */}
              <div>
                <h3 className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Current Strategy
                </h3>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                    {agent.systemPrompt}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div>
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                  Performance Stats
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Wins" value={agent.wins} color="emerald" />
                  <StatCard label="Losses" value={agent.losses} color="red" />
                  <StatCard label="Draws" value={agent.draws} color="amber" />
                  <StatCard
                    label="Promise Keeping"
                    value={`${Math.round(agent.promiseKeepingRate * 100)}%`}
                    color={agent.promiseKeepingRate > 0.7 ? "emerald" : agent.promiseKeepingRate < 0.5 ? "red" : "amber"}
                  />
                </div>
              </div>

              {/* Trust Overview */}
              {memories && memories.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-3">
                    Relationship Summary
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <TrustCard label="Trusted" count={trustCounts.trusted || 0} color="emerald" />
                    <TrustCard label="Neutral" count={trustCounts.neutral || 0} color="white" />
                    <TrustCard label="Distrusted" count={trustCounts.distrusted || 0} color="amber" />
                    <TrustCard label="Enemy" count={trustCounts.enemy || 0} color="red" />
                  </div>
                </div>
              )}

              {/* Voice Q&A */}
              <div>
                <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Ask {agent.name}
                </h3>
                <VoiceQA
                  agentId={agent._id}
                  agentName={agent.name}
                  agentBadge={agent.badge}
                  agentColor={agent.color}
                />
              </div>
            </div>
          )}

          {/* Memories Tab */}
          {activeTab === "memories" && (
            <div className="p-6">
              {!memories || memories.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <p>No memories yet. Play more games to build relationships.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memories.map((mem) => (
                    <div
                      key={mem._id}
                      className={cn(
                        "rounded-lg border p-4 transition-colors",
                        mem.trustLevel === "enemy"
                          ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
                          : mem.trustLevel === "distrusted"
                          ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
                          : mem.trustLevel === "trusted"
                          ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onViewMemoryAgent?.(mem.aboutAgentId)}
                            className={cn(
                              "font-mono font-bold text-lg hover:underline",
                              mem.trustLevel === "enemy" ? "text-red-400" :
                              mem.trustLevel === "distrusted" ? "text-amber-400" :
                              mem.trustLevel === "trusted" ? "text-emerald-400" : "text-white/80"
                            )}
                          >
                            {mem.aboutAgentName}
                          </button>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full uppercase font-medium",
                            mem.trustLevel === "enemy" ? "bg-red-500/30 text-red-300" :
                            mem.trustLevel === "distrusted" ? "bg-amber-500/30 text-amber-300" :
                            mem.trustLevel === "trusted" ? "bg-emerald-500/30 text-emerald-300" :
                            "bg-white/20 text-white/60"
                          )}>
                            {mem.trustLevel}
                          </span>
                        </div>
                        <span className="text-white/40 text-sm">
                          {mem.gamesPlayed} games
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm mb-3">
                        {mem.timesBetrayed > 0 && (
                          <span className="text-red-400">
                            Betrayed me {mem.timesBetrayed}x
                          </span>
                        )}
                        {mem.timesBetrayedThem > 0 && (
                          <span className="text-amber-400">
                            I betrayed them {mem.timesBetrayedThem}x
                          </span>
                        )}
                        {mem.timesBetrayed === 0 && mem.timesBetrayedThem === 0 && (
                          <span className="text-white/40">No betrayals</span>
                        )}
                      </div>

                      {mem.notes.length > 0 && (
                        <div className="space-y-1">
                          {mem.notes.map((note, idx) => (
                            <p key={idx} className="text-white/60 text-sm pl-3 border-l-2 border-white/20">
                              {note}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Evolution Tab */}
          {activeTab === "evolution" && (
            <div className="p-6">
              {!evolution || evolution.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <p>No evolution history yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evolution.map((evo, idx) => (
                    <div
                      key={evo._id}
                      className={cn(
                        "rounded-lg border transition-all",
                        idx === 0
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <button
                        onClick={() => setExpandedEvolution(expandedEvolution === evo._id ? null : evo._id)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className={cn(
                              "text-lg font-mono font-bold",
                              idx === 0 ? "text-emerald-400" : "text-white/60"
                            )}>
                              v{evo.version}
                            </span>
                            {idx === 0 && (
                              <span className="text-xs bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full uppercase">
                                Current
                              </span>
                            )}
                            <div className="flex items-center gap-3 text-sm">
                              <span className={cn(
                                "font-mono",
                                evo.winRate > 0.5 ? "text-emerald-400" :
                                evo.winRate < 0.3 ? "text-red-400" : "text-white/60"
                              )}>
                                {Math.round(evo.winRate * 100)}% WR
                              </span>
                              <span className="text-white/40">·</span>
                              <span className="text-amber-400 font-mono">
                                {evo.averageScore.toFixed(1)} avg
                              </span>
                              <span className="text-white/40">·</span>
                              <span className="text-white/50">
                                {evo.gamesInPeriod} games
                              </span>
                            </div>
                          </div>
                          <svg
                            className={cn(
                              "w-5 h-5 text-white/40 transition-transform",
                              expandedEvolution === evo._id && "rotate-180"
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Emotional State Badge */}
                        {evo.emotionalState && (
                          <div className="mt-2">
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full",
                              evo.emotionalState.includes("vengeful") || evo.emotionalState.includes("angry") || evo.emotionalState.includes("betrayed")
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : evo.emotionalState.includes("confident") || evo.emotionalState.includes("optimistic") || evo.emotionalState.includes("victorious")
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : evo.emotionalState.includes("cautious") || evo.emotionalState.includes("wary") || evo.emotionalState.includes("calculating")
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            )}>
                              {evo.emotionalState}
                            </span>
                          </div>
                        )}
                        {/* Key Lesson */}
                        {evo.lessonLearned && (
                          <p className="text-white/70 text-sm mt-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {evo.lessonLearned}
                          </p>
                        )}
                        {/* Nemesis/Ally quick view */}
                        {(evo.nemesis || evo.ally) && (
                          <div className="flex gap-4 mt-2 text-xs">
                            {evo.nemesis && (
                              <span className="text-red-400">
                                vs {evo.nemesis}
                              </span>
                            )}
                            {evo.ally && (
                              <span className="text-emerald-400">
                                + {evo.ally}
                              </span>
                            )}
                          </div>
                        )}
                      </button>

                      {expandedEvolution === evo._id && (
                        <div className="px-4 pb-4 border-t border-white/10 mt-2 pt-4 animate-fade-in space-y-4">
                          {/* Evolution Narrative - The Story */}
                          {evo.evolutionNarrative && (
                            <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-lg p-4">
                              <p className="text-sm text-white/90 leading-relaxed italic">
                                "{evo.evolutionNarrative}"
                              </p>
                            </div>
                          )}

                          {/* Agent's Inner Reflection - First Person */}
                          {evo.selfReflection && (
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                              <p className="text-xs text-purple-400 uppercase mb-2 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Agent's Reflection
                              </p>
                              <p className="text-sm text-white/80 leading-relaxed">
                                {evo.selfReflection}
                              </p>
                            </div>
                          )}

                          {/* Nemesis & Ally - Relationship Status */}
                          {(evo.nemesis || evo.ally) && (
                            <div className="flex gap-4">
                              {evo.nemesis && (
                                <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                  <p className="text-xs text-red-400 uppercase mb-1">Nemesis</p>
                                  <p className="text-lg font-bold text-red-300">{evo.nemesis}</p>
                                </div>
                              )}
                              {evo.ally && (
                                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                  <p className="text-xs text-emerald-400 uppercase mb-1">Trusted Ally</p>
                                  <p className="text-lg font-bold text-emerald-300">{evo.ally}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* What Triggered This */}
                          {evo.triggerEvents && evo.triggerEvents.length > 0 && (
                            <div>
                              <p className="text-xs text-red-400 uppercase mb-2">What Triggered This</p>
                              <div className="space-y-1">
                                {evo.triggerEvents.slice(0, 3).map((event, i) => (
                                  <div key={i} className="text-sm text-white/80">
                                    {event.description}
                                    {event.opponent && <span className="text-white/40"> ({event.opponent})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Enemies and Allies Lists - Compact */}
                          {((evo.enemiesIdentified && evo.enemiesIdentified.length > 0) ||
                            (evo.alliesIdentified && evo.alliesIdentified.length > 0)) && (
                            <div className="flex gap-6 text-sm">
                              {evo.enemiesIdentified && evo.enemiesIdentified.length > 0 && (
                                <div>
                                  <span className="text-red-400">Enemies: </span>
                                  <span className="text-white/70">{evo.enemiesIdentified.join(", ")}</span>
                                </div>
                              )}
                              {evo.alliesIdentified && evo.alliesIdentified.length > 0 && (
                                <div>
                                  <span className="text-emerald-400">Allies: </span>
                                  <span className="text-white/70">{evo.alliesIdentified.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Strategy Changes - What actually changed */}
                          {evo.strategyChanges && evo.strategyChanges.length > 0 && (
                            <div>
                              <p className="text-xs text-cyan-400 uppercase mb-2">What Changed</p>
                              <ul className="space-y-1">
                                {evo.strategyChanges.map((change, i) => (
                                  <li key={i} className="text-sm text-white/80 pl-3 border-l-2 border-cyan-500/50">
                                    {change}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* New Strategy - The result */}
                          <div>
                            <p className="text-xs text-emerald-400 uppercase mb-2">New Strategy</p>
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-3">
                              <p className="text-white/90 text-sm leading-relaxed">{evo.prompt}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClasses = {
    emerald: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    white: "text-white/80",
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
      <div className={cn("text-xl font-bold font-mono", colorClasses[color as keyof typeof colorClasses])}>
        {value}
      </div>
      <div className="text-white/40 text-xs uppercase mt-1">{label}</div>
    </div>
  );
}

function TrustCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colorClasses = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    red: "text-red-400 bg-red-500/10 border-red-500/30",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    white: "text-white/60 bg-white/5 border-white/10",
  };

  return (
    <div className={cn("rounded-lg border p-3 text-center", colorClasses[color as keyof typeof colorClasses])}>
      <div className="text-2xl font-bold font-mono">{count}</div>
      <div className="text-xs uppercase mt-1 opacity-70">{label}</div>
    </div>
  );
}


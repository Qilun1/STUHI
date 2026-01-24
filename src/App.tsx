import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { cn } from "@/lib/utils";
import type { Id } from "../convex/_generated/dataModel";

export default function App() {
  const simulationState = useQuery(api.simulation.state.get);
  const agents = useQuery(api.agents.queries.list);
  const currentRound = simulationState?.currentRound ?? 0;
  const games = useQuery(
    api.games.byRoundWithAgents,
    currentRound > 0 ? { roundNumber: currentRound } : "skip"
  );
  const roundSummaries = useQuery(api.agents.queries.cooperationTimeline, { limit: 20 });

  const [selectedGameId, setSelectedGameId] = useState<Id<"games"> | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
  const [visibleMessages, setVisibleMessages] = useState(0);

  // Fetch messages for selected game
  const messages = useQuery(
    api.messages.byGameWithSenders,
    selectedGameId ? { gameId: selectedGameId } : "skip"
  );

  // Fetch evolution history for selected agent
  const evolution = useQuery(
    api.agents.queries.promptHistory,
    selectedAgentId ? { agentId: selectedAgentId } : "skip"
  );

  // Animate messages appearing one by one
  useEffect(() => {
    if (!messages || messages.length === 0) {
      setVisibleMessages(0);
      return;
    }
    setVisibleMessages(0);
    const interval = setInterval(() => {
      setVisibleMessages((prev) => {
        if (prev >= messages.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [messages, selectedGameId]);

  const isRunning = simulationState?.status === "running";
  const hasAgents = agents && agents.length > 0;

  // Calculate stats
  const totalGames = agents?.reduce((sum, a) => sum + a.gamesPlayed, 0) ?? 0;
  const avgCooperation = agents?.length
    ? agents.reduce((sum, a) => sum + a.cooperationRate, 0) / agents.length
    : 0;

  const selectedGame = games?.find(g => g._id === selectedGameId);
  const selectedAgent = agents?.find(a => a._id === selectedAgentId);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">STUHI</h1>
          <span className="text-white/40 text-xs">The Trust Arena</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isRunning ? "bg-white animate-pulse" : "bg-white/30"
            )} />
            <span className="text-white/60">{simulationState?.status?.toUpperCase() ?? "STOPPED"}</span>
          </div>
          <div className="text-xs">
            <span className="text-white/40">Round</span>{" "}
            <span className="font-mono">{currentRound}</span>
          </div>
          <ControlPanel
            simulationStatus={simulationState?.status}
            hasAgents={hasAgents ?? false}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        {!hasAgents ? (
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="text-center">
              <p className="text-white/40 text-sm mb-2">No agents created</p>
              <p className="text-white/20 text-xs">Click "Setup" to initialize the simulation</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 max-w-[1600px] mx-auto">
            {/* Left Column - Leaderboard */}
            <div className="col-span-12 lg:col-span-3">
              <div className="border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/60">LEADERBOARD</span>
                  <span className="text-xs text-white/30">{agents.length} agents</span>
                </div>
                <div className="divide-y divide-white/5">
                  {agents.map((agent, index) => (
                    <button
                      key={agent._id}
                      onClick={() => setSelectedAgentId(selectedAgentId === agent._id ? null : agent._id)}
                      className={cn(
                        "w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors text-left",
                        selectedAgentId === agent._id && "bg-white/10"
                      )}
                    >
                      <span className="text-xs text-white/30 w-4">{index + 1}</span>
                      <span className="text-xs font-mono flex-1 truncate">{agent.name}</span>
                      <span className="text-xs font-mono text-white/60">
                        {Math.round(agent.cooperationRate * 100)}%
                      </span>
                      <span className="text-xs font-mono font-medium">{agent.totalScore}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Evolution Panel */}
              {selectedAgent && (
                <div className="mt-4 border border-white/10 rounded-md animate-fade-in">
                  <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">EVOLUTION</span>
                    <button
                      onClick={() => setSelectedAgentId(null)}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-medium mb-1">{selectedAgent.name}</div>
                    <div className="text-[10px] text-white/40 mb-3">
                      v{selectedAgent.promptVersion} · {selectedAgent.gamesPlayed} games
                    </div>

                    {/* Current Prompt Preview */}
                    <div className="mb-3">
                      <div className="text-[10px] text-white/50 mb-1">CURRENT STRATEGY</div>
                      <div className="text-[10px] text-white/70 bg-white/5 rounded p-2 max-h-20 overflow-y-auto leading-relaxed">
                        {selectedAgent.systemPrompt.slice(0, 200)}...
                      </div>
                    </div>

                    {/* Evolution History */}
                    {evolution && evolution.length > 0 && (
                      <div>
                        <div className="text-[10px] text-white/50 mb-2">HISTORY</div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {evolution.slice(0, 5).map((evo) => (
                            <div key={evo._id} className="border-l-2 border-white/20 pl-2">
                              <div className="text-[10px] text-white/60">
                                v{evo.version} · {Math.round(evo.winRate * 100)}% win
                              </div>
                              <div className="text-[10px] text-white/40 truncate">
                                {evo.evolutionReason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Center Column - Current Round */}
            <div className="col-span-12 lg:col-span-6">
              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className="text-lg font-mono font-medium">{currentRound}</div>
                  <div className="text-[10px] text-white/40 uppercase">Round</div>
                </div>
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className="text-lg font-mono font-medium">{totalGames}</div>
                  <div className="text-[10px] text-white/40 uppercase">Games</div>
                </div>
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className="text-lg font-mono font-medium">{Math.round(avgCooperation * 100)}%</div>
                  <div className="text-[10px] text-white/40 uppercase">Avg Coop</div>
                </div>
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className="text-lg font-mono font-medium">{agents[0]?.badge ?? "-"}</div>
                  <div className="text-[10px] text-white/40 uppercase">Leader</div>
                </div>
              </div>

              {/* Current Round Matches */}
              <div className="border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-medium text-white/60">ROUND {currentRound} MATCHES</span>
                </div>

                {!games || games.length === 0 ? (
                  <div className="p-6 text-center text-white/30 text-xs">
                    {currentRound === 0 ? "Start simulation to see matches" : "Loading matches..."}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {games.map((game) => (
                      <button
                        key={game._id}
                        onClick={() => setSelectedGameId(selectedGameId === game._id ? null : game._id)}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors text-left",
                          selectedGameId === game._id && "bg-white/5"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          game.phase === "completed" ? "bg-white" :
                          game.phase === "negotiation" ? "bg-white/50 animate-pulse" :
                          "bg-white/30"
                        )} />
                        <span className="text-[11px] font-mono flex-1 truncate">{game.agentA?.name}</span>
                        {game.phase === "completed" && (
                          <span className={cn(
                            "text-[10px] font-mono uppercase",
                            game.agentADecision === "split" ? "text-white" : "text-white/40"
                          )}>
                            {game.agentADecision}
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">vs</span>
                        {game.phase === "completed" && (
                          <span className={cn(
                            "text-[10px] font-mono uppercase",
                            game.agentBDecision === "split" ? "text-white" : "text-white/40"
                          )}>
                            {game.agentBDecision}
                          </span>
                        )}
                        <span className="text-[11px] font-mono flex-1 truncate text-right">{game.agentB?.name}</span>
                        {game.phase === "completed" ? (
                          <span className="text-[10px] font-mono text-white/40 w-10 text-right">
                            {game.agentAScore}-{game.agentBScore}
                          </span>
                        ) : (
                          <span className="text-[10px] text-white/30 uppercase w-10 text-right">
                            {game.phase}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Match Detail */}
              {selectedGame && (
                <div className="mt-4 border border-white/10 rounded-md animate-fade-in">
                  <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-medium text-white/60">MATCH DETAILS</span>
                    <button
                      onClick={() => setSelectedGameId(null)}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3">
                    {/* Compact header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <div className="text-xs font-medium">{selectedGame.agentA?.name}</div>
                        {selectedGame.phase === "completed" && (
                          <div className={cn(
                            "text-sm font-mono font-bold uppercase mt-1",
                            selectedGame.agentADecision === "split" ? "text-white" : "text-white/40"
                          )}>
                            {selectedGame.agentADecision}
                          </div>
                        )}
                      </div>
                      <div className="px-3 text-center">
                        {selectedGame.phase === "completed" && (
                          <div className="text-xs font-mono text-white/40">
                            {selectedGame.agentAScore} - {selectedGame.agentBScore}
                          </div>
                        )}
                        <div className="text-[10px] text-white/20 mt-1">
                          {selectedGame.agentADecision === "split" && selectedGame.agentBDecision === "split"
                            ? "Cooperation"
                            : selectedGame.agentADecision === "steal" && selectedGame.agentBDecision === "steal"
                            ? "Mutual Defection"
                            : selectedGame.phase === "completed" ? "Betrayal" : ""}
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-xs font-medium">{selectedGame.agentB?.name}</div>
                        {selectedGame.phase === "completed" && (
                          <div className={cn(
                            "text-sm font-mono font-bold uppercase mt-1",
                            selectedGame.agentBDecision === "split" ? "text-white" : "text-white/40"
                          )}>
                            {selectedGame.agentBDecision}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact Discussion with Animation */}
                    {messages && messages.length > 0 && (
                      <div className="border-t border-white/10 pt-3">
                        <div className="text-[10px] font-medium text-white/50 mb-2">NEGOTIATION</div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {messages.slice(0, visibleMessages).map((msg, idx) => {
                            const isAgentA = msg.senderId === selectedGame.agentAId;
                            return (
                              <div
                                key={msg._id}
                                className={cn(
                                  "flex animate-fade-in",
                                  isAgentA ? "justify-start" : "justify-end"
                                )}
                                style={{ animationDelay: `${idx * 50}ms` }}
                              >
                                <div
                                  className={cn(
                                    "max-w-[85%] rounded px-2 py-1.5",
                                    isAgentA ? "bg-white/5" : "bg-white/10"
                                  )}
                                >
                                  <div className="text-[9px] text-white/40 mb-0.5">
                                    {msg.senderBadge}
                                    {msg.impliedPromise && msg.impliedPromise !== "none" && (
                                      <span className="ml-1 text-white/30">→ {msg.impliedPromise}</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-white/70 leading-relaxed">
                                    {msg.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {visibleMessages < messages.length && (
                            <div className="text-center py-2">
                              <span className="text-[10px] text-white/30 animate-pulse">...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedGame.phase === "negotiation" && (!messages || messages.length === 0) && (
                      <div className="border-t border-white/10 pt-3">
                        <div className="text-[10px] text-white/30 text-center animate-pulse">
                          Negotiating...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Cooperation Timeline */}
            <div className="col-span-12 lg:col-span-3">
              <div className="border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-medium text-white/60">COOPERATION TREND</span>
                </div>
                <div className="p-3">
                  {!roundSummaries || roundSummaries.length === 0 ? (
                    <div className="text-center text-white/30 text-xs py-4">
                      No data yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {roundSummaries.slice(-15).map((summary) => (
                        <div key={summary.round} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 w-6">{summary.round}</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-sm overflow-hidden">
                            <div
                              className="h-full bg-white/60 transition-all duration-500"
                              style={{ width: `${summary.cooperationRate * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-white/40 w-8 text-right">
                            {Math.round(summary.cooperationRate * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-medium text-white/60">PROMISE KEEPING</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {agents.slice(0, 5).map((agent) => (
                    <div key={agent._id} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/60 w-10">{agent.badge}</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-white/40"
                          style={{ width: `${agent.promiseKeepingRate * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/30 w-8 text-right">
                        {Math.round(agent.promiseKeepingRate * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

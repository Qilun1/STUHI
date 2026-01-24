import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { NegotiatorApp } from "@/components/negotiator";
import { cn } from "@/lib/utils";
import type { Id } from "../convex/_generated/dataModel";
import { X } from "@phosphor-icons/react";

type AppMode = "stuhi" | "negotiator";

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>("negotiator");

  // If negotiator mode, render the NegotiatorApp
  if (appMode === "negotiator") {
    return (
      <div className="relative">
        {/* Mode Switcher */}
        <div className="fixed top-3 right-3 z-50">
          <button
            onClick={() => setAppMode("stuhi")}
            className="bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-sm text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-full border border-zinc-700/50 transition-all shadow-lg"
          >
            Switch to Stuhi
          </button>
        </div>
        <NegotiatorApp />
      </div>
    );
  }

  // STUHI Mode (original app)
  return <StuhiApp onSwitchMode={() => setAppMode("negotiator")} />;
}

function StuhiApp({ onSwitchMode }: { onSwitchMode: () => void }) {
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
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-4 py-3 flex items-center justify-between bg-zinc-900/30">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">Stuhi</h1>
          <span className="text-zinc-500 text-xs">The Trust Arena</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onSwitchMode}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Negotiation Sim
          </button>
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isRunning ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"
            )} />
            <span className="text-zinc-400">{simulationState?.status ?? "stopped"}</span>
          </div>
          <div className="text-xs">
            <span className="text-zinc-500">Round</span>{" "}
            <span className="font-mono text-cyan-400">{currentRound}</span>
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
              <p className="text-zinc-500 text-sm mb-2">No agents created</p>
              <p className="text-zinc-600 text-xs">Click "Setup" to initialize the simulation</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 max-w-[1600px] mx-auto">
            {/* Left Column - Leaderboard */}
            <div className="col-span-12 lg:col-span-3">
              <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 shadow-card">
                <div className="px-3 py-2 border-b border-zinc-800/50 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">Leaderboard</span>
                  <span className="text-xs text-zinc-600">{agents.length} agents</span>
                </div>
                <div className="divide-y divide-zinc-800/30">
                  {agents.map((agent, index) => (
                    <button
                      key={agent._id}
                      onClick={() => setSelectedAgentId(selectedAgentId === agent._id ? null : agent._id)}
                      className={cn(
                        "w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800/30 transition-colors text-left",
                        selectedAgentId === agent._id && "bg-zinc-800/50"
                      )}
                    >
                      <span className="text-xs text-zinc-600 w-4">{index + 1}</span>
                      <span className="text-xs font-mono flex-1 truncate">{agent.name}</span>
                      <span className="text-xs font-mono text-zinc-500">
                        {Math.round(agent.cooperationRate * 100)}%
                      </span>
                      <span className="text-xs font-mono font-medium text-cyan-400">{agent.totalScore}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Evolution Panel */}
              {selectedAgent && (
                <div className="mt-4 border border-zinc-800/50 rounded-xl bg-zinc-900/30 shadow-card animate-fade-in">
                  <div className="px-3 py-2 border-b border-zinc-800/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Evolution</span>
                    <button
                      onClick={() => setSelectedAgentId(null)}
                      className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="text-xs font-medium mb-1">{selectedAgent.name}</div>
                    <div className="text-[10px] text-zinc-500 mb-3">
                      v{selectedAgent.promptVersion} · {selectedAgent.gamesPlayed} games
                    </div>

                    {/* Current Prompt Preview */}
                    <div className="mb-3">
                      <div className="text-[10px] text-zinc-500 mb-1">Current Strategy</div>
                      <div className="text-[10px] text-zinc-400 bg-zinc-800/50 rounded-lg p-2 max-h-20 overflow-y-auto leading-relaxed">
                        {selectedAgent.systemPrompt.slice(0, 200)}...
                      </div>
                    </div>

                    {/* Evolution History */}
                    {evolution && evolution.length > 0 && (
                      <div>
                        <div className="text-[10px] text-zinc-500 mb-2">History</div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {evolution.slice(0, 5).map((evo) => (
                            <div key={evo._id} className="border-l-2 border-cyan-500/30 pl-2">
                              <div className="text-[10px] text-zinc-400">
                                v{evo.version} · {Math.round(evo.winRate * 100)}% win
                              </div>
                              <div className="text-[10px] text-zinc-600 truncate">
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
                <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 p-3 text-center shadow-card">
                  <div className="text-lg font-mono font-medium text-cyan-400">{currentRound}</div>
                  <div className="text-[10px] text-zinc-500">Round</div>
                </div>
                <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 p-3 text-center shadow-card">
                  <div className="text-lg font-mono font-medium">{totalGames}</div>
                  <div className="text-[10px] text-zinc-500">Games</div>
                </div>
                <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 p-3 text-center shadow-card">
                  <div className="text-lg font-mono font-medium">{Math.round(avgCooperation * 100)}%</div>
                  <div className="text-[10px] text-zinc-500">Avg Coop</div>
                </div>
                <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 p-3 text-center shadow-card">
                  <div className="text-lg font-mono font-medium">{agents[0]?.badge ?? "-"}</div>
                  <div className="text-[10px] text-zinc-500">Leader</div>
                </div>
              </div>

              {/* Current Round Matches */}
              <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 shadow-card">
                <div className="px-3 py-2 border-b border-zinc-800/50">
                  <span className="text-xs font-medium text-zinc-400">Round {currentRound} Matches</span>
                </div>

                {!games || games.length === 0 ? (
                  <div className="p-6 text-center text-zinc-600 text-xs">
                    {currentRound === 0 ? "Start simulation to see matches" : "Loading matches..."}
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/30">
                    {games.map((game) => (
                      <button
                        key={game._id}
                        onClick={() => setSelectedGameId(selectedGameId === game._id ? null : game._id)}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800/30 transition-colors text-left",
                          selectedGameId === game._id && "bg-zinc-800/50"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          game.phase === "completed" ? "bg-cyan-400" :
                          game.phase === "negotiation" ? "bg-cyan-400/50 animate-pulse" :
                          "bg-zinc-600"
                        )} />
                        <span className="text-[11px] font-mono flex-1 truncate">{game.agentA?.name}</span>
                        {game.phase === "completed" && (
                          <span className={cn(
                            "text-[10px] font-mono",
                            game.agentADecision === "split" ? "text-green-400" : "text-red-400"
                          )}>
                            {game.agentADecision}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-600">vs</span>
                        {game.phase === "completed" && (
                          <span className={cn(
                            "text-[10px] font-mono",
                            game.agentBDecision === "split" ? "text-green-400" : "text-red-400"
                          )}>
                            {game.agentBDecision}
                          </span>
                        )}
                        <span className="text-[11px] font-mono flex-1 truncate text-right">{game.agentB?.name}</span>
                        {game.phase === "completed" ? (
                          <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">
                            {game.agentAScore}-{game.agentBScore}
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-600 w-10 text-right">
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
                <div className="mt-4 border border-zinc-800/50 rounded-xl bg-zinc-900/30 shadow-card animate-fade-in">
                  <div className="px-3 py-2 border-b border-zinc-800/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">Match Details</span>
                    <button
                      onClick={() => setSelectedGameId(null)}
                      className="p-0.5 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="p-3">
                    {/* Compact header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-center flex-1">
                        <div className="text-xs font-medium">{selectedGame.agentA?.name}</div>
                        {selectedGame.phase === "completed" && (
                          <div className={cn(
                            "text-sm font-mono font-bold mt-1",
                            selectedGame.agentADecision === "split" ? "text-green-400" : "text-red-400"
                          )}>
                            {selectedGame.agentADecision}
                          </div>
                        )}
                      </div>
                      <div className="px-3 text-center">
                        {selectedGame.phase === "completed" && (
                          <div className="text-xs font-mono text-zinc-400">
                            {selectedGame.agentAScore} - {selectedGame.agentBScore}
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-600 mt-1">
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
                            "text-sm font-mono font-bold mt-1",
                            selectedGame.agentBDecision === "split" ? "text-green-400" : "text-red-400"
                          )}>
                            {selectedGame.agentBDecision}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compact Discussion with Animation */}
                    {messages && messages.length > 0 && (
                      <div className="border-t border-zinc-800/50 pt-3">
                        <div className="text-[10px] font-medium text-zinc-500 mb-2">Negotiation</div>
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
                                    "max-w-[85%] rounded-lg px-2 py-1.5",
                                    isAgentA ? "bg-zinc-800/50" : "bg-cyan-900/20 border border-cyan-800/20"
                                  )}
                                >
                                  <div className="text-[9px] text-zinc-500 mb-0.5">
                                    {msg.senderBadge}
                                    {msg.impliedPromise && msg.impliedPromise !== "none" && (
                                      <span className="ml-1 text-zinc-600">→ {msg.impliedPromise}</span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-300 leading-relaxed">
                                    {msg.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {visibleMessages < messages.length && (
                            <div className="text-center py-2">
                              <span className="text-[10px] text-zinc-600 animate-pulse">...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedGame.phase === "negotiation" && (!messages || messages.length === 0) && (
                      <div className="border-t border-zinc-800/50 pt-3">
                        <div className="text-[10px] text-zinc-600 text-center animate-pulse">
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
              <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/30 shadow-card">
                <div className="px-3 py-2 border-b border-zinc-800/50">
                  <span className="text-xs font-medium text-zinc-400">Cooperation Trend</span>
                </div>
                <div className="p-3">
                  {!roundSummaries || roundSummaries.length === 0 ? (
                    <div className="text-center text-zinc-600 text-xs py-4">
                      No data yet
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {roundSummaries.slice(-15).map((summary) => (
                        <div key={summary.round} className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-600 w-6">{summary.round}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-500 rounded-full"
                              style={{ width: `${summary.cooperationRate * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-zinc-500 w-8 text-right">
                            {Math.round(summary.cooperationRate * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-4 border border-zinc-800/50 rounded-xl bg-zinc-900/30 shadow-card">
                <div className="px-3 py-2 border-b border-zinc-800/50">
                  <span className="text-xs font-medium text-zinc-400">Promise Keeping</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {agents.slice(0, 5).map((agent) => (
                    <div key={agent._id} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500 w-10">{agent.badge}</span>
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500/60 rounded-full"
                          style={{ width: `${agent.promiseKeepingRate * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-600 w-8 text-right">
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

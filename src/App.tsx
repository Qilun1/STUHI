import { useState, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { cn } from "@/lib/utils";
import type { Id } from "../convex/_generated/dataModel";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

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
  const [showDecisions, setShowDecisions] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [expandedEvolution, setExpandedEvolution] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // Fetch memories for selected agent
  const memories = useQuery(
    api.agents.memories.getMemories,
    selectedAgentId ? { agentId: selectedAgentId } : "skip"
  );

  const generateVoice = useAction(api.simulation.voice.generateVoice);

  // Dramatic slow message reveal (1.5s per message)
  useEffect(() => {
    if (!messages || messages.length === 0 || !selectedGameId) {
      setVisibleMessages(0);
      setShowDecisions(false);
      return;
    }
    setVisibleMessages(0);
    setShowDecisions(false);

    const interval = setInterval(() => {
      setVisibleMessages((prev) => {
        if (prev >= messages.length) {
          clearInterval(interval);
          // Show decisions after all messages
          setTimeout(() => setShowDecisions(true), 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 1500); // 1.5 seconds per message

    return () => clearInterval(interval);
  }, [messages, selectedGameId]);

  // Play voice for current message
  const playVoice = async (messageId: Id<"messages">) => {
    try {
      setIsPlayingVoice(true);
      const result = await generateVoice({ messageId });
      if (result.audioUrl && audioRef.current) {
        audioRef.current.src = result.audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error("Voice failed:", err);
    } finally {
      setIsPlayingVoice(false);
    }
  };

  const isRunning = simulationState?.status === "running";
  const hasAgents = agents && agents.length > 0;

  const totalGames = agents?.reduce((sum, a) => sum + a.gamesPlayed, 0) ?? 0;
  const avgCooperation = agents?.length
    ? agents.reduce((sum, a) => sum + a.cooperationRate, 0) / agents.length
    : 0;

  const selectedGame = games?.find(g => g._id === selectedGameId);
  const selectedAgent = agents?.find(a => a._id === selectedAgentId);

  // Chart data
  const chartData = roundSummaries?.map(s => ({
    round: s.round,
    cooperation: Math.round(s.cooperationRate * 100),
  })) || [];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={() => setIsPlayingVoice(false)} />

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
              isRunning ? "bg-emerald-400 animate-pulse" : "bg-white/30"
            )} />
            <span className="text-white/60">{simulationState?.status?.toUpperCase() ?? "STOPPED"}</span>
          </div>
          <div className="text-xs">
            <span className="text-white/40">Round</span>{" "}
            <span className="font-mono text-emerald-400">{currentRound}</span>
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
                        selectedAgentId === agent._id && "bg-emerald-500/10 border-l-2 border-emerald-400"
                      )}
                    >
                      <span className="text-xs text-white/30 w-4">{index + 1}</span>
                      <span className="text-xs font-mono flex-1 truncate">{agent.name}</span>
                      <span className={cn(
                        "text-xs font-mono",
                        agent.cooperationRate > 0.7 ? "text-emerald-400" :
                        agent.cooperationRate < 0.3 ? "text-red-400" : "text-white/60"
                      )}>
                        {Math.round(agent.cooperationRate * 100)}%
                      </span>
                      <span className="text-xs font-mono font-medium text-amber-400">{agent.totalScore}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Profile Panel - Clean */}
              {selectedAgent && (
                <div className="mt-4 border border-emerald-500/30 rounded-md animate-fade-in bg-emerald-500/5">
                  <div className="px-3 py-2 border-b border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-400">{selectedAgent.name}</span>
                    <button
                      onClick={() => setSelectedAgentId(null)}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-3 max-h-[450px] overflow-y-auto space-y-3">
                    {/* Current Strategy */}
                    <div>
                      <div className="text-[9px] text-emerald-400/70 uppercase mb-1 font-medium flex items-center gap-2">
                        Strategy <span className="text-white/30">v{selectedAgent.promptVersion}</span>
                      </div>
                      <div className="text-[10px] text-white/80 bg-black/40 border border-white/10 rounded p-2 leading-relaxed whitespace-pre-wrap">
                        {selectedAgent.systemPrompt}
                      </div>
                    </div>

                    {/* Memories */}
                    {memories && memories.length > 0 && (
                      <div>
                        <div className="text-[9px] text-amber-400/70 uppercase mb-1 font-medium">
                          Memories ({memories.length})
                        </div>
                        <div className="space-y-1">
                          {memories.map((mem) => (
                            <div
                              key={mem._id}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded text-[10px]",
                                mem.trustLevel === "enemy" ? "bg-red-500/10 border border-red-500/20" :
                                mem.trustLevel === "distrusted" ? "bg-amber-500/10 border border-amber-500/20" :
                                mem.trustLevel === "trusted" ? "bg-emerald-500/10 border border-emerald-500/20" :
                                "bg-white/5 border border-white/10"
                              )}
                            >
                              <span className={cn(
                                "font-mono font-medium",
                                mem.trustLevel === "enemy" ? "text-red-400" :
                                mem.trustLevel === "distrusted" ? "text-amber-400" :
                                mem.trustLevel === "trusted" ? "text-emerald-400" : "text-white/60"
                              )}>
                                {mem.aboutAgentName}
                              </span>
                              {mem.timesBetrayed > 0 && (
                                <span className="text-red-400 text-[9px]">
                                  betrayed {mem.timesBetrayed}x
                                </span>
                              )}
                              {mem.notes.length > 0 && (
                                <span className="text-white/40 text-[9px] truncate flex-1">
                                  {mem.notes[mem.notes.length - 1]}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Evolution History (Collapsed) */}
                    {evolution && evolution.length > 1 && (
                      <div>
                        <div className="text-[9px] text-white/40 uppercase mb-1 font-medium">
                          Evolution History
                        </div>
                        <div className="space-y-1">
                          {evolution.slice(1, 4).map((evo) => (
                            <button
                              key={evo._id}
                              onClick={() => setExpandedEvolution(expandedEvolution === evo._id ? null : evo._id)}
                              className="w-full text-left px-2 py-1 rounded bg-black/30 hover:bg-black/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-white/40 font-mono">v{evo.version}</span>
                                <span className={cn(
                                  "text-[9px] px-1 rounded",
                                  evo.winRate > 0.5 ? "bg-emerald-500/20 text-emerald-400" :
                                  evo.winRate < 0.3 ? "bg-red-500/20 text-red-400" : "text-white/40"
                                )}>
                                  {Math.round(evo.winRate * 100)}%W
                                </span>
                                {evo.selfReflection && (
                                  <span className="text-white/50 text-[9px] truncate flex-1 italic">
                                    {evo.selfReflection.slice(0, 50)}...
                                  </span>
                                )}
                              </div>
                              {expandedEvolution === evo._id && (
                                <div className="mt-2 text-[9px] text-white/60 bg-black/40 rounded p-2 whitespace-pre-wrap">
                                  {evo.prompt}
                                </div>
                              )}
                            </button>
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
                  <div className="text-lg font-mono font-medium text-emerald-400">{currentRound}</div>
                  <div className="text-[10px] text-white/40 uppercase">Round</div>
                </div>
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className="text-lg font-mono font-medium">{totalGames}</div>
                  <div className="text-[10px] text-white/40 uppercase">Games</div>
                </div>
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className={cn(
                    "text-lg font-mono font-medium",
                    avgCooperation > 0.6 ? "text-emerald-400" : avgCooperation < 0.4 ? "text-red-400" : "text-amber-400"
                  )}>
                    {Math.round(avgCooperation * 100)}%
                  </div>
                  <div className="text-[10px] text-white/40 uppercase">Avg Coop</div>
                </div>
                <div className="border border-white/10 rounded-md p-3 text-center">
                  <div className="text-lg font-mono font-medium text-amber-400">{agents[0]?.badge ?? "-"}</div>
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
                          selectedGameId === game._id && "bg-amber-500/10 border-l-2 border-amber-400"
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          game.phase === "completed" ? "bg-emerald-400" :
                          game.phase === "negotiation" ? "bg-amber-400 animate-pulse" :
                          "bg-white/30"
                        )} />
                        <span className="text-[11px] font-mono flex-1 truncate">{game.agentA?.name}</span>
                        {game.phase === "completed" && (
                          <span className={cn(
                            "text-[10px] font-mono uppercase font-bold",
                            game.agentADecision === "split" ? "text-emerald-400" : "text-red-400"
                          )}>
                            {game.agentADecision}
                          </span>
                        )}
                        <span className="text-[10px] text-white/20">vs</span>
                        {game.phase === "completed" && (
                          <span className={cn(
                            "text-[10px] font-mono uppercase font-bold",
                            game.agentBDecision === "split" ? "text-emerald-400" : "text-red-400"
                          )}>
                            {game.agentBDecision}
                          </span>
                        )}
                        <span className="text-[11px] font-mono flex-1 truncate text-right">{game.agentB?.name}</span>
                        {game.phase === "completed" ? (
                          <span className="text-[10px] font-mono text-amber-400 w-12 text-right">
                            {game.agentAScore}-{game.agentBScore}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400/60 uppercase w-12 text-right animate-pulse">
                            {game.phase === "negotiation" ? "LIVE" : game.phase}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Match Detail - Dramatic Playback */}
              {selectedGame && (
                <div className="mt-4 border border-amber-500/30 rounded-md animate-fade-in bg-amber-500/5">
                  <div className="px-3 py-2 border-b border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-400">MATCH REPLAY</span>
                    <button
                      onClick={() => setSelectedGameId(null)}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    {/* Players - decisions hidden until reveal */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center flex-1">
                        <div className="text-sm font-medium">{selectedGame.agentA?.name}</div>
                        <div className="text-[10px] text-white/40 mb-2">
                          {Math.round((agents?.find(a => a._id === selectedGame.agentAId)?.cooperationRate || 0) * 100)}% coop
                        </div>
                        {showDecisions && selectedGame.phase === "completed" && (
                          <div className={cn(
                            "text-xl font-mono font-bold uppercase animate-scale-in",
                            selectedGame.agentADecision === "split" ? "text-emerald-400" : "text-red-400"
                          )}>
                            {selectedGame.agentADecision}
                          </div>
                        )}
                        {!showDecisions && selectedGame.phase === "completed" && (
                          <div className="text-xl font-mono text-white/20">?</div>
                        )}
                      </div>
                      <div className="px-4 text-center">
                        {showDecisions && selectedGame.phase === "completed" && (
                          <>
                            <div className="text-lg font-mono text-amber-400 mb-1">
                              {selectedGame.agentAScore} - {selectedGame.agentBScore}
                            </div>
                            <div className={cn(
                              "text-[10px] uppercase font-medium px-2 py-0.5 rounded",
                              selectedGame.agentADecision === "split" && selectedGame.agentBDecision === "split"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : selectedGame.agentADecision === "steal" && selectedGame.agentBDecision === "steal"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-amber-500/20 text-amber-400"
                            )}>
                              {selectedGame.agentADecision === "split" && selectedGame.agentBDecision === "split"
                                ? "COOPERATION"
                                : selectedGame.agentADecision === "steal" && selectedGame.agentBDecision === "steal"
                                ? "MUTUAL BETRAYAL"
                                : "BETRAYAL"}
                            </div>
                          </>
                        )}
                        {!showDecisions && (
                          <div className="text-white/20 text-xs">VS</div>
                        )}
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-sm font-medium">{selectedGame.agentB?.name}</div>
                        <div className="text-[10px] text-white/40 mb-2">
                          {Math.round((agents?.find(a => a._id === selectedGame.agentBId)?.cooperationRate || 0) * 100)}% coop
                        </div>
                        {showDecisions && selectedGame.phase === "completed" && (
                          <div className={cn(
                            "text-xl font-mono font-bold uppercase animate-scale-in",
                            selectedGame.agentBDecision === "split" ? "text-emerald-400" : "text-red-400"
                          )}>
                            {selectedGame.agentBDecision}
                          </div>
                        )}
                        {!showDecisions && selectedGame.phase === "completed" && (
                          <div className="text-xl font-mono text-white/20">?</div>
                        )}
                      </div>
                    </div>

                    {/* Dramatic Chat Playback */}
                    {messages && messages.length > 0 && (
                      <div className="border-t border-amber-500/20 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-medium text-amber-400">NEGOTIATION</span>
                          <span className="text-[10px] text-white/30">
                            {visibleMessages} / {messages.length}
                          </span>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {messages.slice(0, visibleMessages).map((msg, idx) => {
                            const isAgentA = msg.senderId === selectedGame.agentAId;
                            return (
                              <div
                                key={msg._id}
                                className={cn(
                                  "flex animate-fade-in",
                                  isAgentA ? "justify-start" : "justify-end"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-[80%] rounded-lg px-3 py-2 relative",
                                    isAgentA
                                      ? "bg-white/5 border border-white/10"
                                      : "bg-amber-500/10 border border-amber-500/20"
                                  )}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "text-[10px] font-mono font-medium",
                                      isAgentA ? "text-white/60" : "text-amber-400"
                                    )}>
                                      {msg.senderBadge}
                                    </span>
                                    {msg.impliedPromise && msg.impliedPromise !== "none" && (
                                      <span className={cn(
                                        "text-[9px] px-1 rounded",
                                        msg.impliedPromise === "split" ? "bg-emerald-500/20 text-emerald-400" :
                                        msg.impliedPromise === "steal" ? "bg-red-500/20 text-red-400" :
                                        "bg-white/10 text-white/40"
                                      )}>
                                        {msg.impliedPromise}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => playVoice(msg._id)}
                                      disabled={isPlayingVoice}
                                      className="text-[9px] text-white/30 hover:text-amber-400 transition-colors"
                                    >
                                      {isPlayingVoice ? "..." : "🔊"}
                                    </button>
                                  </div>
                                  <div className="text-[11px] text-white/80 leading-relaxed">
                                    {msg.content}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {visibleMessages < messages.length && (
                            <div className="text-center py-4">
                              <span className="text-amber-400 animate-pulse">●●●</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedGame.phase === "negotiation" && (!messages || messages.length === 0) && (
                      <div className="border-t border-amber-500/20 pt-4">
                        <div className="text-center py-8">
                          <div className="text-amber-400 animate-pulse text-lg mb-2">●●●</div>
                          <div className="text-[10px] text-white/40">Agents negotiating...</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Charts */}
            <div className="col-span-12 lg:col-span-3">
              {/* Cooperation Trend Chart */}
              <div className="border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-medium text-white/60">COOPERATION TREND</span>
                </div>
                <div className="p-3">
                  {chartData.length === 0 ? (
                    <div className="text-center text-white/30 text-xs py-8">
                      No data yet
                    </div>
                  ) : (
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <XAxis
                            dataKey="round"
                            tick={{ fontSize: 9, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 9, fill: '#666' }}
                            axisLine={{ stroke: '#333' }}
                            tickLine={false}
                            width={25}
                          />
                          <Tooltip
                            contentStyle={{
                              background: '#111',
                              border: '1px solid #333',
                              borderRadius: '4px',
                              fontSize: '10px'
                            }}
                            labelStyle={{ color: '#888' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="cooperation"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 2 }}
                            activeDot={{ r: 4, fill: '#10b981' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Promise Keeping */}
              <div className="mt-4 border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-medium text-white/60">PROMISE KEEPING</span>
                </div>
                <div className="p-3 space-y-2">
                  {agents.slice(0, 5).map((agent) => (
                    <div key={agent._id} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/60 w-10">{agent.badge}</span>
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            agent.promiseKeepingRate > 0.8 ? "bg-emerald-400" :
                            agent.promiseKeepingRate < 0.5 ? "bg-red-400" : "bg-amber-400"
                          )}
                          style={{ width: `${agent.promiseKeepingRate * 100}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] w-8 text-right font-mono",
                        agent.promiseKeepingRate > 0.8 ? "text-emerald-400" :
                        agent.promiseKeepingRate < 0.5 ? "text-red-400" : "text-amber-400"
                      )}>
                        {Math.round(agent.promiseKeepingRate * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Win Rate Comparison */}
              <div className="mt-4 border border-white/10 rounded-md">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-xs font-medium text-white/60">WIN RATE</span>
                </div>
                <div className="p-3 space-y-2">
                  {agents.slice(0, 5).map((agent) => {
                    const winRate = agent.gamesPlayed > 0 ? agent.wins / agent.gamesPlayed : 0;
                    return (
                      <div key={agent._id} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-white/60 w-10">{agent.badge}</span>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${winRate * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] w-8 text-right font-mono text-amber-400">
                          {Math.round(winRate * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

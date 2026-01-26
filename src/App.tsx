import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { AgentProfileModal } from "@/components/AgentProfileModal";
import { VoiceQA } from "@/components/VoiceQA";
import { cn } from "@/lib/utils";
import type { Id } from "../convex/_generated/dataModel";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useVoiceQueue } from "@/hooks/useVoiceQueue";

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

  // Voice queue for auto-playing messages
  const {
    isMuted,
    isPlaying: isPlayingVoice,
    currentMessageId,
    toggleMute,
    playMessage,
    playAllMessages,
    clearQueue
  } = useVoiceQueue();

  // Simulation control mutations
  const pauseSimulation = useMutation(api.simulation.state.pause);
  const startSimulation = useMutation(api.simulation.state.start);
  const runRound = useAction(api.simulation.orchestrator.runRound);
  const [isResuming, setIsResuming] = useState(false);

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

  // Handle selecting a game - auto-pause and play voice
  const handleSelectGame = useCallback(async (gameId: Id<"games"> | null) => {
    // If deselecting, just clear the selection
    if (gameId === null || gameId === selectedGameId) {
      setSelectedGameId(null);
      clearQueue();
      return;
    }

    // Select the new game - this clears queue and starts fresh
    setSelectedGameId(gameId);
    clearQueue();

    // Auto-pause simulation if running
    if (simulationState?.status === "running") {
      try {
        await pauseSimulation();
      } catch (err) {
        console.error("Failed to pause simulation:", err);
      }
    }
  }, [selectedGameId, simulationState?.status, pauseSimulation, clearQueue]);

  // Handle resume simulation
  const handleResume = useCallback(async () => {
    setIsResuming(true);
    try {
      // Clear the selected game so user can watch live
      setSelectedGameId(null);
      clearQueue();
      await startSimulation();
      await runRound({});
    } catch (err) {
      console.error("Failed to resume simulation:", err);
    } finally {
      setIsResuming(false);
    }
  }, [startSimulation, runRound, clearQueue]);

  // Handle selecting an agent - auto-pause and show profile modal
  const handleSelectAgent = useCallback(async (agentId: Id<"agents"> | null) => {
    // If deselecting, just clear the selection
    if (agentId === null) {
      setSelectedAgentId(null);
      return;
    }

    // Select the agent
    setSelectedAgentId(agentId);

    // Auto-pause simulation if running
    if (simulationState?.status === "running") {
      try {
        await pauseSimulation();
      } catch (err) {
        console.error("Failed to pause simulation:", err);
      }
    }
  }, [simulationState?.status, pauseSimulation]);

  // Reset state when game changes
  useEffect(() => {
    if (!messages || messages.length === 0 || !selectedGameId) {
      setVisibleMessages(0);
      setShowDecisions(false);
      return;
    }
    // Reset for new game
    setVisibleMessages(0);
    setShowDecisions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only reset on game change
  }, [selectedGameId]);

  // Sync message visibility with voice playback
  useEffect(() => {
    if (!messages || messages.length === 0 || !selectedGameId) return;

    // If voice is playing, sync visibility to current playing message
    if (currentMessageId && isPlayingVoice) {
      const playingIndex = messages.findIndex(m => m._id === currentMessageId);
      if (playingIndex !== -1) {
        // Show messages up to and including the one being played
        setVisibleMessages(Math.max(visibleMessages, playingIndex + 1));
      }
    }
  }, [currentMessageId, isPlayingVoice, messages, selectedGameId, visibleMessages]);

  // Timer-based reveal when voice is muted OR as fallback
  useEffect(() => {
    if (!messages || messages.length === 0 || !selectedGameId) return;

    // If all messages are already visible, show decisions
    if (visibleMessages >= messages.length) {
      const timer = setTimeout(() => setShowDecisions(true), 1000);
      return () => clearTimeout(timer);
    }

    // If voice is muted or not actively playing, use timer-based reveal
    if (isMuted || !isPlayingVoice) {
      const interval = setInterval(() => {
        setVisibleMessages((prev) => {
          if (prev >= messages.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [messages, selectedGameId, isMuted, isPlayingVoice, visibleMessages]);

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
      {/* Header */}
      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold tracking-widest">FR8</h1>
          <span className="text-white/40 text-sm">The Trust Arena</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 text-xs px-2 py-1 rounded",
            simulationState?.status === "paused" && "bg-amber-500/20"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isRunning ? "bg-emerald-400 animate-pulse" :
              simulationState?.status === "paused" ? "bg-amber-400" : "bg-white/30"
            )} />
            <span className={cn(
              simulationState?.status === "paused" ? "text-amber-400 font-medium" : "text-white/60"
            )}>
              {simulationState?.status?.toUpperCase() ?? "STOPPED"}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-white/40">Round</span>{" "}
            <span className="font-mono text-emerald-400">{currentRound}</span>
          </div>
          {/* Voice mute toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              isMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
            )}
            title={isMuted ? "Unmute voice" : "Mute voice"}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMuted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              )}
            </svg>
            <span className="font-medium">{isMuted ? "MUTED" : "VOICE"}</span>
            {isPlayingVoice && !isMuted && (
              <span className="flex items-center gap-0.5">
                <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" />
                <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75" />
                <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150" />
              </span>
            )}
          </button>
          <ControlPanel
            simulationStatus={simulationState?.status}
            hasAgents={hasAgents ?? false}
            maxRounds={simulationState?.maxRounds}
            roundsThisSession={simulationState?.roundsThisSession}
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
                      onClick={() => void handleSelectAgent(agent._id)}
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
                        onClick={() => void handleSelectGame(selectedGameId === game._id ? null : game._id)}
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

              {/* AI Neural Network - Technical Visualization */}
              {isRunning && (
                <div className="mt-4 flex justify-center animate-fade-in">
                  <div className="relative w-72 h-72">
                    {/* Background grid */}
                    <div className="absolute inset-0 opacity-[0.07]">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <defs>
                          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#22d3d1" strokeWidth="0.2"/>
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                      </svg>
                    </div>

                    {/* Outer rotating rings */}
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '25s' }}>
                      <circle cx="50" cy="50" r="48" fill="none" stroke="#a855f7" strokeWidth="0.2" strokeDasharray="2 4 8 4" opacity="0.5" />
                      <circle cx="50" cy="50" r="46" fill="none" stroke="#22d3d1" strokeWidth="0.15" strokeDasharray="1 3" opacity="0.3" />
                    </svg>
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '18s', animationDirection: 'reverse' }}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#22d3d1" strokeWidth="0.3" strokeDasharray="1 2 6 2" opacity="0.4" />
                    </svg>
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '30s' }}>
                      <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" strokeWidth="0.15" strokeDasharray="3 6" opacity="0.3" />
                    </svg>

                    {/* Main neural network */}
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
                      <defs>
                        <linearGradient id="neuralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="50%" stopColor="#22d3d1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                        <filter id="glow"><feGaussianBlur stdDeviation="1.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <filter id="glowStrong"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                      </defs>

                      {/* Hexagonal frame */}
                      <polygon points="50,15 75,32 75,68 50,85 25,68 25,32" fill="none" stroke="url(#neuralGrad)" strokeWidth="0.3" opacity="0.5" />
                      <polygon points="50,22 68,35 68,65 50,78 32,65 32,35" fill="none" stroke="#22d3d1" strokeWidth="0.2" opacity="0.3" />
                      <polygon points="50,29 61,38 61,62 50,71 39,62 39,38" fill="none" stroke="#a855f7" strokeWidth="0.15" opacity="0.25" />

                      {/* Input layer */}
                      <g filter="url(#glow)">
                        <circle cx="12" cy="28" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.1s" repeatCount="indefinite" /></circle>
                        <circle cx="12" cy="42" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.3s" repeatCount="indefinite" begin="0.15s" /></circle>
                        <circle cx="12" cy="56" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" begin="0.3s" /></circle>
                        <circle cx="12" cy="70" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" begin="0.45s" /></circle>
                      </g>

                      {/* Hidden layer 1 */}
                      <g filter="url(#glow)">
                        <circle cx="30" cy="24" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.1s" /></circle>
                        <circle cx="30" cy="36" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.2s" /></circle>
                        <circle cx="30" cy="48" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.3s" /></circle>
                        <circle cx="30" cy="60" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.3s" repeatCount="indefinite" begin="0.4s" /></circle>
                        <circle cx="30" cy="72" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.5s" /></circle>
                      </g>

                      {/* Core processing */}
                      <g filter="url(#glowStrong)">
                        <circle cx="50" cy="32" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" /></circle>
                        <circle cx="50" cy="50" r="4" fill="#a855f7"><animate attributeName="opacity" values="0.6;1;0.6" dur="1.8s" repeatCount="indefinite" /><animate attributeName="r" values="3.5;5;3.5" dur="1.8s" repeatCount="indefinite" /></circle>
                        <circle cx="50" cy="68" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" begin="0.4s" /></circle>
                      </g>

                      {/* Hidden layer 2 */}
                      <g filter="url(#glow)">
                        <circle cx="70" cy="24" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.3s" repeatCount="indefinite" begin="0.15s" /></circle>
                        <circle cx="70" cy="36" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.25s" /></circle>
                        <circle cx="70" cy="48" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite" begin="0.35s" /></circle>
                        <circle cx="70" cy="60" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.45s" /></circle>
                        <circle cx="70" cy="72" r="2" fill="#a855f7"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.3s" repeatCount="indefinite" begin="0.55s" /></circle>
                      </g>

                      {/* Output layer */}
                      <g filter="url(#glow)">
                        <circle cx="88" cy="38" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" begin="0.2s" /></circle>
                        <circle cx="88" cy="62" r="2.5" fill="#22d3d1"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" repeatCount="indefinite" begin="0.4s" /></circle>
                      </g>

                      {/* Connections - input to hidden1 */}
                      <g stroke="#22d3d1" strokeWidth="0.3" opacity="0.5">
                        <line x1="15" y1="28" x2="27" y2="24"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.7s" repeatCount="indefinite" /></line>
                        <line x1="15" y1="28" x2="27" y2="36"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.8s" repeatCount="indefinite" begin="0.05s" /></line>
                        <line x1="15" y1="42" x2="27" y2="36"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.75s" repeatCount="indefinite" begin="0.1s" /></line>
                        <line x1="15" y1="42" x2="27" y2="48"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.85s" repeatCount="indefinite" begin="0.15s" /></line>
                        <line x1="15" y1="56" x2="27" y2="48"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.7s" repeatCount="indefinite" begin="0.2s" /></line>
                        <line x1="15" y1="56" x2="27" y2="60"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.8s" repeatCount="indefinite" begin="0.25s" /></line>
                        <line x1="15" y1="70" x2="27" y2="60"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.75s" repeatCount="indefinite" begin="0.3s" /></line>
                        <line x1="15" y1="70" x2="27" y2="72"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.85s" repeatCount="indefinite" begin="0.35s" /></line>
                      </g>

                      {/* Connections - hidden1 to core */}
                      <g stroke="#a855f7" strokeWidth="0.3" opacity="0.5">
                        <line x1="33" y1="24" x2="47" y2="32"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.9s" repeatCount="indefinite" begin="0.1s" /></line>
                        <line x1="33" y1="36" x2="47" y2="50"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.95s" repeatCount="indefinite" begin="0.2s" /></line>
                        <line x1="33" y1="48" x2="47" y2="50"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.85s" repeatCount="indefinite" begin="0.3s" /></line>
                        <line x1="33" y1="60" x2="47" y2="50"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.9s" repeatCount="indefinite" begin="0.4s" /></line>
                        <line x1="33" y1="72" x2="47" y2="68"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.95s" repeatCount="indefinite" begin="0.5s" /></line>
                      </g>

                      {/* Connections - core to hidden2 */}
                      <g stroke="#a855f7" strokeWidth="0.3" opacity="0.5">
                        <line x1="53" y1="32" x2="67" y2="24"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.9s" repeatCount="indefinite" begin="0.15s" /></line>
                        <line x1="53" y1="50" x2="67" y2="36"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.85s" repeatCount="indefinite" begin="0.25s" /></line>
                        <line x1="53" y1="50" x2="67" y2="48"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.95s" repeatCount="indefinite" begin="0.35s" /></line>
                        <line x1="53" y1="50" x2="67" y2="60"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.9s" repeatCount="indefinite" begin="0.45s" /></line>
                        <line x1="53" y1="68" x2="67" y2="72"><animate attributeName="stroke-opacity" values="0.1;0.6;0.1" dur="0.85s" repeatCount="indefinite" begin="0.55s" /></line>
                      </g>

                      {/* Connections - hidden2 to output */}
                      <g stroke="#22d3d1" strokeWidth="0.3" opacity="0.5">
                        <line x1="73" y1="24" x2="85" y2="38"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.75s" repeatCount="indefinite" begin="0.25s" /></line>
                        <line x1="73" y1="36" x2="85" y2="38"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.8s" repeatCount="indefinite" begin="0.35s" /></line>
                        <line x1="73" y1="48" x2="85" y2="38"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.7s" repeatCount="indefinite" begin="0.45s" /></line>
                        <line x1="73" y1="48" x2="85" y2="62"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.85s" repeatCount="indefinite" begin="0.5s" /></line>
                        <line x1="73" y1="60" x2="85" y2="62"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.75s" repeatCount="indefinite" begin="0.55s" /></line>
                        <line x1="73" y1="72" x2="85" y2="62"><animate attributeName="stroke-opacity" values="0.1;0.7;0.1" dur="0.8s" repeatCount="indefinite" begin="0.6s" /></line>
                      </g>

                      {/* Data particles flowing through network */}
                      <circle r="0.8" fill="#22d3d1"><animateMotion dur="1.8s" repeatCount="indefinite" path="M12,28 Q21,26 30,24 T50,32" /><animate attributeName="opacity" values="0;1;1;0" dur="1.8s" repeatCount="indefinite" /></circle>
                      <circle r="0.8" fill="#a855f7"><animateMotion dur="2.2s" repeatCount="indefinite" path="M12,42 Q25,44 50,50 T88,38" begin="0.3s" /><animate attributeName="opacity" values="0;1;1;0" dur="2.2s" repeatCount="indefinite" begin="0.3s" /></circle>
                      <circle r="0.8" fill="#22d3d1"><animateMotion dur="2s" repeatCount="indefinite" path="M12,56 Q35,54 50,50 T88,62" begin="0.6s" /><animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="0.6s" /></circle>
                      <circle r="0.8" fill="#a855f7"><animateMotion dur="2.4s" repeatCount="indefinite" path="M12,70 Q30,68 50,68 T88,62" begin="0.9s" /><animate attributeName="opacity" values="0;1;1;0" dur="2.4s" repeatCount="indefinite" begin="0.9s" /></circle>
                    </svg>

                    {/* Technical readouts - left side */}
                    <div className="absolute -left-20 top-1/2 -translate-y-1/2 text-[7px] font-mono text-cyan-500/50 space-y-0.5 leading-tight">
                      <div className="text-cyan-400/70 animate-pulse">INPUT_LAYER</div>
                      <div>dim: 4x1</div>
                      <div>type: float32</div>
                      <div className="text-emerald-400/60">status: active</div>
                    </div>

                    {/* Technical readouts - right side */}
                    <div className="absolute -right-20 top-1/2 -translate-y-1/2 text-[7px] font-mono text-cyan-500/50 space-y-0.5 text-right leading-tight">
                      <div className="text-cyan-400/70 animate-pulse">OUTPUT_LAYER</div>
                      <div>dim: 2x1</div>
                      <div>softmax: true</div>
                      <div className="text-amber-400/60">inferring...</div>
                    </div>

                    {/* Bottom status bar */}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 text-[8px] font-mono space-y-1 text-center">
                      <div className="text-purple-400/60">NEURAL_NET_v3.2.1 | layers: 5 | params: 847K</div>
                      <div className="text-cyan-400/50 animate-pulse">INFERENCE_MODE :: BATCH_PROCESSING</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Paused Banner with Resume Button */}
              {simulationState?.status === "paused" && (
                <div className="mt-4 border border-amber-500/50 rounded-md bg-amber-500/10 p-4 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div>
                      <div className="text-sm font-medium text-amber-400">Simulation Paused</div>
                      <div className="text-[10px] text-white/50">
                        {selectedGameId ? "Viewing conversation replay" : "Click a match to view replay with voice"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleResume()}
                    disabled={isResuming}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      "bg-emerald-500 text-black hover:bg-emerald-400",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isResuming ? "Resuming..." : "▶ Resume Simulation"}
                  </button>
                </div>
              )}

              {/* Selected Match Detail - Dramatic Playback */}
              {selectedGame && (
                <div className="mt-4 border border-amber-500/30 rounded-md animate-fade-in bg-amber-500/5">
                  <div className="px-3 py-2 border-b border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-amber-400">MATCH REPLAY</span>
                      {isPlayingVoice && (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <span className="w-0.5 h-2 bg-current animate-pulse" />
                          <span className="w-0.5 h-3 bg-current animate-pulse delay-75" />
                          <span className="w-0.5 h-1.5 bg-current animate-pulse delay-150" />
                          <span className="text-[9px] ml-1">PLAYING</span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => void handleSelectGame(null)}
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
                          <div className="flex items-center gap-2">
                            {/* Play All Button */}
                            <button
                              onClick={() => {
                                const allMessageIds = messages.map(m => m._id);
                                playAllMessages(allMessageIds);
                              }}
                              disabled={isMuted || isPlayingVoice}
                              className={cn(
                                "text-[9px] px-2 py-1 rounded border transition-all flex items-center gap-1",
                                isPlayingVoice
                                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                                  : isMuted
                                  ? "border-white/10 text-white/20 cursor-not-allowed"
                                  : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                              )}
                              title={isMuted ? "Voice is muted" : isPlayingVoice ? "Playing..." : "Play full conversation"}
                            >
                              {isPlayingVoice ? (
                                <>
                                  <span className="flex items-center gap-0.5">
                                    <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" />
                                    <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75" />
                                    <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-150" />
                                  </span>
                                  Playing
                                </>
                              ) : (
                                <>▶ Play All</>
                              )}
                            </button>
                            <span className="text-[10px] text-white/30">
                              {visibleMessages} / {messages.length}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {messages.slice(0, visibleMessages).map((msg) => {
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
                                      onClick={() => void playMessage(msg._id)}
                                      disabled={isMuted}
                                      className={cn(
                                        "text-[9px] transition-colors",
                                        currentMessageId === msg._id && isPlayingVoice
                                          ? "text-emerald-400"
                                          : isMuted
                                          ? "text-white/20 cursor-not-allowed"
                                          : "text-white/30 hover:text-amber-400"
                                      )}
                                      title={isMuted ? "Voice is muted" : "Play voice"}
                                    >
                                      {currentMessageId === msg._id && isPlayingVoice ? "▶" : "🔊"}
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

                    {/* Voice Q&A for Match */}
                    {showDecisions && selectedGame.phase === "completed" && (
                      <MatchVoiceQA
                        gameId={selectedGame._id}
                        agentA={selectedGame.agentA}
                        agentB={selectedGame.agentB}
                      />
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
                    <div className="h-48">
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
                            type="natural"
                            dataKey="cooperation"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
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

      {/* Agent Profile Modal */}
      {selectedAgent && (
        <AgentProfileModal
          agent={selectedAgent}
          rank={(agents?.findIndex(a => a._id === selectedAgent._id) ?? 0) + 1}
          memories={memories}
          evolution={evolution}
          onClose={() => setSelectedAgentId(null)}
          onViewMemoryAgent={(agentId) => void handleSelectAgent(agentId)}
        />
      )}
    </div>
  );
}

// Voice Q&A component for match replay
interface MatchVoiceQAProps {
  gameId: Id<"games">;
  agentA: { _id: Id<"agents">; name: string; badge: string; color: string } | null;
  agentB: { _id: Id<"agents">; name: string; badge: string; color: string } | null;
}

function MatchVoiceQA({ gameId, agentA, agentB }: MatchVoiceQAProps) {
  const [selectedAgent, setSelectedAgent] = useState<"A" | "B" | null>(null);

  if (!agentA || !agentB) return null;

  const currentAgent = selectedAgent === "A" ? agentA : selectedAgent === "B" ? agentB : null;

  return (
    <div className="border-t border-amber-500/20 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium text-purple-400 uppercase flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Ask an Agent
        </span>
      </div>

      {/* Agent Selection */}
      {!selectedAgent && (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedAgent("A")}
            className={cn(
              "flex-1 py-3 rounded-lg border border-white/10 hover:border-white/30",
              "flex flex-col items-center gap-1 transition-colors hover:bg-white/5"
            )}
          >
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ backgroundColor: `${agentA.color}30`, color: agentA.color }}
            >
              {agentA.badge}
            </span>
            <span className="text-[10px] text-white/60">Ask {agentA.name}</span>
          </button>
          <button
            onClick={() => setSelectedAgent("B")}
            className={cn(
              "flex-1 py-3 rounded-lg border border-white/10 hover:border-white/30",
              "flex flex-col items-center gap-1 transition-colors hover:bg-white/5"
            )}
          >
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{ backgroundColor: `${agentB.color}30`, color: agentB.color }}
            >
              {agentB.badge}
            </span>
            <span className="text-[10px] text-white/60">Ask {agentB.name}</span>
          </button>
        </div>
      )}

      {/* Voice Q&A Interface */}
      {selectedAgent && currentAgent && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-white/40">
              Asking {currentAgent.name}
            </span>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-[10px] text-white/40 hover:text-white"
            >
              ← Change agent
            </button>
          </div>
          <VoiceQA
            agentId={currentAgent._id}
            agentName={currentAgent.name}
            agentBadge={currentAgent.badge}
            agentColor={currentAgent.color}
            gameId={gameId}
            opponentId={selectedAgent === "A" ? agentB._id : agentA._id}
          />
        </div>
      )}
    </div>
  );
}

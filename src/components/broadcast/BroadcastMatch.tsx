import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AgentPortrait } from "./AgentPortrait";
import { TypewriterMessage } from "./TypewriterMessage";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

interface BroadcastMatchProps {
  gameId: Id<"games">;
  onComplete?: () => void;
}

const phaseLabels: Record<string, string> = {
  negotiation: "Negotiating",
  decision: "Deciding",
  reveal: "Revealing",
  completed: "Complete",
};

export function BroadcastMatch({ gameId, onComplete: _onComplete }: BroadcastMatchProps) {
  const game = useQuery(api.games.getForReenactment, { gameId });
  const agents = useQuery(api.agents.queries.list);

  const [showDecisionA, setShowDecisionA] = useState(false);
  const [showDecisionB, setShowDecisionB] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);

  // Find agent ranks
  const getAgentRank = (agentId: Id<"agents"> | undefined) => {
    if (!agents || !agentId) return undefined;
    const sorted = [...agents].sort((a, b) => b.totalScore - a.totalScore);
    return sorted.findIndex(a => a._id === agentId) + 1;
  };

  // Find agent data
  const getAgentData = (agentId: Id<"agents"> | undefined) => {
    if (!agents || !agentId) return null;
    return agents.find(a => a._id === agentId);
  };

  // Handle decision reveals
  useEffect(() => {
    if (game?.phase === "completed" || game?.phase === "reveal") {
      const timer1 = setTimeout(() => setShowDecisionA(true), 500);
      const timer2 = setTimeout(() => setShowDecisionB(true), 1500);
      const timer3 = setTimeout(() => setShowOutcome(true), 2500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [game?.phase]);

  if (!game) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading match...</div>
      </div>
    );
  }

  const agentAData = getAgentData(game.agentA?._id as Id<"agents">);
  const agentBData = getAgentData(game.agentB?._id as Id<"agents">);
  const lastMessage = game.messages[game.messages.length - 1];
  const isNegotiating = game.phase === "negotiation";
  const isDeciding = game.phase === "decision";
  const isRevealing = game.phase === "reveal" || game.phase === "completed";

  return (
    <div className="h-full flex flex-col">
      {/* Phase Indicator */}
      <div className="text-center py-4">
        <span className={cn(
          "text-sm font-medium px-4 py-1.5 rounded-full",
          isNegotiating && "bg-negotiate/10 text-negotiate",
          isDeciding && "bg-evolve/10 text-evolve",
          isRevealing && "bg-split/10 text-split"
        )}>
          {phaseLabels[game.phase]}
        </span>
      </div>

      {/* Main Arena */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-5xl flex items-center justify-between gap-8">
          {/* Agent A */}
          <AgentPortrait
            name={game.agentA?.name ?? "Unknown"}
            badge={game.agentA?.badge ?? "???"}
            color={game.agentA?.color ?? "#888"}
            type={game.agentA?.type ?? "unknown"}
            score={agentAData?.totalScore ?? 0}
            rank={getAgentRank(game.agentA?._id as Id<"agents">)}
            cooperationRate={agentAData?.cooperationRate ?? 0}
            side="left"
            isActive={lastMessage?.isAgentA}
            decision={game.agentADecision}
            showDecision={showDecisionA && isRevealing}
          />

          {/* Center - VS or Message */}
          <div className="flex-1 flex flex-col items-center gap-6">
            {isNegotiating && lastMessage ? (
              <div className="w-full max-w-md">
                <TypewriterMessage
                  key={lastMessage._id}
                  content={lastMessage.content}
                  senderName={lastMessage.senderName ?? "Unknown"}
                  senderColor={lastMessage.senderColor ?? "#888888"}
                  isAgentA={lastMessage.isAgentA}
                />
                <div className="flex justify-center gap-1 mt-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i < game.messages.length
                          ? "bg-foreground"
                          : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : isDeciding ? (
              <div className="text-center">
                <div className="text-6xl mb-4 animate-subtle-pulse">🤔</div>
                <div className="text-muted-foreground text-sm">
                  Agents are making their decisions...
                </div>
              </div>
            ) : isRevealing ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-muted-foreground mb-2">VS</div>
                {showOutcome && (
                  <div className="animate-fade-in">
                    {game.agentADecision === "split" && game.agentBDecision === "split" ? (
                      <div className="text-split text-lg font-semibold">
                        Mutual Cooperation
                      </div>
                    ) : game.agentADecision === "steal" && game.agentBDecision === "steal" ? (
                      <div className="text-steal text-lg font-semibold">
                        Mutual Betrayal
                      </div>
                    ) : (
                      <div className="text-negotiate text-lg font-semibold">
                        Betrayal
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-4xl font-bold text-muted-foreground">VS</div>
            )}
          </div>

          {/* Agent B */}
          <AgentPortrait
            name={game.agentB?.name ?? "Unknown"}
            badge={game.agentB?.badge ?? "???"}
            color={game.agentB?.color ?? "#888"}
            type={game.agentB?.type ?? "unknown"}
            score={agentBData?.totalScore ?? 0}
            rank={getAgentRank(game.agentB?._id as Id<"agents">)}
            cooperationRate={agentBData?.cooperationRate ?? 0}
            side="right"
            isActive={lastMessage && !lastMessage.isAgentA}
            decision={game.agentBDecision}
            showDecision={showDecisionB && isRevealing}
          />
        </div>
      </div>

      {/* Score Display (when revealed) */}
      {showOutcome && isRevealing && (
        <div className="flex justify-center gap-24 py-6 animate-fade-in">
          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: game.agentA?.color }}>
              +{game.agentAScore ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">points</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold font-mono" style={{ color: game.agentB?.color }}>
              +{game.agentBScore ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">points</div>
          </div>
        </div>
      )}
    </div>
  );
}

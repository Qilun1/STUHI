import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatLog } from "./ChatLog";
import { DecisionReveal } from "./DecisionReveal";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";

type PlaybackPhase =
  | { type: "intro" }
  | { type: "messages"; index: number; typing: boolean }
  | { type: "decision"; reveal: "hidden" | "revealA" | "revealB" | "outcome" }
  | { type: "complete" };

interface ReenactmentProps {
  gameId: Id<"games">;
  autoPlay?: boolean;
  onClose?: () => void;
}

const MESSAGE_DELAY = 2500;
const TYPING_DELAY = 800;
const REVEAL_DELAY = 2000;

export function Reenactment({ gameId, autoPlay = true, onClose }: ReenactmentProps) {
  const game = useQuery(api.games.getForReenactment, { gameId });

  const [phase, setPhase] = useState<PlaybackPhase>({ type: "intro" });
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);

  const messageCount = game?.messages?.length ?? 0;

  // Advance playback
  const advance = useCallback(() => {
    setPhase((current) => {
      switch (current.type) {
        case "intro":
          if (messageCount > 0) {
            return { type: "messages", index: 0, typing: true };
          }
          return { type: "decision", reveal: "hidden" };

        case "messages":
          if (current.typing) {
            // Show the message
            return { type: "messages", index: current.index, typing: false };
          }
          if (current.index < messageCount - 1) {
            // Move to next message
            return { type: "messages", index: current.index + 1, typing: true };
          }
          // Done with messages, move to decision
          return { type: "decision", reveal: "hidden" };

        case "decision":
          switch (current.reveal) {
            case "hidden":
              return { type: "decision", reveal: "revealA" };
            case "revealA":
              return { type: "decision", reveal: "revealB" };
            case "revealB":
              return { type: "decision", reveal: "outcome" };
            case "outcome":
              return { type: "complete" };
          }
          break;

        case "complete":
          return current;
      }
      return current;
    });
  }, [messageCount]);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || phase.type === "complete") return;

    let delay = MESSAGE_DELAY / speed;

    if (phase.type === "messages" && phase.typing) {
      delay = TYPING_DELAY / speed;
    } else if (phase.type === "decision") {
      delay = REVEAL_DELAY / speed;
    } else if (phase.type === "intro") {
      delay = 1000 / speed;
    }

    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, phase, speed, advance]);

  // Skip to end
  const skipToEnd = () => {
    setPhase({ type: "complete" });
    setIsPlaying(false);
  };

  // Reset
  const reset = () => {
    setPhase({ type: "intro" });
    setIsPlaying(true);
  };

  if (!game) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading game data...
      </div>
    );
  }

  const visibleMessages =
    phase.type === "messages"
      ? phase.index + (phase.typing ? 0 : 1)
      : phase.type === "intro"
        ? 0
        : messageCount;

  const showDecision =
    phase.type === "decision" || phase.type === "complete";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-2 border-border">
        <div className="flex items-center gap-4">
          <Badge variant={(game.agentA?.type as "diplomat") ?? "outline"}>
            {game.agentA?.badge}
          </Badge>
          <span className="text-muted-foreground text-sm">VS</span>
          <Badge variant={(game.agentB?.type as "diplomat") ?? "outline"}>
            {game.agentB?.badge}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            ROUND {game.roundNumber}
          </Badge>
        </div>
      </div>

      {/* Trust Info */}
      <div className="flex items-center justify-between px-4 py-2 bg-elevated text-xs">
        <span className="text-muted-foreground">
          {game.agentA?.name}'s trust in {game.agentB?.name}:{" "}
          <span className={cn(game.trustAtoB >= 0 ? "text-split" : "text-steal")}>
            {game.trustAtoB}
          </span>
        </span>
        <span className="text-muted-foreground">
          {game.agentB?.name}'s trust in {game.agentA?.name}:{" "}
          <span className={cn(game.trustBtoA >= 0 ? "text-split" : "text-steal")}>
            {game.trustBtoA}
          </span>
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        {!showDecision ? (
          <ChatLog
            messages={game.messages.map((m) => ({
              _id: m._id,
              content: m.content,
              senderName: m.senderName,
              senderBadge: m.senderBadge,
              senderColor: m.senderColor,
              senderType: m.senderType,
              isAgentA: m.isAgentA,
              messageNumber: m.messageNumber,
            }))}
            visibleCount={visibleMessages}
            isTyping={phase.type === "messages" && phase.typing}
          />
        ) : (
          <DecisionReveal
            agentA={game.agentA}
            agentB={game.agentB}
            decisionA={game.agentADecision}
            decisionB={game.agentBDecision}
            scoreA={game.agentAScore}
            scoreB={game.agentBScore}
            phase={phase.type === "decision" ? phase.reveal : "outcome"}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-t-2 border-border bg-surface">
        <div className="flex items-center gap-2">
          {phase.type !== "complete" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "PAUSE" : "PLAY"}
              </Button>
              <Button variant="outline" size="sm" onClick={advance}>
                STEP
              </Button>
              <Button variant="outline" size="sm" onClick={skipToEnd}>
                SKIP
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={reset}>
              REPLAY
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed:</span>
          {[0.5, 1, 2].map((s) => (
            <Button
              key={s}
              variant={speed === s ? "split" : "outline"}
              size="sm"
              onClick={() => setSpeed(s)}
              className="w-10"
            >
              {s}x
            </Button>
          ))}
        </div>

        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            CLOSE
          </Button>
        )}
      </div>
    </div>
  );
}

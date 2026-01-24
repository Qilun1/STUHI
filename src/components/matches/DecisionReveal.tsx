import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Handshake, ShieldSlash } from "@phosphor-icons/react";

interface Agent {
  name: string;
  badge: string;
  type: string;
  color: string;
}

interface DecisionRevealProps {
  agentA: Agent | null;
  agentB: Agent | null;
  decisionA?: "split" | "steal";
  decisionB?: "split" | "steal";
  scoreA?: number;
  scoreB?: number;
  phase: "hidden" | "revealA" | "revealB" | "outcome";
}

function DecisionCard({
  agent,
  decision,
  revealed,
  score,
  showScore,
}: {
  agent: Agent | null;
  decision?: "split" | "steal";
  revealed: boolean;
  score?: number;
  showScore: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Agent Badge */}
      <Badge variant={(agent?.type as "diplomat") ?? "outline"}>
        {agent?.badge ?? "???"}
      </Badge>
      <div className="text-xs text-zinc-500">{agent?.name}</div>

      {/* Decision Card */}
      <div
        className={cn(
          "w-24 h-32 flex flex-col items-center justify-center rounded-xl border transition-all duration-500",
          revealed
            ? decision === "split"
              ? "bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/20"
              : "bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/20"
            : "bg-zinc-800/50 border-zinc-700/50"
        )}
      >
        {revealed ? (
          <>
            {decision === "split" ? (
              <Handshake className="size-8 text-green-400 mb-1" weight="fill" />
            ) : (
              <ShieldSlash className="size-8 text-red-400 mb-1" weight="fill" />
            )}
            <span
              className={cn(
                "font-bold text-sm",
                decision === "split" ? "text-green-400" : "text-red-400"
              )}
            >
              {decision?.toUpperCase()}
            </span>
          </>
        ) : (
          <span className="text-3xl text-zinc-600">?</span>
        )}
      </div>

      {/* Score */}
      {showScore && score !== undefined && (
        <div
          className={cn(
            "text-2xl font-bold font-mono transition-all duration-300",
            score > 0 ? "text-green-400" : "text-zinc-500"
          )}
        >
          +{score}
        </div>
      )}
    </div>
  );
}

export function DecisionReveal({
  agentA,
  agentB,
  decisionA,
  decisionB,
  scoreA,
  scoreB,
  phase,
}: DecisionRevealProps) {
  const revealedA = phase === "revealA" || phase === "revealB" || phase === "outcome";
  const revealedB = phase === "revealB" || phase === "outcome";
  const showScore = phase === "outcome";

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Title */}
      <div className="text-sm text-zinc-500">
        {phase === "hidden" && "Awaiting Decisions..."}
        {phase === "revealA" && `${agentA?.name} reveals...`}
        {phase === "revealB" && `${agentB?.name} reveals...`}
        {phase === "outcome" && "Final Outcome"}
      </div>

      {/* Decision Cards */}
      <div className="flex items-center gap-12">
        <DecisionCard
          agent={agentA}
          decision={decisionA}
          revealed={revealedA}
          score={scoreA}
          showScore={showScore}
        />

        <div className="text-zinc-600 font-bold text-lg">VS</div>

        <DecisionCard
          agent={agentB}
          decision={decisionB}
          revealed={revealedB}
          score={scoreB}
          showScore={showScore}
        />
      </div>

      {/* Outcome Description */}
      {phase === "outcome" && decisionA && decisionB && (
        <div className="text-sm text-center mt-4">
          {decisionA === "split" && decisionB === "split" && (
            <span className="text-green-400">Both cooperated! Fair split.</span>
          )}
          {decisionA === "split" && decisionB === "steal" && (
            <span className="text-red-400">
              {agentB?.name} betrayed {agentA?.name}!
            </span>
          )}
          {decisionA === "steal" && decisionB === "split" && (
            <span className="text-red-400">
              {agentA?.name} betrayed {agentB?.name}!
            </span>
          )}
          {decisionA === "steal" && decisionB === "steal" && (
            <span className="text-zinc-500">
              Mutual destruction. Nobody wins.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

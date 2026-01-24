import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
      <div className="text-xs text-muted-foreground">{agent?.name}</div>

      {/* Decision Card */}
      <div
        className={cn(
          "w-24 h-32 flex items-center justify-center border-2 transition-all duration-500",
          revealed
            ? decision === "split"
              ? "bg-split/20 border-split"
              : "bg-steal/20 border-steal"
            : "bg-elevated border-border"
        )}
      >
        {revealed ? (
          <span
            className={cn(
              "font-bold text-lg",
              decision === "split" ? "text-split" : "text-steal"
            )}
          >
            {decision?.toUpperCase()}
          </span>
        ) : (
          <span className="text-3xl text-muted-foreground">?</span>
        )}
      </div>

      {/* Score */}
      {showScore && score !== undefined && (
        <div
          className={cn(
            "text-2xl font-bold transition-all duration-300",
            score > 0 ? "text-split" : "text-muted-foreground"
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
      <div className="text-sm text-muted-foreground uppercase tracking-wider">
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

        <div className="text-muted-foreground font-bold">VS</div>

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
            <span className="text-split">Both cooperated! Fair split.</span>
          )}
          {decisionA === "split" && decisionB === "steal" && (
            <span className="text-steal">
              {agentB?.name} betrayed {agentA?.name}!
            </span>
          )}
          {decisionA === "steal" && decisionB === "split" && (
            <span className="text-steal">
              {agentA?.name} betrayed {agentB?.name}!
            </span>
          )}
          {decisionA === "steal" && decisionB === "steal" && (
            <span className="text-muted-foreground">
              Mutual destruction. Nobody wins.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

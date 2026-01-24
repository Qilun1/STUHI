import { useState, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";

const PARTY_COLORS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
];

interface MultiPartyViewProps {
  negotiationId: Id<"negotiations">;
  scenarioId: Id<"scenarios">;
  onComplete: () => void;
}

export function MultiPartyView({
  negotiationId,
  scenarioId,
  onComplete,
}: MultiPartyViewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const movesEndRef = useRef<HTMLDivElement>(null);

  const negotiation = useQuery(api.negotiations.queries.get, {
    id: negotiationId,
  });
  const moves = useQuery(api.negotiations.queries.getMoves, { negotiationId });
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });

  const runTurn = useAction(
    api.negotiations.multiPartyEngine.runSingleMultiPartyTurn
  );

  // Auto-scroll to bottom when new moves come in
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves?.length]);

  // Auto-run turns
  useEffect(() => {
    if (!isRunning || !negotiation) return;
    if (
      negotiation.phase === "resolved" ||
      negotiation.phase === "failed"
    ) {
      setIsRunning(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await runTurn({ negotiationId });
        if (result.done) {
          setIsRunning(false);
        }
      } catch (error) {
        console.error("Turn failed:", error);
        setIsRunning(false);
      }
    }, 1500); // 1.5 second delay between turns

    return () => clearTimeout(timer);
  }, [isRunning, negotiation?.currentTurn, negotiation?.phase]);

  if (!negotiation || !scenario) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <div className="text-zinc-500">Loading negotiation...</div>
      </div>
    );
  }

  const isComplete =
    negotiation.phase === "resolved" || negotiation.phase === "failed";
  const outcome = negotiation.multiPartyOutcome;

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">
          {scenario.title}
        </h1>
        <p className="text-zinc-400 text-sm">{scenario.description}</p>
        {negotiation.roundNumber && (
          <div className="mt-2 text-xs bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full inline-block">
            Round {negotiation.roundNumber}
          </div>
        )}
      </div>

      {/* Party Circle */}
      <div className="relative w-80 h-80 mx-auto mb-8">
        {/* Alliance lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {negotiation.alliances?.map((alliance, i) => {
            // Draw lines between alliance members
            const members = alliance.members;
            if (members.length < 2) return null;

            const lines: React.ReactNode[] = [];
            for (let j = 0; j < members.length - 1; j++) {
              const party1Index = scenario.parties.findIndex(
                (p) => p.name === members[j]
              );
              const party2Index = scenario.parties.findIndex(
                (p) => p.name === members[j + 1]
              );

              if (party1Index === -1 || party2Index === -1) continue;

              const angle1 =
                (party1Index / scenario.parties.length) * 2 * Math.PI -
                Math.PI / 2;
              const angle2 =
                (party2Index / scenario.parties.length) * 2 * Math.PI -
                Math.PI / 2;

              const x1 = 50 + 38 * Math.cos(angle1);
              const y1 = 50 + 38 * Math.sin(angle1);
              const x2 = 50 + 38 * Math.cos(angle2);
              const y2 = 50 + 38 * Math.sin(angle2);

              lines.push(
                <line
                  key={`${i}-${j}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#22C55E"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  opacity="0.5"
                />
              );
            }
            return lines;
          })}
        </svg>

        {/* Party nodes */}
        {scenario.parties.map((party, i) => {
          const angle =
            (i / scenario.parties.length) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 38 * Math.sin(angle);
          const isCurrentSpeaker = negotiation.currentSpeakerIndex === i;

          return (
            <div
              key={party.name}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${
                  isCurrentSpeaker && !isComplete
                    ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110"
                    : ""
                }`}
                style={{ backgroundColor: PARTY_COLORS[i % PARTY_COLORS.length] }}
              >
                {party.name.slice(0, 3).toUpperCase()}
              </div>
              <div className="text-center text-[10px] text-zinc-500 mt-1 max-w-16 truncate">
                {party.representative.split(" ").pop()}
              </div>
              {party.personality && (
                <div className="text-center text-[8px] text-zinc-600 truncate">
                  {party.personality.negotiationStyle}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {!isComplete && (
        <div className="flex justify-center gap-3 mb-6">
          {isRunning ? (
            <button
              onClick={() => setIsRunning(false)}
              className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg text-white font-medium transition-colors"
            >
              Pause
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsRunning(true)}
                className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded-lg text-white font-medium transition-colors"
              >
                Auto-Run
              </button>
              <button
                onClick={() => runTurn({ negotiationId })}
                className="bg-zinc-700 hover:bg-zinc-600 px-6 py-2 rounded-lg text-white font-medium transition-colors"
              >
                Step
              </button>
            </>
          )}
        </div>
      )}

      {/* Turn indicator */}
      <div className="text-center text-sm text-zinc-500 mb-4">
        Turn {negotiation.currentTurn} of {negotiation.maxTurns} |{" "}
        <span className="text-zinc-400 capitalize">{negotiation.phase}</span>
      </div>

      {/* Move Timeline */}
      <div className="bg-zinc-900 rounded-lg p-4 max-h-96 overflow-y-auto mb-6">
        {!moves || moves.length === 0 ? (
          <div className="text-center text-zinc-600 py-8">
            Waiting for negotiation to begin...
          </div>
        ) : (
          <div className="space-y-3">
            {moves.map((move: Doc<"negotiationMoves">, i: number) => {
              const partyIndex = scenario.parties.findIndex(
                (p) => p.name === move.party
              );
              return (
                <div
                  key={i}
                  className="flex gap-3 animate-fade-in"
                  style={{
                    animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`,
                  }}
                >
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        PARTY_COLORS[partyIndex % PARTY_COLORS.length],
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-sm font-medium"
                        style={{
                          color:
                            PARTY_COLORS[partyIndex % PARTY_COLORS.length],
                        }}
                      >
                        {move.party}
                      </span>
                      <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">
                        {move.moveType}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        [{move.emotionalTone}]
                      </span>
                      {move.targetParties &&
                        move.targetParties[0] !== "all" && (
                          <span className="text-[10px] text-zinc-600">
                            to {move.targetParties.join(", ")}
                          </span>
                        )}
                    </div>
                    <p className="text-sm text-zinc-300">{move.content}</p>
                    {move.tacticUsed && move.tacticUsed !== "unknown" && (
                      <span className="text-[10px] text-zinc-600 mt-1 inline-block">
                        Tactic: {move.tacticUsed}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={movesEndRef} />
          </div>
        )}
      </div>

      {/* Outcome */}
      {isComplete && outcome && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              Negotiation Complete
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                outcome.type === "deal"
                  ? "bg-green-900/50 text-green-400"
                  : outcome.type === "partial"
                    ? "bg-yellow-900/50 text-yellow-400"
                    : "bg-red-900/50 text-red-400"
              }`}
            >
              {outcome.type.toUpperCase()}
            </span>
          </div>

          <p className="text-zinc-400 mb-4">{outcome.description}</p>

          {outcome.finalDeal && (
            <div className="bg-zinc-800/50 p-3 rounded mb-4">
              <h4 className="text-xs text-zinc-500 uppercase mb-1">
                Final Deal
              </h4>
              <p className="text-sm text-zinc-300">{outcome.finalDeal}</p>
            </div>
          )}

          {/* Party scores */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {outcome.partyScores.map((ps, i) => {
              const partyIndex = scenario.parties.findIndex(
                (p) => p.name === ps.partyName
              );
              return (
                <div
                  key={ps.partyName}
                  className="bg-zinc-800/50 p-3 rounded"
                  style={{
                    borderLeft: `3px solid ${PARTY_COLORS[partyIndex % PARTY_COLORS.length]}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">
                      {ps.partyName}
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        ps.score >= 70
                          ? "text-green-400"
                          : ps.score >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {ps.score}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {ps.satisfaction}
                  </div>
                  <div className="text-xs text-zinc-600 mt-1 italic">
                    Would: {ps.wouldChange}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winning coalition */}
          {outcome.winningCoalition && outcome.winningCoalition.length > 0 && (
            <div className="mt-4 text-sm text-zinc-400">
              Winning Coalition: {outcome.winningCoalition.join(" + ")}
            </div>
          )}
        </div>
      )}

      {/* Alliances formed */}
      {negotiation.alliances && negotiation.alliances.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-zinc-400 mb-2">
            Alliances Formed
          </h4>
          <div className="space-y-2">
            {negotiation.alliances.map((alliance, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm text-zinc-300"
              >
                <span className="text-green-400">+</span>
                <span>{alliance.members.join(" + ")}</span>
                <span className="text-xs text-zinc-600">
                  (turn {alliance.formedAtTurn})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done button */}
      {isComplete && (
        <button
          onClick={onComplete}
          className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg text-white font-medium transition-colors"
        >
          Continue
        </button>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const PARTY_COLORS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
];

interface RoundTrackerProps {
  scenarioId: Id<"scenarios">;
  onRoundClick?: (round: number, negotiationId: Id<"negotiations">) => void;
}

export function RoundTracker({ scenarioId, onRoundClick }: RoundTrackerProps) {
  const rounds = useQuery(api.negotiationRounds.queries.get, { scenarioId });
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });

  if (!rounds || !scenario) {
    return (
      <div className="bg-zinc-900 rounded-lg p-6">
        <div className="text-zinc-500 text-center">Loading rounds...</div>
      </div>
    );
  }

  // Get party color by name
  const getPartyColor = (partyName: string) => {
    const index = scenario.parties.findIndex((p) => p.name === partyName);
    return PARTY_COLORS[index % PARTY_COLORS.length];
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Evolution Progress</h3>
        <span
          className={`text-xs px-2 py-1 rounded ${
            rounds.status === "running"
              ? "bg-blue-900/50 text-blue-400"
              : rounds.status === "completed"
                ? "bg-green-900/50 text-green-400"
                : "bg-yellow-900/50 text-yellow-400"
          }`}
        >
          {rounds.status}
        </span>
      </div>

      {/* Round Timeline */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {Array.from({ length: rounds.totalRounds }).map((_, i) => {
          const round = i + 1;
          const result = rounds.roundResults.find((r) => r.round === round);
          const isCurrent = rounds.currentRound === round;

          return (
            <div key={i} className="flex items-center flex-shrink-0">
              <button
                onClick={() =>
                  result &&
                  onRoundClick &&
                  onRoundClick(round, result.negotiationId)
                }
                disabled={!result}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  result
                    ? "bg-green-600 text-white hover:bg-green-500 cursor-pointer"
                    : isCurrent
                      ? "bg-blue-600 text-white animate-pulse"
                      : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {round}
              </button>
              {i < rounds.totalRounds - 1 && (
                <div
                  className={`w-6 h-0.5 ${
                    result ? "bg-green-600" : "bg-zinc-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Round Results Summary */}
      {rounds.roundResults.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">
            Round Results
          </h4>
          <div className="space-y-2">
            {rounds.roundResults.map((result) => (
              <div
                key={result.round}
                className="bg-zinc-800/50 rounded p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    Round {result.round}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      result.outcomeType === "deal"
                        ? "bg-green-900/50 text-green-400"
                        : result.outcomeType === "partial"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-red-900/50 text-red-400"
                    }`}
                  >
                    {result.outcomeType}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.rankings.map((rank) => (
                    <div
                      key={rank.partyName}
                      className="flex items-center gap-1 text-xs"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: getPartyColor(rank.partyName),
                        }}
                      />
                      <span className="text-zinc-400">{rank.partyName}</span>
                      <span
                        className={`font-medium ${
                          rank.rank === 1
                            ? "text-green-400"
                            : rank.rank === 2
                              ? "text-yellow-400"
                              : "text-zinc-500"
                        }`}
                      >
                        #{rank.rank} ({rank.score})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evolution Log */}
      {rounds.evolutionLog.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-zinc-400 mb-3">
            Strategy Evolutions
          </h4>
          <div className="space-y-2">
            {rounds.evolutionLog.map((ev, i) => (
              <div key={i} className="flex gap-3 text-sm items-start">
                <div className="text-zinc-600 w-16 flex-shrink-0">
                  Round {ev.round}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-medium"
                      style={{ color: getPartyColor(ev.partyName) }}
                    >
                      {ev.partyName}
                    </span>
                    <span className="text-zinc-500">adapted:</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-zinc-400 line-through">
                      {ev.previousApproach}
                    </span>
                    <span className="text-zinc-600">-&gt;</span>
                    <span className="text-green-400">{ev.newApproach}</span>
                  </div>
                  <div className="text-xs text-zinc-600 mt-1 italic">
                    {ev.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {rounds.insights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-400 mb-3">
            Insights Discovered
          </h4>
          <div className="space-y-2">
            {rounds.insights.map((ins, i) => (
              <div
                key={i}
                className="flex gap-2 text-sm bg-zinc-800/30 p-3 rounded"
              >
                <span className="text-yellow-400 flex-shrink-0">*</span>
                <div className="flex-1">
                  <span className="text-zinc-300">{ins.insight}</span>
                  <span className="text-xs text-zinc-600 ml-2">
                    (Round {ins.round})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current party personalities */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <h4 className="text-sm font-medium text-zinc-400 mb-3">
          Current Party Strategies
        </h4>
        <div className="grid gap-2">
          {scenario.parties.map((party, i) => (
            <div
              key={party.name}
              className="flex items-center gap-3 text-sm"
              style={{
                borderLeft: `3px solid ${PARTY_COLORS[i % PARTY_COLORS.length]}`,
                paddingLeft: "12px",
              }}
            >
              <span className="text-white font-medium w-24 flex-shrink-0">
                {party.name}
              </span>
              {party.personality ? (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded">
                    {party.personality.negotiationStyle}
                  </span>
                  <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded">
                    {party.personality.communicationTone}
                  </span>
                  {party.currentGeneration !== undefined &&
                    party.currentGeneration > 0 && (
                      <span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded">
                        Gen {party.currentGeneration}
                      </span>
                    )}
                </div>
              ) : (
                <span className="text-zinc-500">No personality data</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

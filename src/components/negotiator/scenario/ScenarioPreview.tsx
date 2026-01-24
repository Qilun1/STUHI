import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft } from "@phosphor-icons/react";

const PARTY_COLORS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
];

interface ScenarioPreviewProps {
  scenarioId: Id<"scenarios">;
  onStartNegotiation: () => void;
  onBack: () => void;
}

export function ScenarioPreview({
  scenarioId,
  onStartNegotiation,
  onBack,
}: ScenarioPreviewProps) {
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="text-zinc-500">Loading scenario...</div>
      </div>
    );
  }

  if (scenario.status === "researching") {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="text-white mb-2">Still researching...</div>
        <div className="text-zinc-500 text-sm">{scenario.statusMessage}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to setup
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">
          {scenario.title || scenario.sourceQuery}
        </h1>
        <p className="text-zinc-400 text-lg">{scenario.description}</p>
      </div>

      {/* Key Facts */}
      {scenario.keyFacts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Key Facts
          </h2>
          <div className="bg-zinc-900 rounded-lg p-4">
            <ul className="space-y-2">
              {scenario.keyFacts.slice(0, 6).map((fact, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      fact.confidence === "high"
                        ? "bg-green-900/50 text-green-400"
                        : fact.confidence === "medium"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {fact.confidence}
                  </span>
                  <span className="text-zinc-300 text-sm flex-1">
                    {fact.fact}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Parties */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
          Negotiating Parties ({scenario.parties.length})
        </h2>
        <div className={`grid gap-4 ${scenario.parties.length <= 2 ? "md:grid-cols-2" : scenario.parties.length <= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
          {scenario.parties.map((party, i) => (
            <div
              key={i}
              className="bg-zinc-900 rounded-lg p-4"
              style={{ borderLeft: `4px solid ${PARTY_COLORS[i % PARTY_COLORS.length]}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PARTY_COLORS[i % PARTY_COLORS.length] }}
                />
                <span className="font-bold text-white">{party.name}</span>
                <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                  Power: {party.powerLevel}/10
                </span>
              </div>

              <div className="text-sm text-zinc-400 mb-3">{party.representative}</div>

              {/* Personality badges */}
              {party.personality && (
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">
                    {party.personality.negotiationStyle}
                  </span>
                  <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                    {party.personality.communicationTone}
                  </span>
                  <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded">
                    {party.personality.riskTolerance} risk
                  </span>
                </div>
              )}

              {/* Key traits */}
              {party.personality?.keyTraits && party.personality.keyTraits.length > 0 && (
                <>
                  <div className="text-xs text-zinc-500 mb-1">Key Traits:</div>
                  <div className="text-sm text-zinc-300 mb-3">
                    {party.personality.keyTraits.join(" • ")}
                  </div>
                </>
              )}

              {/* Public Position */}
              <div className="mb-3">
                <p className="text-sm text-zinc-400 italic line-clamp-2">
                  "{party.publicPosition}"
                </p>
              </div>

              {/* Interests - collapsed for multi-party */}
              <div className="mb-3">
                <h4 className="text-xs font-medium text-zinc-500 uppercase mb-1.5">
                  Interests
                </h4>
                <ul className="space-y-1">
                  {party.interests.slice(0, scenario.parties.length > 2 ? 2 : 4).map((interest, j) => (
                    <li
                      key={j}
                      className="text-sm text-zinc-300 flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-zinc-600" />
                      <span className="line-clamp-1">{interest}</span>
                    </li>
                  ))}
                  {party.interests.length > (scenario.parties.length > 2 ? 2 : 4) && (
                    <li className="text-xs text-zinc-500">
                      +{party.interests.length - (scenario.parties.length > 2 ? 2 : 4)} more...
                    </li>
                  )}
                </ul>
              </div>

              {/* Red Lines */}
              <div className="mb-3">
                <h4 className="text-xs font-medium text-red-500/70 uppercase mb-1.5">
                  Red Lines
                </h4>
                <ul className="space-y-1">
                  {party.redLines.slice(0, 2).map((line, j) => (
                    <li
                      key={j}
                      className="text-sm text-red-400/80 flex items-center gap-2"
                    >
                      <span className="w-1 h-1 rounded-full bg-red-500" />
                      <span className="line-clamp-1">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Relationships - only for multi-party */}
              {scenario.parties.length > 2 && (party.potentialAllies?.length || party.rivals?.length) ? (
                <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                  {party.potentialAllies?.length ? (
                    <div>Allies: {party.potentialAllies.join(", ")}</div>
                  ) : null}
                  {party.rivals?.length ? (
                    <div className="text-red-400/60">Rivals: {party.rivals.join(", ")}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Possible Outcomes */}
      {scenario.possibleOutcomes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
            Possible Outcomes
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {scenario.possibleOutcomes.slice(0, 6).map((outcome, i) => (
              <div key={i} className="bg-zinc-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white text-sm">
                    {outcome.name}
                  </h3>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      outcome.likelihood === "high"
                        ? "bg-green-900/50 text-green-400"
                        : outcome.likelihood === "medium"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {outcome.likelihood}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
                  {outcome.description}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400">{outcome.partyAScore}</span>
                    <span className="text-zinc-600">A</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">{outcome.partyBScore}</span>
                    <span className="text-zinc-600">B</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onStartNegotiation}
          className="flex-1 bg-green-600 hover:bg-green-500 py-4 rounded-lg text-white font-bold text-lg transition-colors"
        >
          {scenario.parties.length > 2
            ? "Start Multi-Party Negotiation"
            : "Configure & Start Negotiations"
          }
        </button>
      </div>

      {/* Info about personalities */}
      {scenario.parties.some(p => p.personality) && (
        <div className="mt-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="text-sm text-zinc-400">
            <strong className="text-white">Personality-Based Negotiation:</strong> Each party will negotiate
            based on their researched personality traits. After each round, losing parties will adapt their
            strategies and evolve their approach.
          </div>
        </div>
      )}
    </div>
  );
}

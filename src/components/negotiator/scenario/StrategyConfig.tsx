import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { STRATEGIES } from "../../../../convex/negotiations/strategies";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft } from "@phosphor-icons/react";

interface StrategyConfigProps {
  scenarioId: Id<"scenarios">;
  onStart: (partyAStrategy: string, partyBStrategy: string) => void;
  onBack: () => void;
}

export function StrategyConfig({
  scenarioId,
  onStart,
  onBack,
}: StrategyConfigProps) {
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });
  const [partyAStrategy, setPartyAStrategy] = useState("cooperative");
  const [partyBStrategy, setPartyBStrategy] = useState("aggressive");
  const [showDescriptions, setShowDescriptions] = useState(true);

  if (!scenario) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  const partyA = scenario.parties[0];
  const partyB = scenario.parties[1];

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to preview
        </button>

        <h1 className="text-2xl font-bold text-white mb-2">
          Configure Strategies
        </h1>
        <p className="text-zinc-400">
          Choose negotiation strategies for each party
        </p>
      </div>

      {/* Strategy Selection */}
      <div className="space-y-6 mb-8">
        {/* Party A */}
        <div className="bg-zinc-900 rounded-lg p-5 border-l-4 border-blue-500">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">{partyA?.name}</h3>
            <p className="text-sm text-zinc-500">{partyA?.representative}</p>
          </div>

          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Strategy
          </label>
          <select
            value={partyAStrategy}
            onChange={(e) => setPartyAStrategy(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
          >
            {STRATEGIES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.label}
              </option>
            ))}
          </select>

          {showDescriptions && (
            <p className="mt-2 text-sm text-zinc-500">
              {STRATEGIES.find((s) => s.name === partyAStrategy)?.description}
            </p>
          )}
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-500 font-bold">VS</span>
          </div>
        </div>

        {/* Party B */}
        <div className="bg-zinc-900 rounded-lg p-5 border-l-4 border-green-500">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">{partyB?.name}</h3>
            <p className="text-sm text-zinc-500">{partyB?.representative}</p>
          </div>

          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Strategy
          </label>
          <select
            value={partyBStrategy}
            onChange={(e) => setPartyBStrategy(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"
          >
            {STRATEGIES.map((s) => (
              <option key={s.name} value={s.name}>
                {s.label}
              </option>
            ))}
          </select>

          {showDescriptions && (
            <p className="mt-2 text-sm text-zinc-500">
              {STRATEGIES.find((s) => s.name === partyBStrategy)?.description}
            </p>
          )}
        </div>
      </div>

      {/* Strategy Guide */}
      <div className="mb-8">
        <button
          onClick={() => setShowDescriptions(!showDescriptions)}
          className="text-sm text-zinc-500 hover:text-zinc-400 mb-3"
        >
          {showDescriptions ? "Hide" : "Show"} strategy descriptions
        </button>

        {showDescriptions && (
          <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
            <h4 className="text-xs font-medium text-zinc-500 uppercase mb-3">
              Strategy Reference
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {STRATEGIES.map((s) => (
                <div
                  key={s.name}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="font-medium text-white w-24 flex-shrink-0">
                    {s.label}
                  </span>
                  <span className="text-zinc-500">{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onStart(partyAStrategy, partyBStrategy)}
          className="flex-1 bg-green-600 hover:bg-green-500 py-4 rounded-lg text-white font-bold text-lg transition-colors"
        >
          Run Negotiation
        </button>
      </div>
    </div>
  );
}

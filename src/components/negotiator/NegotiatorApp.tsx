import { useState, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Handshake } from "@phosphor-icons/react";
import { ScenarioSetup } from "./scenario/ScenarioSetup";
import { ScenarioPreview } from "./scenario/ScenarioPreview";
import { StrategyConfig } from "./scenario/StrategyConfig";
import { NegotiationView } from "./negotiation/NegotiationView";
import { MultiPartyView } from "./negotiation/MultiPartyView";
import { RoundTracker } from "./evolution/RoundTracker";
import { AnalysisView } from "./analysis/AnalysisView";
import type { Id } from "../../../convex/_generated/dataModel";

type Phase =
  | "setup"
  | "preview"
  | "configure"
  | "negotiation"
  | "multiparty"
  | "evolution"
  | "analysis";

export function NegotiatorApp() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [scenarioId, setScenarioId] = useState<Id<"scenarios"> | null>(null);
  const [negotiationId, setNegotiationId] = useState<Id<"negotiations"> | null>(
    null
  );
  const [currentRound, setCurrentRound] = useState(1);

  const runNegotiation = useAction(api.negotiations.engine.runNegotiation);
  const runMultiParty = useAction(
    api.negotiations.multiPartyEngine.runMultiPartyNegotiation
  );
  const runSingleRound = useAction(api.evolution.roundRunner.runSingleRound);

  // Get scenario to check party count
  const scenario = useQuery(
    api.scenarios.queries.get,
    scenarioId ? { id: scenarioId } : "skip"
  );

  const isMultiParty = scenario && scenario.parties.length > 2;
  const hasPersonalities = scenario?.parties.some((p) => p.personality);

  const handleScenarioCreated = useCallback((id: Id<"scenarios">) => {
    setScenarioId(id);
    setPhase("preview");
  }, []);

  const handleStartNegotiation = useCallback(
    async (partyAStrategy: string, partyBStrategy: string) => {
      if (!scenarioId) return;

      setPhase("negotiation");

      try {
        const id = await runNegotiation({
          scenarioId,
          partyAStrategy,
          partyBStrategy,
        });
        setNegotiationId(id);
      } catch (error) {
        console.error("Failed to run negotiation:", error);
        setPhase("configure");
      }
    },
    [scenarioId, runNegotiation]
  );

  const handleStartMultiParty = useCallback(async () => {
    if (!scenarioId) return;

    setPhase("multiparty");
    setCurrentRound(1);

    try {
      const id = await runMultiParty({ scenarioId, roundNumber: 1 });
      setNegotiationId(id);
    } catch (error) {
      console.error("Failed to run multi-party negotiation:", error);
      setPhase("preview");
    }
  }, [scenarioId, runMultiParty]);

  const handleRunEvolutionRound = useCallback(async () => {
    if (!scenarioId) return;

    try {
      const result = await runSingleRound({
        scenarioId,
        roundNumber: currentRound,
        shouldEvolve: true,
      });

      if (result.negotiationId) {
        setNegotiationId(result.negotiationId);
      }
      setCurrentRound((r) => r + 1);
    } catch (error) {
      console.error("Failed to run evolution round:", error);
    }
  }, [scenarioId, currentRound, runSingleRound]);

  const handleReset = useCallback(() => {
    setPhase("setup");
    setScenarioId(null);
    setNegotiationId(null);
    setCurrentRound(1);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Handshake className="size-5 text-cyan-400" weight="duotone" />
            <h1 className="text-base font-bold text-white tracking-tight">
              Negotiation Sim
            </h1>
          </button>

          <div className="flex items-center gap-4">
            {/* Phase Indicator */}
            <div className="flex items-center gap-1">
              {(["setup", "preview", "configure", "negotiation", "analysis"] as Phase[]).map(
                (p, i) => (
                  <div
                    key={p}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      p === phase
                        ? "bg-blue-500"
                        : (["setup", "preview", "configure", "negotiation", "analysis"] as Phase[]).indexOf(phase) > i
                          ? "bg-zinc-600"
                          : "bg-zinc-800"
                    }`}
                  />
                )
              )}
            </div>

            {phase !== "setup" && (
              <button
                onClick={handleReset}
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                New Scenario
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="py-4">
        {phase === "setup" && (
          <ScenarioSetup onScenarioCreated={handleScenarioCreated} />
        )}

        {phase === "preview" && scenarioId && (
          <ScenarioPreview
            scenarioId={scenarioId}
            onStartNegotiation={() => {
              // For multi-party or personality-based, go directly to negotiation
              if (isMultiParty || hasPersonalities) {
                handleStartMultiParty();
              } else {
                setPhase("configure");
              }
            }}
            onBack={handleReset}
          />
        )}

        {phase === "configure" && scenarioId && (
          <StrategyConfig
            scenarioId={scenarioId}
            onStart={handleStartNegotiation}
            onBack={() => setPhase("preview")}
          />
        )}

        {phase === "negotiation" && negotiationId && scenarioId && (
          <NegotiationView
            negotiationId={negotiationId}
            scenarioId={scenarioId}
            onComplete={() => setPhase("analysis")}
            onBack={() => setPhase("configure")}
          />
        )}

        {phase === "multiparty" && negotiationId && scenarioId && (
          <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto p-4">
            <div className="lg:col-span-2">
              <MultiPartyView
                negotiationId={negotiationId}
                scenarioId={scenarioId}
                onComplete={() => setPhase("evolution")}
              />
            </div>
            <div className="lg:col-span-1">
              <RoundTracker
                scenarioId={scenarioId}
                onRoundClick={(round, negId) => {
                  setNegotiationId(negId);
                  setCurrentRound(round);
                }}
              />
            </div>
          </div>
        )}

        {phase === "evolution" && scenarioId && (
          <div className="max-w-4xl mx-auto p-8">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              Round {currentRound} Complete
            </h2>

            <RoundTracker
              scenarioId={scenarioId}
              onRoundClick={(round, negId) => {
                setNegotiationId(negId);
                setCurrentRound(round);
                setPhase("multiparty");
              }}
            />

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleRunEvolutionRound}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-lg text-white font-bold transition-colors"
              >
                Run Next Round (Evolution)
              </button>
              <button
                onClick={() => setPhase("analysis")}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-4 rounded-lg text-white font-medium transition-colors"
              >
                View Analysis
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 py-3 rounded-lg text-zinc-400 font-medium transition-colors"
            >
              New Scenario
            </button>
          </div>
        )}

        {phase === "analysis" && scenarioId && (
          <AnalysisView
            scenarioId={scenarioId}
            onBack={() => setPhase(isMultiParty ? "evolution" : "negotiation")}
            onNewScenario={handleReset}
          />
        )}
      </main>
    </div>
  );
}

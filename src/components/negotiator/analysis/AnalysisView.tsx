import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { STRATEGIES } from "../../../../convex/negotiations/strategies";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeft, Flask, GearSix, Trophy } from "@phosphor-icons/react";

interface AnalysisViewProps {
  scenarioId: Id<"scenarios">;
  onBack: () => void;
  onNewScenario: () => void;
}

export function AnalysisView({
  scenarioId,
  onBack,
  onNewScenario,
}: AnalysisViewProps) {
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });
  const rankings = useQuery(api.simulation.strategyQueries.getStrategyRankings, {
    scenarioId,
  });
  const matrixData = useQuery(api.simulation.strategyQueries.getMatchupMatrix, {
    scenarioId,
  });
  const summary = useQuery(api.simulation.strategyQueries.getSummary, { scenarioId });
  const negotiations = useQuery(api.negotiations.queries.getByScenario, {
    scenarioId,
  });

  const runDiscovery = useAction(api.simulation.strategyRunner.runStrategyDiscovery);
  const runQuick = useAction(api.simulation.strategyRunner.runQuickAnalysis);

  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState("");

  const handleRunDiscovery = async (runsPerMatchup: number) => {
    setIsRunning(true);
    setRunProgress(
      `Running ${runsPerMatchup * 25} simulations (${runsPerMatchup} per matchup)...`
    );
    try {
      await runDiscovery({ scenarioId, runsPerMatchup });
    } catch (error) {
      console.error("Discovery failed:", error);
    }
    setIsRunning(false);
    setRunProgress("");
  };

  const handleQuickRun = async () => {
    setIsRunning(true);
    setRunProgress("Running quick analysis (25 simulations)...");
    try {
      await runQuick({ scenarioId });
    } catch (error) {
      console.error("Quick analysis failed:", error);
    }
    setIsRunning(false);
    setRunProgress("");
  };

  if (!scenario) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  const hasResults = rankings && rankings.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="text-zinc-500 hover:text-white text-sm mb-4 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to negotiation
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Strategy Analysis
            </h1>
            <p className="text-zinc-400">{scenario.title}</p>
          </div>

          {summary && (
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {summary.totalSimulations}
              </div>
              <div className="text-xs text-zinc-500">Total Simulations</div>
            </div>
          )}
        </div>
      </div>

      {/* Run Simulations */}
      {!hasResults && !isRunning && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 mb-8 text-center shadow-card">
          <Flask className="size-12 mx-auto mb-4 text-cyan-400" weight="duotone" />
          <h2 className="text-xl font-bold text-white mb-2">
            Run Strategy Discovery
          </h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Test all 25 strategy combinations to discover which approaches work
            best for this scenario.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleQuickRun}
              className="bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-lg text-white font-medium transition-colors"
            >
              Quick (25 runs)
            </button>
            <button
              onClick={() => handleRunDiscovery(3)}
              className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg text-white font-medium transition-colors"
            >
              Standard (75 runs)
            </button>
            <button
              onClick={() => handleRunDiscovery(5)}
              className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg text-white font-medium transition-colors"
            >
              Thorough (125 runs)
            </button>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 mb-8 text-center shadow-card">
          <GearSix className="size-12 mx-auto mb-4 text-cyan-400 animate-spin" weight="duotone" />
          <h2 className="text-xl font-bold text-white mb-2">
            Running Simulations
          </h2>
          <p className="text-zinc-400">{runProgress}</p>
          <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden max-w-md mx-auto">
            <div className="h-full bg-blue-600 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {hasResults && (
        <>
          {/* Best Strategy Highlight */}
          {scenario.optimalStrategy && (
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-xl p-6 mb-8 shadow-lg shadow-green-500/5">
              <div className="flex items-center gap-4">
                <Trophy className="size-12 text-yellow-400 flex-shrink-0" weight="fill" />
                <div className="flex-1">
                  <div className="text-xs text-green-400 uppercase font-medium mb-1">
                    Optimal Strategy
                  </div>
                  <div className="text-2xl font-bold text-white capitalize">
                    {STRATEGIES.find((s) => s.name === scenario.optimalStrategy)
                      ?.label || scenario.optimalStrategy}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {
                      STRATEGIES.find((s) => s.name === scenario.optimalStrategy)
                        ?.description
                    }
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-400">
                    {rankings[0] && Math.round(rankings[0].winRate * 100)}%
                  </div>
                  <div className="text-xs text-zinc-500">Win Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Strategy Rankings */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Rankings Table */}
            <div className="bg-zinc-900 rounded-lg p-5">
              <h3 className="text-sm font-medium text-zinc-500 uppercase mb-4">
                Strategy Rankings
              </h3>
              <div className="space-y-3">
                {rankings.map((rank, i) => (
                  <div
                    key={rank.strategy}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0
                          ? "bg-yellow-500/20 text-yellow-400"
                          : i === 1
                            ? "bg-zinc-400/20 text-zinc-300"
                            : i === 2
                              ? "bg-orange-700/20 text-orange-400"
                              : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium capitalize">
                        {STRATEGIES.find((s) => s.name === rank.strategy)
                          ?.label || rank.strategy}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono text-white">
                        {Math.round(rank.winRate * 100)}%
                      </div>
                      <div className="text-xs text-zinc-600">
                        avg {rank.avgScore}
                      </div>
                    </div>
                    <div className="w-20">
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${rank.winRate * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-zinc-900 rounded-lg p-5">
              <h3 className="text-sm font-medium text-zinc-500 uppercase mb-4">
                Outcome Summary
              </h3>
              {summary && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {summary.totalDeals}
                      </div>
                      <div className="text-xs text-zinc-500">Deals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-zinc-400">
                        {summary.totalWalkaways}
                      </div>
                      <div className="text-xs text-zinc-500">Walkaways</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {summary.totalTimeouts}
                      </div>
                      <div className="text-xs text-zinc-500">Timeouts</div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Deal Rate</span>
                      <span className="text-sm font-mono text-white">
                        {Math.round(summary.dealRate * 100)}%
                      </span>
                    </div>
                    <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${summary.dealRate * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Matchup Matrix */}
          {matrixData && (
            <div className="bg-zinc-900 rounded-lg p-5 mb-8">
              <h3 className="text-sm font-medium text-zinc-500 uppercase mb-4">
                Strategy Matchup Matrix
              </h3>
              <p className="text-xs text-zinc-600 mb-4">
                Party A (row) vs Party B (column) - showing Party A's average
                score
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-zinc-500 font-medium p-2">
                        A \ B
                      </th>
                      {matrixData.strategies.map((s) => (
                        <th
                          key={s}
                          className="text-center text-zinc-500 font-medium p-2 capitalize"
                        >
                          {s.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.strategies.map((stratA) => (
                      <tr key={stratA}>
                        <td className="text-zinc-400 font-medium p-2 capitalize">
                          {stratA.slice(0, 3)}
                        </td>
                        {matrixData.strategies.map((stratB) => {
                          const cell = matrixData.matrix[stratA]?.[stratB];
                          if (!cell || cell.runs === 0) {
                            return (
                              <td
                                key={stratB}
                                className="text-center p-2 text-zinc-700"
                              >
                                -
                              </td>
                            );
                          }
                          const score = cell.aScore;
                          const bgColor =
                            score >= 60
                              ? "bg-green-900/30"
                              : score >= 40
                                ? "bg-yellow-900/30"
                                : "bg-red-900/30";
                          return (
                            <td
                              key={stratB}
                              className={`text-center p-2 ${bgColor} text-white font-mono text-xs`}
                            >
                              {score}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Negotiations */}
          {negotiations && negotiations.length > 0 && (
            <div className="bg-zinc-900 rounded-lg p-5">
              <h3 className="text-sm font-medium text-zinc-500 uppercase mb-4">
                Recent Negotiations
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {negotiations.slice(0, 20).map((n) => (
                  <div
                    key={n._id}
                    className="flex items-center gap-3 p-2 rounded bg-zinc-800/50"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        n.outcome?.type === "deal"
                          ? "bg-green-500"
                          : n.outcome?.type === "walkaway"
                            ? "bg-zinc-500"
                            : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-xs text-zinc-400 capitalize">
                      {n.partyAStrategy}
                    </span>
                    <span className="text-xs text-zinc-600">vs</span>
                    <span className="text-xs text-zinc-400 capitalize">
                      {n.partyBStrategy}
                    </span>
                    <span className="flex-1" />
                    {n.outcome && (
                      <>
                        <span className="text-xs font-mono text-blue-400">
                          {n.outcome.partyAScore}
                        </span>
                        <span className="text-xs text-zinc-600">-</span>
                        <span className="text-xs font-mono text-green-400">
                          {n.outcome.partyBScore}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run More Button */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleQuickRun}
              disabled={isRunning}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 py-3 rounded-lg text-white font-medium transition-colors"
            >
              Run 25 More Simulations
            </button>
            <button
              onClick={onNewScenario}
              className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg text-white font-medium transition-colors"
            >
              New Scenario
            </button>
          </div>
        </>
      )}
    </div>
  );
}

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { STRATEGIES, getStrategyNames } from "../negotiations/strategies";
import { Doc, Id } from "../_generated/dataModel";

// Types for analysis
interface MatchupResult {
  stratA: string;
  stratB: string;
  outcome: {
    type: string;
    partyAScore: number;
    partyBScore: number;
  } | null;
  turnsUsed: number;
  tactics: string[];
}

interface StrategyStats {
  strategy: string;
  asPartyA: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    avgScore: number;
    totalScore: number;
  };
  asPartyB: {
    wins: number;
    losses: number;
    draws: number;
    total: number;
    avgScore: number;
    totalScore: number;
  };
  overall: {
    winRate: number;
    avgScore: number;
    totalGames: number;
  };
}

interface MatchupStats {
  strategyA: string;
  strategyB: string;
  runsCompleted: number;
  partyAWins: number;
  partyBWins: number;
  mutualGains: number;
  failures: number;
  avgPartyAScore: number;
  avgPartyBScore: number;
  avgTurnsToResolve: number;
  effectiveTactics: Array<{ tactic: string; successRate: number }>;
}

// Run full strategy discovery - tests all strategy combinations
export const runStrategyDiscovery = action({
  args: {
    scenarioId: v.id("scenarios"),
    runsPerMatchup: v.number(),
  },
  handler: async (ctx, { scenarioId, runsPerMatchup }) => {
    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: scenarioId,
    });

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    if (scenario.status !== "ready") {
      throw new Error("Scenario must be ready before running simulations");
    }

    const strategies = getStrategyNames();
    const results: MatchupResult[] = [];
    let runNumber = 0;

    // Test all 5x5 = 25 strategy combinations
    for (const stratA of strategies) {
      for (const stratB of strategies) {
        for (let i = 0; i < runsPerMatchup; i++) {
          runNumber++;

          try {
            // Run the negotiation
            const negotiationId = await ctx.runAction(
              api.negotiations.engine.runNegotiation,
              {
                scenarioId,
                partyAStrategy: stratA,
                partyBStrategy: stratB,
                runNumber,
              }
            );

            // Get the completed negotiation
            const negotiation = await ctx.runQuery(api.negotiations.queries.get, {
              id: negotiationId,
            });

            // Get moves to extract tactics
            const moves = await ctx.runQuery(api.negotiations.queries.getMoves, {
              negotiationId,
            });

            const tactics = moves.map((m: Doc<"negotiationMoves">) => m.tacticUsed);

            results.push({
              stratA,
              stratB,
              outcome: negotiation?.outcome
                ? {
                    type: negotiation.outcome.type,
                    partyAScore: negotiation.outcome.partyAScore,
                    partyBScore: negotiation.outcome.partyBScore,
                  }
                : null,
              turnsUsed: negotiation?.currentTurn ?? 0,
              tactics,
            });
          } catch (error) {
            console.error(`Run ${runNumber} failed:`, error);
            results.push({
              stratA,
              stratB,
              outcome: null,
              turnsUsed: 0,
              tactics: [],
            });
          }
        }
      }
    }

    // Aggregate results by matchup
    const matchupStats = aggregateByMatchup(results);

    // Save to strategyResults table
    for (const stats of matchupStats) {
      await ctx.runMutation(internal.simulation.strategyMutations.upsertStrategyResult, {
        scenarioId,
        ...stats,
      });
    }

    // Analyze overall strategy performance
    const strategyRankings = analyzeStrategies(results);

    // Find the best strategy
    const bestStrategy = strategyRankings[0]?.strategy ?? "cooperative";

    // Update scenario with findings
    await ctx.runMutation(internal.simulation.strategyMutations.updateScenarioAnalytics, {
      scenarioId,
      optimalStrategy: bestStrategy,
      totalSimulations: runNumber,
    });

    return {
      totalRuns: runNumber,
      matchupStats,
      strategyRankings,
      bestStrategy,
    };
  },
});

// Run a quick analysis with fewer runs per matchup
export const runQuickAnalysis = action({
  args: {
    scenarioId: v.id("scenarios"),
  },
  handler: async (ctx, { scenarioId }): Promise<{
    totalRuns: number;
    matchupStats: MatchupStats[];
    strategyRankings: StrategyStats[];
    bestStrategy: string;
  }> => {
    // Inline the logic instead of calling runStrategyDiscovery to avoid circular reference
    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: scenarioId,
    });

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    if (scenario.status !== "ready" && scenario.status !== "completed") {
      throw new Error("Scenario must be ready before running simulations");
    }

    const strategies = getStrategyNames();
    const results: MatchupResult[] = [];
    let runNumber = 0;
    const runsPerMatchup = 1;

    // Test all 5x5 = 25 strategy combinations
    for (const stratA of strategies) {
      for (const stratB of strategies) {
        for (let i = 0; i < runsPerMatchup; i++) {
          runNumber++;

          try {
            const negotiationId = await ctx.runAction(
              api.negotiations.engine.runNegotiation,
              {
                scenarioId,
                partyAStrategy: stratA,
                partyBStrategy: stratB,
                runNumber,
              }
            );

            const negotiation = await ctx.runQuery(api.negotiations.queries.get, {
              id: negotiationId,
            });

            const moves = await ctx.runQuery(api.negotiations.queries.getMoves, {
              negotiationId,
            });

            const tactics = moves.map((m: Doc<"negotiationMoves">) => m.tacticUsed);

            results.push({
              stratA,
              stratB,
              outcome: negotiation?.outcome
                ? {
                    type: negotiation.outcome.type,
                    partyAScore: negotiation.outcome.partyAScore,
                    partyBScore: negotiation.outcome.partyBScore,
                  }
                : null,
              turnsUsed: negotiation?.currentTurn ?? 0,
              tactics,
            });
          } catch (error) {
            console.error(`Run ${runNumber} failed:`, error);
            results.push({
              stratA,
              stratB,
              outcome: null,
              turnsUsed: 0,
              tactics: [],
            });
          }
        }
      }
    }

    const matchupStats = aggregateByMatchup(results);

    for (const stats of matchupStats) {
      await ctx.runMutation(internal.simulation.strategyMutations.upsertStrategyResult, {
        scenarioId,
        ...stats,
      });
    }

    const strategyRankings = analyzeStrategies(results);
    const bestStrategy = strategyRankings[0]?.strategy ?? "cooperative";

    await ctx.runMutation(internal.simulation.strategyMutations.updateScenarioAnalytics, {
      scenarioId,
      optimalStrategy: bestStrategy,
      totalSimulations: runNumber,
    });

    return {
      totalRuns: runNumber,
      matchupStats,
      strategyRankings,
      bestStrategy,
    };
  },
});

// Aggregate results by strategy matchup
function aggregateByMatchup(results: MatchupResult[]): MatchupStats[] {
  const matchups = new Map<string, MatchupResult[]>();

  // Group by matchup
  for (const r of results) {
    const key = `${r.stratA}:${r.stratB}`;
    if (!matchups.has(key)) {
      matchups.set(key, []);
    }
    matchups.get(key)!.push(r);
  }

  // Calculate stats for each matchup
  const stats: MatchupStats[] = [];

  for (const [key, matchupResults] of matchups) {
    const [strategyA, strategyB] = key.split(":");

    let partyAWins = 0;
    let partyBWins = 0;
    let mutualGains = 0;
    let failures = 0;
    let totalAScore = 0;
    let totalBScore = 0;
    let totalTurns = 0;
    let scoredCount = 0;

    const tacticCounts = new Map<string, { total: number; successful: number }>();

    for (const r of matchupResults) {
      if (!r.outcome) {
        failures++;
        continue;
      }

      const scoreA = r.outcome.partyAScore;
      const scoreB = r.outcome.partyBScore;

      if (scoreA > scoreB) {
        partyAWins++;
      } else if (scoreB > scoreA) {
        partyBWins++;
      } else if (r.outcome.type === "deal" && scoreA >= 50 && scoreB >= 50) {
        mutualGains++;
      }

      if (r.outcome.type === "walkaway" || r.outcome.type === "timeout") {
        failures++;
      }

      totalAScore += scoreA;
      totalBScore += scoreB;
      totalTurns += r.turnsUsed;
      scoredCount++;

      // Track tactic effectiveness
      const isSuccess = r.outcome.type === "deal" && scoreA >= 50;
      for (const tactic of r.tactics) {
        if (!tacticCounts.has(tactic)) {
          tacticCounts.set(tactic, { total: 0, successful: 0 });
        }
        const tc = tacticCounts.get(tactic)!;
        tc.total++;
        if (isSuccess) tc.successful++;
      }
    }

    // Calculate effective tactics
    const effectiveTactics = Array.from(tacticCounts.entries())
      .map(([tactic, counts]) => ({
        tactic,
        successRate: counts.total > 0 ? counts.successful / counts.total : 0,
      }))
      .filter((t) => t.successRate > 0.5)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    stats.push({
      strategyA,
      strategyB,
      runsCompleted: matchupResults.length,
      partyAWins,
      partyBWins,
      mutualGains,
      failures,
      avgPartyAScore: scoredCount > 0 ? Math.round(totalAScore / scoredCount) : 0,
      avgPartyBScore: scoredCount > 0 ? Math.round(totalBScore / scoredCount) : 0,
      avgTurnsToResolve: scoredCount > 0 ? Math.round(totalTurns / scoredCount) : 0,
      effectiveTactics,
    });
  }

  return stats;
}

// Analyze overall strategy performance
function analyzeStrategies(results: MatchupResult[]): StrategyStats[] {
  const strategies = getStrategyNames();
  const statsMap = new Map<string, StrategyStats>();

  // Initialize stats for each strategy
  for (const strategy of strategies) {
    statsMap.set(strategy, {
      strategy,
      asPartyA: {
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
        avgScore: 0,
        totalScore: 0,
      },
      asPartyB: {
        wins: 0,
        losses: 0,
        draws: 0,
        total: 0,
        avgScore: 0,
        totalScore: 0,
      },
      overall: {
        winRate: 0,
        avgScore: 0,
        totalGames: 0,
      },
    });
  }

  // Aggregate results
  for (const r of results) {
    if (!r.outcome) continue;

    const scoreA = r.outcome.partyAScore;
    const scoreB = r.outcome.partyBScore;

    // Update Party A stats
    const statsA = statsMap.get(r.stratA)!;
    statsA.asPartyA.total++;
    statsA.asPartyA.totalScore += scoreA;
    if (scoreA > scoreB) statsA.asPartyA.wins++;
    else if (scoreB > scoreA) statsA.asPartyA.losses++;
    else statsA.asPartyA.draws++;

    // Update Party B stats
    const statsB = statsMap.get(r.stratB)!;
    statsB.asPartyB.total++;
    statsB.asPartyB.totalScore += scoreB;
    if (scoreB > scoreA) statsB.asPartyB.wins++;
    else if (scoreA > scoreB) statsB.asPartyB.losses++;
    else statsB.asPartyB.draws++;
  }

  // Calculate averages and overall stats
  const rankings: StrategyStats[] = [];

  for (const stats of statsMap.values()) {
    if (stats.asPartyA.total > 0) {
      stats.asPartyA.avgScore = Math.round(
        stats.asPartyA.totalScore / stats.asPartyA.total
      );
    }
    if (stats.asPartyB.total > 0) {
      stats.asPartyB.avgScore = Math.round(
        stats.asPartyB.totalScore / stats.asPartyB.total
      );
    }

    const totalGames = stats.asPartyA.total + stats.asPartyB.total;
    const totalWins = stats.asPartyA.wins + stats.asPartyB.wins;
    const totalScore = stats.asPartyA.totalScore + stats.asPartyB.totalScore;

    stats.overall = {
      totalGames,
      winRate: totalGames > 0 ? totalWins / totalGames : 0,
      avgScore: totalGames > 0 ? Math.round(totalScore / totalGames) : 0,
    };

    rankings.push(stats);
  }

  // Sort by win rate, then by average score
  rankings.sort((a, b) => {
    if (Math.abs(a.overall.winRate - b.overall.winRate) > 0.01) {
      return b.overall.winRate - a.overall.winRate;
    }
    return b.overall.avgScore - a.overall.avgScore;
  });

  return rankings;
}

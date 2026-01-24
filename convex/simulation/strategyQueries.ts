import { query } from "../_generated/server";
import { v } from "convex/values";
import { getStrategyNames } from "../negotiations/strategies";

// Get all strategy results for a scenario
export const getResults = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    return await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();
  },
});

// Get strategy rankings for a scenario
export const getStrategyRankings = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    const results = await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    if (results.length === 0) return [];

    const strategies = getStrategyNames();
    const strategyStats = new Map<
      string,
      {
        strategy: string;
        totalGames: number;
        totalWins: number;
        totalScore: number;
        avgScore: number;
        winRate: number;
      }
    >();

    // Initialize stats
    for (const s of strategies) {
      strategyStats.set(s, {
        strategy: s,
        totalGames: 0,
        totalWins: 0,
        totalScore: 0,
        avgScore: 0,
        winRate: 0,
      });
    }

    // Aggregate from results
    for (const r of results) {
      // As Party A
      const statsA = strategyStats.get(r.strategyA);
      if (statsA) {
        statsA.totalGames += r.runsCompleted;
        statsA.totalWins += r.partyAWins;
        statsA.totalScore += r.avgPartyAScore * r.runsCompleted;
      }

      // As Party B
      const statsB = strategyStats.get(r.strategyB);
      if (statsB) {
        statsB.totalGames += r.runsCompleted;
        statsB.totalWins += r.partyBWins;
        statsB.totalScore += r.avgPartyBScore * r.runsCompleted;
      }
    }

    // Calculate averages and sort
    const rankings = Array.from(strategyStats.values())
      .map((s) => ({
        ...s,
        avgScore:
          s.totalGames > 0 ? Math.round(s.totalScore / s.totalGames) : 0,
        winRate: s.totalGames > 0 ? s.totalWins / s.totalGames : 0,
      }))
      .sort((a, b) => {
        if (Math.abs(a.winRate - b.winRate) > 0.01) {
          return b.winRate - a.winRate;
        }
        return b.avgScore - a.avgScore;
      });

    return rankings;
  },
});

// Get matchup matrix for visualization
export const getMatchupMatrix = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    const results = await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    const strategies = getStrategyNames();
    const matrix: Record<
      string,
      Record<string, { aScore: number; bScore: number; runs: number }>
    > = {};

    // Initialize matrix
    for (const a of strategies) {
      matrix[a] = {};
      for (const b of strategies) {
        matrix[a][b] = { aScore: 0, bScore: 0, runs: 0 };
      }
    }

    // Fill with results
    for (const r of results) {
      matrix[r.strategyA][r.strategyB] = {
        aScore: r.avgPartyAScore,
        bScore: r.avgPartyBScore,
        runs: r.runsCompleted,
      };
    }

    return { strategies, matrix };
  },
});

// Get best matchups for a specific strategy
export const getBestMatchups = query({
  args: {
    scenarioId: v.id("scenarios"),
    strategy: v.string(),
  },
  handler: async (ctx, { scenarioId, strategy }) => {
    const results = await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    const matchups: Array<{
      opponent: string;
      asPartyA: { avgScore: number; winRate: number } | null;
      asPartyB: { avgScore: number; winRate: number } | null;
    }> = [];

    const strategies = getStrategyNames();

    for (const opponent of strategies) {
      if (opponent === strategy) continue;

      // Find results where this strategy is Party A
      const asA = results.find(
        (r) => r.strategyA === strategy && r.strategyB === opponent
      );

      // Find results where this strategy is Party B
      const asB = results.find(
        (r) => r.strategyA === opponent && r.strategyB === strategy
      );

      matchups.push({
        opponent,
        asPartyA: asA
          ? {
              avgScore: asA.avgPartyAScore,
              winRate:
                asA.runsCompleted > 0
                  ? asA.partyAWins / asA.runsCompleted
                  : 0,
            }
          : null,
        asPartyB: asB
          ? {
              avgScore: asB.avgPartyBScore,
              winRate:
                asB.runsCompleted > 0
                  ? asB.partyBWins / asB.runsCompleted
                  : 0,
            }
          : null,
      });
    }

    return matchups;
  },
});

// Get simulation summary for a scenario
export const getSummary = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    const scenario = await ctx.db.get(scenarioId);
    if (!scenario) return null;

    const results = await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    let totalDeals = 0;
    let totalWalkaways = 0;
    let totalTimeouts = 0;

    for (const n of negotiations) {
      if (n.outcome?.type === "deal") totalDeals++;
      else if (n.outcome?.type === "walkaway") totalWalkaways++;
      else if (n.outcome?.type === "timeout") totalTimeouts++;
    }

    return {
      scenarioId,
      title: scenario.title,
      status: scenario.status,
      totalSimulations: scenario.totalSimulations ?? 0,
      optimalStrategy: scenario.optimalStrategy,
      matchupsCovered: results.length,
      totalDeals,
      totalWalkaways,
      totalTimeouts,
      dealRate: negotiations.length > 0 ? totalDeals / negotiations.length : 0,
    };
  },
});

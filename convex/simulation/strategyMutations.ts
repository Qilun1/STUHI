import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Upsert strategy result for a matchup
export const upsertStrategyResult = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    strategyA: v.string(),
    strategyB: v.string(),
    runsCompleted: v.number(),
    partyAWins: v.number(),
    partyBWins: v.number(),
    mutualGains: v.number(),
    failures: v.number(),
    avgPartyAScore: v.number(),
    avgPartyBScore: v.number(),
    avgTurnsToResolve: v.number(),
    effectiveTactics: v.array(
      v.object({
        tactic: v.string(),
        successRate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if result already exists for this matchup
    const existing = await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", args.scenarioId))
      .filter((q) =>
        q.and(
          q.eq(q.field("strategyA"), args.strategyA),
          q.eq(q.field("strategyB"), args.strategyB)
        )
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        runsCompleted: existing.runsCompleted + args.runsCompleted,
        partyAWins: existing.partyAWins + args.partyAWins,
        partyBWins: existing.partyBWins + args.partyBWins,
        mutualGains: existing.mutualGains + args.mutualGains,
        failures: existing.failures + args.failures,
        // Recalculate averages weighted by runs
        avgPartyAScore: Math.round(
          (existing.avgPartyAScore * existing.runsCompleted +
            args.avgPartyAScore * args.runsCompleted) /
            (existing.runsCompleted + args.runsCompleted)
        ),
        avgPartyBScore: Math.round(
          (existing.avgPartyBScore * existing.runsCompleted +
            args.avgPartyBScore * args.runsCompleted) /
            (existing.runsCompleted + args.runsCompleted)
        ),
        avgTurnsToResolve: Math.round(
          (existing.avgTurnsToResolve * existing.runsCompleted +
            args.avgTurnsToResolve * args.runsCompleted) /
            (existing.runsCompleted + args.runsCompleted)
        ),
        effectiveTactics: args.effectiveTactics, // Use latest tactics
      });
      return existing._id;
    } else {
      // Insert new
      return await ctx.db.insert("strategyResults", {
        scenarioId: args.scenarioId,
        strategyA: args.strategyA,
        strategyB: args.strategyB,
        runsCompleted: args.runsCompleted,
        partyAWins: args.partyAWins,
        partyBWins: args.partyBWins,
        mutualGains: args.mutualGains,
        failures: args.failures,
        avgPartyAScore: args.avgPartyAScore,
        avgPartyBScore: args.avgPartyBScore,
        avgTurnsToResolve: args.avgTurnsToResolve,
        effectiveTactics: args.effectiveTactics,
      });
    }
  },
});

// Update scenario with analytics after discovery
export const updateScenarioAnalytics = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    optimalStrategy: v.string(),
    totalSimulations: v.number(),
  },
  handler: async (ctx, { scenarioId, optimalStrategy, totalSimulations }) => {
    await ctx.db.patch(scenarioId, {
      optimalStrategy,
      totalSimulations,
      status: "completed",
      statusMessage: `Analysis complete: ${totalSimulations} simulations run`,
    });
  },
});

// Clear strategy results for a scenario (for re-running analysis)
export const clearResults = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
  },
  handler: async (ctx, { scenarioId }) => {
    const results = await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    // Reset scenario analytics
    await ctx.db.patch(scenarioId, {
      optimalStrategy: undefined,
      totalSimulations: undefined,
      status: "ready",
      statusMessage: "Ready for simulation",
    });
  },
});

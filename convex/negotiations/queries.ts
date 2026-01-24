import { query } from "../_generated/server";
import { v } from "convex/values";

// Get a single negotiation by ID
export const get = query({
  args: { id: v.id("negotiations") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get all moves for a negotiation in chronological order
export const getMoves = query({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, { negotiationId }) => {
    return await ctx.db
      .query("negotiationMoves")
      .withIndex("by_negotiation", (q) => q.eq("negotiationId", negotiationId))
      .order("asc")
      .collect();
  },
});

// Get all negotiations for a scenario
export const getByScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    return await ctx.db
      .query("negotiations")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .order("desc")
      .take(50);
  },
});

// Get active (non-resolved) negotiations
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("negotiations").order("desc").take(100);

    return all.filter(
      (n) => n.phase !== "resolved" && n.phase !== "failed"
    );
  },
});

// Get negotiations with specific strategy matchup
export const getByStrategies = query({
  args: {
    scenarioId: v.id("scenarios"),
    partyAStrategy: v.string(),
    partyBStrategy: v.string(),
  },
  handler: async (ctx, { scenarioId, partyAStrategy, partyBStrategy }) => {
    return await ctx.db
      .query("negotiations")
      .withIndex("by_scenario_and_strategies", (q) =>
        q
          .eq("scenarioId", scenarioId)
          .eq("partyAStrategy", partyAStrategy)
          .eq("partyBStrategy", partyBStrategy)
      )
      .order("desc")
      .take(20);
  },
});

// Get negotiation with full move history (combined query)
export const getWithMoves = query({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, { negotiationId }) => {
    const negotiation = await ctx.db.get(negotiationId);
    if (!negotiation) return null;

    const moves = await ctx.db
      .query("negotiationMoves")
      .withIndex("by_negotiation", (q) => q.eq("negotiationId", negotiationId))
      .order("asc")
      .collect();

    return {
      ...negotiation,
      moves,
    };
  },
});

// Get strategy results for a scenario
export const getStrategyResults = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    return await ctx.db
      .query("strategyResults")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();
  },
});

// Count negotiations by outcome type for a scenario
export const getOutcomeStats = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .collect();

    const stats = {
      total: negotiations.length,
      deals: 0,
      walkaways: 0,
      timeouts: 0,
      avgPartyAScore: 0,
      avgPartyBScore: 0,
    };

    let totalAScore = 0;
    let totalBScore = 0;
    let scoredCount = 0;

    for (const n of negotiations) {
      if (n.outcome) {
        if (n.outcome.type === "deal") stats.deals++;
        else if (n.outcome.type === "walkaway") stats.walkaways++;
        else if (n.outcome.type === "timeout") stats.timeouts++;

        totalAScore += n.outcome.partyAScore;
        totalBScore += n.outcome.partyBScore;
        scoredCount++;
      }
    }

    if (scoredCount > 0) {
      stats.avgPartyAScore = Math.round(totalAScore / scoredCount);
      stats.avgPartyBScore = Math.round(totalBScore / scoredCount);
    }

    return stats;
  },
});

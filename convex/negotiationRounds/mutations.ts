import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Create a new round tracking session
export const create = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    totalRounds: v.number(),
  },
  handler: async (ctx, { scenarioId, totalRounds }) => {
    return await ctx.db.insert("negotiationRounds", {
      scenarioId,
      currentRound: 1,
      totalRounds,
      evolutionLog: [],
      roundResults: [],
      insights: [],
      status: "running",
      createdAt: Date.now(),
    });
  },
});

// Update current round
export const updateCurrentRound = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    round: v.number(),
  },
  handler: async (ctx, { scenarioId, round }) => {
    const roundTracking = await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();

    if (roundTracking) {
      await ctx.db.patch(roundTracking._id, { currentRound: round });
    }
  },
});

// Record results for a round
export const recordResult = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    round: v.number(),
    negotiationId: v.id("negotiations"),
    outcomeType: v.string(),
    rankings: v.array(
      v.object({
        partyName: v.string(),
        score: v.number(),
        rank: v.number(),
      })
    ),
  },
  handler: async (ctx, { scenarioId, round, negotiationId, outcomeType, rankings }) => {
    const roundTracking = await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();

    if (roundTracking) {
      const roundResults = [...roundTracking.roundResults];
      roundResults.push({
        round,
        negotiationId,
        outcomeType,
        rankings,
      });

      await ctx.db.patch(roundTracking._id, { roundResults });
    }
  },
});

// Add evolutions
export const addEvolutions = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    round: v.number(),
    evolutions: v.array(
      v.object({
        partyName: v.string(),
        previousApproach: v.string(),
        newApproach: v.string(),
        reason: v.string(),
      })
    ),
  },
  handler: async (ctx, { scenarioId, round, evolutions }) => {
    const roundTracking = await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();

    if (roundTracking) {
      const evolutionLog = [...roundTracking.evolutionLog];
      for (const ev of evolutions) {
        evolutionLog.push({
          round,
          partyName: ev.partyName,
          previousApproach: ev.previousApproach,
          newApproach: ev.newApproach,
          reason: ev.reason,
        });
      }

      await ctx.db.patch(roundTracking._id, { evolutionLog });
    }
  },
});

// Add insight
export const addInsight = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    round: v.number(),
    insight: v.string(),
  },
  handler: async (ctx, { scenarioId, round, insight }) => {
    const roundTracking = await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();

    if (roundTracking) {
      const insights = [...roundTracking.insights];
      insights.push({ round, insight });

      await ctx.db.patch(roundTracking._id, { insights });
    }
  },
});

// Mark complete
export const complete = internalMutation({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    const roundTracking = await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();

    if (roundTracking) {
      await ctx.db.patch(roundTracking._id, { status: "completed" });
    }
  },
});

// Pause/resume
export const updateStatus = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    status: v.string(),
  },
  handler: async (ctx, { scenarioId, status }) => {
    const roundTracking = await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();

    if (roundTracking) {
      await ctx.db.patch(roundTracking._id, { status });
    }
  },
});

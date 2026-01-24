import { query } from "../_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    return await ctx.db
      .query("negotiationRounds")
      .withIndex("by_scenario", (q) => q.eq("scenarioId", scenarioId))
      .first();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("negotiationRounds").collect();
  },
});

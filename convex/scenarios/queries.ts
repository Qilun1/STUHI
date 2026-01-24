import { query } from "../_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("scenarios") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scenarios").order("desc").take(20);
  },
});

export const getReady = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("scenarios")
      .withIndex("by_status", (q) => q.eq("status", "ready"))
      .order("desc")
      .take(10);
  },
});

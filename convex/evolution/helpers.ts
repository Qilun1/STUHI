import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ===== Internal Queries =====

// Get agent data needed for evolution
export const getAgentForEvolution = internalQuery({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

// Get all active agents
export const getActiveAgents = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get recent interactions for an agent (with opponent names)
export const getRecentInteractions = internalQuery({
  args: {
    agentId: v.id("agents"),
    sinceRound: v.number(),
  },
  handler: async (ctx, args) => {
    const interactions = await ctx.db
      .query("interactions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();

    const filtered = interactions.filter((i) => i.roundNumber >= args.sinceRound);

    // Enrich with opponent names
    const enriched = await Promise.all(
      filtered.map(async (i) => {
        const opponent = await ctx.db.get(i.opponentId);
        return {
          ...i,
          opponentName: opponent?.name ?? "Unknown",
          opponentType: opponent?.type ?? "unknown",
        };
      })
    );

    return enriched;
  },
});

// ===== Internal Mutations =====

// Record an evolution event
export const recordEvolution = internalMutation({
  args: {
    agentId: v.id("agents"),
    version: v.number(),
    prompt: v.string(),
    parentVersion: v.optional(v.number()),
    evolutionReason: v.string(),
    selfReflection: v.optional(v.string()),
    gamesInPeriod: v.number(),
    winRate: v.number(),
    averageScore: v.number(),
    cooperationRate: v.number(),
    promiseKeepingRate: v.number(),
    trustGained: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promptEvolutions", {
      agentId: args.agentId,
      version: args.version,
      prompt: args.prompt,
      parentVersion: args.parentVersion,
      evolutionReason: args.evolutionReason,
      selfReflection: args.selfReflection,
      gamesInPeriod: args.gamesInPeriod,
      winRate: args.winRate,
      averageScore: args.averageScore,
      cooperationRate: args.cooperationRate,
      promiseKeepingRate: args.promiseKeepingRate,
      trustGained: args.trustGained,
      createdAt: Date.now(),
    });
  },
});

// Update an agent's prompt
export const updateAgentPrompt = internalMutation({
  args: {
    agentId: v.id("agents"),
    newPrompt: v.string(),
    newVersion: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.agentId, {
      systemPrompt: args.newPrompt,
      promptVersion: args.newVersion,
      updatedAt: Date.now(),
    });
  },
});

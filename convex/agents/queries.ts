import { query } from "../_generated/server";
import { v } from "convex/values";

// Get all active agents, sorted by score
export const list = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return agents.sort((a, b) => b.totalScore - a.totalScore);
  },
});

// Get a single agent by ID
export const get = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.agentId);
  },
});

// Get agent leaderboard (top N agents)
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return agents
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((agent, index) => ({
        rank: index + 1,
        ...agent,
      }));
  },
});

// Get agent's interaction history with another agent
export const pairHistory = query({
  args: {
    agentId: v.id("agents"),
    opponentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interactions")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("opponentId", args.opponentId)
      )
      .order("desc")
      .collect();
  },
});

// Get agent's trust relationship with another agent
export const trustWith = query({
  args: {
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const relationship = await ctx.db
      .query("trustRelationships")
      .withIndex("by_pair", (q) =>
        q.eq("fromAgentId", args.fromAgentId).eq("toAgentId", args.toAgentId)
      )
      .first();

    return relationship ?? { trustScore: 0, interactionCount: 0 };
  },
});

// Get all trust relationships for an agent
export const allTrustRelationships = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trustRelationships")
      .withIndex("by_from", (q) => q.eq("fromAgentId", args.agentId))
      .collect();
  },
});

// Get agent's prompt evolution history
export const promptHistory = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promptEvolutions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();
  },
});

// Get agent stats for context building
export const stats = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) return null;

    return {
      totalScore: agent.totalScore,
      gamesPlayed: agent.gamesPlayed,
      wins: agent.wins,
      losses: agent.losses,
      draws: agent.draws,
      cooperationRate: agent.cooperationRate,
      promiseKeepingRate: agent.promiseKeepingRate,
      winRate: agent.gamesPlayed > 0 ? agent.wins / agent.gamesPlayed : 0,
    };
  },
});

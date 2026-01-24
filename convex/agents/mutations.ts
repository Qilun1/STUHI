import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { AGENT_PERSONALITIES, type AgentType } from "./personalities";

// Agent type validator
const agentTypeValidator = v.union(
  v.literal("diplomat"),
  v.literal("shark"),
  v.literal("saint"),
  v.literal("grudger"),
  v.literal("analyst"),
  v.literal("charmer"),
  v.literal("paranoid"),
  v.literal("healer"),
  v.literal("wildcard"),
  v.literal("mirror")
);

// Create a new agent from personality template
export const create = mutation({
  args: {
    type: agentTypeValidator,
  },
  handler: async (ctx, args) => {
    const personality = AGENT_PERSONALITIES.find((p) => p.type === args.type);
    if (!personality) {
      throw new Error(`Unknown agent type: ${args.type}`);
    }

    const now = Date.now();

    const agentId = await ctx.db.insert("agents", {
      name: personality.name,
      type: args.type,
      badge: personality.badge,
      color: personality.color,
      systemPrompt: personality.initialPrompt,
      promptVersion: 1,
      totalScore: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      cooperationRate: 0,
      promiseKeepingRate: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Record initial prompt in evolution history
    await ctx.db.insert("promptEvolutions", {
      agentId,
      version: 1,
      prompt: personality.initialPrompt,
      gamesInPeriod: 0,
      winRate: 0,
      averageScore: 0,
      cooperationRate: 0,
      promiseKeepingRate: 0,
      trustGained: 0,
      evolutionReason: "Initial personality",
      createdAt: now,
    });

    return agentId;
  },
});

// Create all 10 agents
export const createAll = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const agentIds = [];

    for (const personality of AGENT_PERSONALITIES) {
      const agentId = await ctx.db.insert("agents", {
        name: personality.name,
        type: personality.type as AgentType,
        badge: personality.badge,
        color: personality.color,
        systemPrompt: personality.initialPrompt,
        promptVersion: 1,
        totalScore: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        cooperationRate: 0,
        promiseKeepingRate: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Record initial prompt in evolution history
      await ctx.db.insert("promptEvolutions", {
        agentId,
        version: 1,
        prompt: personality.initialPrompt,
        gamesInPeriod: 0,
        winRate: 0,
        averageScore: 0,
        cooperationRate: 0,
        promiseKeepingRate: 0,
        trustGained: 0,
        evolutionReason: "Initial personality",
        createdAt: now,
      });

      agentIds.push(agentId);
    }

    return agentIds;
  },
});

// Update agent stats after a game
export const updateStats = internalMutation({
  args: {
    agentId: v.id("agents"),
    score: v.number(),
    didWin: v.boolean(),
    didLose: v.boolean(),
    didCooperate: v.boolean(),
    keptPromise: v.boolean(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const newGamesPlayed = agent.gamesPlayed + 1;

    // Update cooperation rate (rolling average)
    const totalCoops =
      agent.cooperationRate * agent.gamesPlayed + (args.didCooperate ? 1 : 0);
    const newCooperationRate = totalCoops / newGamesPlayed;

    // Update promise keeping rate (rolling average)
    const totalKept =
      agent.promiseKeepingRate * agent.gamesPlayed + (args.keptPromise ? 1 : 0);
    const newPromiseKeepingRate = totalKept / newGamesPlayed;

    await ctx.db.patch(args.agentId, {
      totalScore: agent.totalScore + args.score,
      gamesPlayed: newGamesPlayed,
      wins: agent.wins + (args.didWin ? 1 : 0),
      losses: agent.losses + (args.didLose ? 1 : 0),
      draws: agent.draws + (!args.didWin && !args.didLose ? 1 : 0),
      cooperationRate: newCooperationRate,
      promiseKeepingRate: newPromiseKeepingRate,
      updatedAt: Date.now(),
    });
  },
});

// Update agent's system prompt (during evolution)
export const updatePrompt = internalMutation({
  args: {
    agentId: v.id("agents"),
    newPrompt: v.string(),
    evolutionReason: v.string(),
    selfReflection: v.optional(v.string()),
    metrics: v.object({
      gamesInPeriod: v.number(),
      winRate: v.number(),
      averageScore: v.number(),
      cooperationRate: v.number(),
      promiseKeepingRate: v.number(),
      trustGained: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const newVersion = agent.promptVersion + 1;
    const now = Date.now();

    // Update agent with new prompt
    await ctx.db.patch(args.agentId, {
      systemPrompt: args.newPrompt,
      promptVersion: newVersion,
      updatedAt: now,
    });

    // Record evolution history
    await ctx.db.insert("promptEvolutions", {
      agentId: args.agentId,
      version: newVersion,
      prompt: args.newPrompt,
      gamesInPeriod: args.metrics.gamesInPeriod,
      winRate: args.metrics.winRate,
      averageScore: args.metrics.averageScore,
      cooperationRate: args.metrics.cooperationRate,
      promiseKeepingRate: args.metrics.promiseKeepingRate,
      trustGained: args.metrics.trustGained,
      parentVersion: agent.promptVersion,
      evolutionReason: args.evolutionReason,
      selfReflection: args.selfReflection,
      createdAt: now,
    });

    return newVersion;
  },
});

// Reset all agents (for testing)
export const resetAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete all agents
    const agents = await ctx.db.query("agents").collect();
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    // Delete all related data
    const tables = [
      "games",
      "messages",
      "interactions",
      "trustRelationships",
      "promptEvolutions",
      "roundSummaries",
    ] as const;

    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
    }

    // Delete simulation state
    const states = await ctx.db.query("simulationState").collect();
    for (const state of states) {
      await ctx.db.delete(state._id);
    }
  },
});

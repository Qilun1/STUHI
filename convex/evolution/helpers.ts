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

// Trigger event type
const triggerEventValidator = v.object({
  type: v.string(),
  description: v.string(),
  opponent: v.optional(v.string()),
  round: v.optional(v.number()),
  impact: v.optional(v.string()),
});

// Key moment type
const keyMomentValidator = v.object({
  round: v.number(),
  opponent: v.string(),
  event: v.string(),
  score: v.number(),
  significance: v.string(),
});

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
    // Enhanced evolution data
    triggerEvents: v.optional(v.array(triggerEventValidator)),
    keyMoments: v.optional(v.array(keyMomentValidator)),
    strategyChanges: v.optional(v.array(v.string())),
    enemiesIdentified: v.optional(v.array(v.string())),
    alliesIdentified: v.optional(v.array(v.string())),
    performanceAnalysis: v.optional(v.string()),
    previousPromptSummary: v.optional(v.string()),
    roundRange: v.optional(v.object({ start: v.number(), end: v.number() })),
    betrayalsReceived: v.optional(v.number()),
    betrayalsMade: v.optional(v.number()),
    emotionalState: v.optional(v.string()),
    lessonLearned: v.optional(v.string()),
    evolutionNarrative: v.optional(v.string()),
    nemesis: v.optional(v.string()),
    ally: v.optional(v.string()),
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
      triggerEvents: args.triggerEvents,
      keyMoments: args.keyMoments,
      strategyChanges: args.strategyChanges,
      enemiesIdentified: args.enemiesIdentified,
      alliesIdentified: args.alliesIdentified,
      performanceAnalysis: args.performanceAnalysis,
      previousPromptSummary: args.previousPromptSummary,
      roundRange: args.roundRange,
      betrayalsReceived: args.betrayalsReceived,
      betrayalsMade: args.betrayalsMade,
      emotionalState: args.emotionalState,
      lessonLearned: args.lessonLearned,
      evolutionNarrative: args.evolutionNarrative,
      nemesis: args.nemesis,
      ally: args.ally,
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

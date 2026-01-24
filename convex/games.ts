import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get a single game by ID
export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

// Get all active games (not completed)
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db.query("games").collect();
    return games.filter((g) => g.phase !== "completed");
  },
});

// Get games in a specific round
export const byRound = query({
  args: { roundNumber: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_round", (q) => q.eq("roundNumber", args.roundNumber))
      .collect();
  },
});

// Get games by phase
export const byPhase = query({
  args: {
    phase: v.union(
      v.literal("negotiation"),
      v.literal("decision"),
      v.literal("reveal"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("games")
      .withIndex("by_phase", (q) => q.eq("phase", args.phase))
      .collect();
  },
});

// Get recent completed games (for dashboard)
export const recentCompleted = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const games = await ctx.db
      .query("games")
      .withIndex("by_phase", (q) => q.eq("phase", "completed"))
      .order("desc")
      .take(limit);

    // Enrich with agent info
    return await Promise.all(
      games.map(async (game) => {
        const agentA = await ctx.db.get(game.agentAId);
        const agentB = await ctx.db.get(game.agentBId);
        return {
          ...game,
          agentA: agentA
            ? { name: agentA.name, badge: agentA.badge, color: agentA.color }
            : null,
          agentB: agentB
            ? { name: agentB.name, badge: agentB.badge, color: agentB.color }
            : null,
        };
      })
    );
  },
});

// Get game with full details (agents, messages)
export const getWithDetails = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const agentA = await ctx.db.get(game.agentAId);
    const agentB = await ctx.db.get(game.agentBId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_game_order", (q) => q.eq("gameId", args.gameId))
      .collect();

    return {
      ...game,
      agentA,
      agentB,
      messages,
    };
  },
});

// Create a new game
export const create = internalMutation({
  args: {
    roundNumber: v.number(),
    agentAId: v.id("agents"),
    agentBId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("games", {
      roundNumber: args.roundNumber,
      agentAId: args.agentAId,
      agentBId: args.agentBId,
      phase: "negotiation",
      startedAt: Date.now(),
    });
  },
});

// Update game phase
export const updatePhase = internalMutation({
  args: {
    gameId: v.id("games"),
    phase: v.union(
      v.literal("negotiation"),
      v.literal("decision"),
      v.literal("reveal"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const updates: Record<string, unknown> = { phase: args.phase };

    if (args.phase === "decision") {
      updates.negotiationEndedAt = now;
    } else if (args.phase === "reveal") {
      updates.decidedAt = now;
    } else if (args.phase === "completed") {
      updates.completedAt = now;
    }

    await ctx.db.patch(args.gameId, updates);
  },
});

// Record decisions
export const recordDecisions = internalMutation({
  args: {
    gameId: v.id("games"),
    agentADecision: v.union(v.literal("split"), v.literal("steal")),
    agentBDecision: v.union(v.literal("split"), v.literal("steal")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      agentADecision: args.agentADecision,
      agentBDecision: args.agentBDecision,
      decidedAt: Date.now(),
    });
  },
});

// Record promises (extracted from messages)
export const recordPromises = internalMutation({
  args: {
    gameId: v.id("games"),
    agentAPromise: v.union(
      v.literal("split"),
      v.literal("steal"),
      v.literal("ambiguous"),
      v.literal("none")
    ),
    agentBPromise: v.union(
      v.literal("split"),
      v.literal("steal"),
      v.literal("ambiguous"),
      v.literal("none")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      agentAPromise: args.agentAPromise,
      agentBPromise: args.agentBPromise,
    });
  },
});

// Record scores after reveal
export const recordScores = internalMutation({
  args: {
    gameId: v.id("games"),
    agentAScore: v.number(),
    agentBScore: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      agentAScore: args.agentAScore,
      agentBScore: args.agentBScore,
      phase: "completed",
      completedAt: Date.now(),
    });
  },
});

// Get games for a specific round with agent data (for dashboard)
export const byRoundWithAgents = query({
  args: { roundNumber: v.number() },
  handler: async (ctx, args) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_round", (q) => q.eq("roundNumber", args.roundNumber))
      .collect();

    // Enrich with agent info
    return await Promise.all(
      games.map(async (game) => {
        const agentA = await ctx.db.get(game.agentAId);
        const agentB = await ctx.db.get(game.agentBId);

        // Count messages for this game
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_game", (q) => q.eq("gameId", game._id))
          .collect();

        return {
          ...game,
          agentA: agentA
            ? {
                _id: agentA._id,
                name: agentA.name,
                badge: agentA.badge,
                color: agentA.color,
                type: agentA.type,
              }
            : null,
          agentB: agentB
            ? {
                _id: agentB._id,
                name: agentB.name,
                badge: agentB.badge,
                color: agentB.color,
                type: agentB.type,
              }
            : null,
          messageCount: messages.length,
        };
      })
    );
  },
});

// Get full game data for reenactment view
export const getForReenactment = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const agentA = await ctx.db.get(game.agentAId);
    const agentB = await ctx.db.get(game.agentBId);

    // Get all messages with sender info
    const messagesRaw = await ctx.db
      .query("messages")
      .withIndex("by_game_order", (q) => q.eq("gameId", args.gameId))
      .collect();

    const messages = messagesRaw.map((msg) => ({
      ...msg,
      senderName: msg.senderId === game.agentAId ? agentA?.name : agentB?.name,
      senderBadge:
        msg.senderId === game.agentAId ? agentA?.badge : agentB?.badge,
      senderColor:
        msg.senderId === game.agentAId ? agentA?.color : agentB?.color,
      senderType: msg.senderId === game.agentAId ? agentA?.type : agentB?.type,
      isAgentA: msg.senderId === game.agentAId,
    }));

    // Get trust relationships for context
    const trustAtoB = await ctx.db
      .query("trustRelationships")
      .withIndex("by_pair", (q) =>
        q.eq("fromAgentId", game.agentAId).eq("toAgentId", game.agentBId)
      )
      .first();

    const trustBtoA = await ctx.db
      .query("trustRelationships")
      .withIndex("by_pair", (q) =>
        q.eq("fromAgentId", game.agentBId).eq("toAgentId", game.agentAId)
      )
      .first();

    return {
      ...game,
      agentA: agentA
        ? {
            _id: agentA._id,
            name: agentA.name,
            badge: agentA.badge,
            color: agentA.color,
            type: agentA.type,
            totalScore: agentA.totalScore,
            cooperationRate: agentA.cooperationRate,
            promiseKeepingRate: agentA.promiseKeepingRate,
          }
        : null,
      agentB: agentB
        ? {
            _id: agentB._id,
            name: agentB.name,
            badge: agentB.badge,
            color: agentB.color,
            type: agentB.type,
            totalScore: agentB.totalScore,
            cooperationRate: agentB.cooperationRate,
            promiseKeepingRate: agentB.promiseKeepingRate,
          }
        : null,
      messages,
      trustAtoB: trustAtoB?.trustScore ?? 0,
      trustBtoA: trustBtoA?.trustScore ?? 0,
    };
  },
});

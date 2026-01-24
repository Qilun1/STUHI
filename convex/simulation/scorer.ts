import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Calculate scores based on decisions
export function calculateScores(
  decisionA: "split" | "steal",
  decisionB: "split" | "steal"
): { scoreA: number; scoreB: number } {
  if (decisionA === "split" && decisionB === "split") {
    return { scoreA: 50, scoreB: 50 };
  } else if (decisionA === "split" && decisionB === "steal") {
    return { scoreA: 0, scoreB: 100 };
  } else if (decisionA === "steal" && decisionB === "split") {
    return { scoreA: 100, scoreB: 0 };
  } else {
    // Both steal
    return { scoreA: 0, scoreB: 0 };
  }
}

// Calculate trust delta based on interaction
export function calculateTrustDelta(
  theirDecision: "split" | "steal",
  theirPromise: "split" | "steal" | "ambiguous" | "none",
  previousTrust: number
): number {
  let delta = 0;

  if (theirDecision === "split") {
    // They cooperated
    delta += 10;

    // Bonus if they kept their promise
    if (theirPromise === "split") {
      delta += 5;
    }
  } else {
    // They defected
    delta -= 20;

    // Extra penalty if they broke a promise
    if (theirPromise === "split") {
      delta -= 15; // Breaking promise is -35 total
    }
  }

  // Normalize: trust changes more when trust is neutral
  // Harder to gain trust when already trusted, harder to lose when already distrusted
  const trustFactor = 1 - Math.abs(previousTrust) / 200;
  delta = delta * trustFactor;

  return delta;
}

// Determine if agent won, lost, or drew
export function determineOutcome(
  myScore: number,
  theirScore: number
): { didWin: boolean; didLose: boolean } {
  return {
    didWin: myScore > theirScore,
    didLose: myScore < theirScore,
  };
}

// Check if agent kept their promise
export function didKeepPromise(
  decision: "split" | "steal",
  promise: "split" | "steal" | "ambiguous" | "none"
): boolean {
  // If no clear promise, considered kept
  if (promise === "none" || promise === "ambiguous") return true;
  return decision === promise;
}

// Update trust relationship between two agents
export const updateTrust = internalMutation({
  args: {
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
    trustDelta: v.number(),
  },
  handler: async (ctx, args) => {
    // Find existing relationship
    const existing = await ctx.db
      .query("trustRelationships")
      .withIndex("by_pair", (q) =>
        q.eq("fromAgentId", args.fromAgentId).eq("toAgentId", args.toAgentId)
      )
      .first();

    if (existing) {
      // Update existing relationship
      const newTrust = Math.max(
        -100,
        Math.min(100, existing.trustScore + args.trustDelta)
      );
      await ctx.db.patch(existing._id, {
        trustScore: newTrust,
        interactionCount: existing.interactionCount + 1,
        lastUpdated: Date.now(),
      });
    } else {
      // Create new relationship
      const newTrust = Math.max(-100, Math.min(100, args.trustDelta));
      await ctx.db.insert("trustRelationships", {
        fromAgentId: args.fromAgentId,
        toAgentId: args.toAgentId,
        trustScore: newTrust,
        interactionCount: 1,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Record interaction history
export const recordInteraction = internalMutation({
  args: {
    agentId: v.id("agents"),
    opponentId: v.id("agents"),
    gameId: v.id("games"),
    roundNumber: v.number(),
    myDecision: v.union(v.literal("split"), v.literal("steal")),
    theirDecision: v.union(v.literal("split"), v.literal("steal")),
    myPromise: v.union(
      v.literal("split"),
      v.literal("steal"),
      v.literal("ambiguous"),
      v.literal("none")
    ),
    theirPromise: v.union(
      v.literal("split"),
      v.literal("steal"),
      v.literal("ambiguous"),
      v.literal("none")
    ),
    myScore: v.number(),
    theirScore: v.number(),
    trustDelta: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("interactions", {
      agentId: args.agentId,
      opponentId: args.opponentId,
      gameId: args.gameId,
      roundNumber: args.roundNumber,
      myDecision: args.myDecision,
      theirDecision: args.theirDecision,
      myPromise: args.myPromise,
      theirPromise: args.theirPromise,
      myScore: args.myScore,
      theirScore: args.theirScore,
      trustDelta: args.trustDelta,
      timestamp: Date.now(),
    });
  },
});

// Create round summary
export const createRoundSummary = internalMutation({
  args: {
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all games in this round
    const games = await ctx.db
      .query("games")
      .withIndex("by_round", (q) => q.eq("roundNumber", args.roundNumber))
      .collect();

    const completedGames = games.filter((g) => g.phase === "completed");
    if (completedGames.length === 0) return;

    let totalSplits = 0;
    let totalSteals = 0;
    let bothSplitCount = 0;
    let betrayalCount = 0;
    let mutualDefectionCount = 0;
    let totalScore = 0;

    for (const game of completedGames) {
      const aDecision = game.agentADecision;
      const bDecision = game.agentBDecision;

      if (aDecision === "split") totalSplits++;
      if (aDecision === "steal") totalSteals++;
      if (bDecision === "split") totalSplits++;
      if (bDecision === "steal") totalSteals++;

      if (aDecision === "split" && bDecision === "split") {
        bothSplitCount++;
      } else if (aDecision === "steal" && bDecision === "steal") {
        mutualDefectionCount++;
      } else {
        betrayalCount++;
      }

      totalScore += (game.agentAScore ?? 0) + (game.agentBScore ?? 0);
    }

    // Find top scorer
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const topAgent = agents.sort((a, b) => b.totalScore - a.totalScore)[0];

    await ctx.db.insert("roundSummaries", {
      roundNumber: args.roundNumber,
      totalGames: completedGames.length,
      totalSplits,
      totalSteals,
      cooperationRate: bothSplitCount / completedGames.length,
      betrayalCount,
      mutualDefectionCount,
      averageScore: totalScore / (completedGames.length * 2),
      topAgentId: topAgent._id,
      topAgentScore: topAgent.totalScore,
      completedAt: Date.now(),
    });
  },
});

// Get trust score between two agents
export const getTrustScore = internalQuery({
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

    return relationship?.trustScore ?? 0;
  },
});

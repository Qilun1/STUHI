import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Create a new negotiation session
export const create = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    runNumber: v.number(),
    partyAStrategy: v.string(),
    partyBStrategy: v.string(),
    maxTurns: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("negotiations", {
      scenarioId: args.scenarioId,
      runNumber: args.runNumber,
      partyAStrategy: args.partyAStrategy,
      partyBStrategy: args.partyBStrategy,
      phase: "opening",
      currentTurn: 0,
      maxTurns: args.maxTurns ?? 10,
      createdAt: Date.now(),
    });
  },
});

// Add a move to the negotiation
export const addMove = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    turn: v.number(),
    party: v.string(),
    moveType: v.string(),
    content: v.string(),
    reasoning: v.string(),
    emotionalTone: v.string(),
    tacticUsed: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert the move
    await ctx.db.insert("negotiationMoves", {
      negotiationId: args.negotiationId,
      turn: args.turn,
      party: args.party,
      moveType: args.moveType,
      content: args.content,
      reasoning: args.reasoning,
      emotionalTone: args.emotionalTone,
      tacticUsed: args.tacticUsed,
      createdAt: Date.now(),
    });

    // Update negotiation turn counter
    await ctx.db.patch(args.negotiationId, {
      currentTurn: args.turn + 1,
    });
  },
});

// Update negotiation phase
export const updatePhase = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    phase: v.string(),
  },
  handler: async (ctx, { negotiationId, phase }) => {
    await ctx.db.patch(negotiationId, { phase });
  },
});

// Complete the negotiation with outcome
export const complete = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    outcome: v.object({
      type: v.string(),
      description: v.string(),
      finalOffer: v.optional(v.string()),
      partyAScore: v.number(),
      partyBScore: v.number(),
    }),
  },
  handler: async (ctx, { negotiationId, outcome }) => {
    await ctx.db.patch(negotiationId, {
      phase: "resolved",
      outcome,
    });
  },
});

// Mark negotiation as failed (walkaway or timeout)
export const fail = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    reason: v.string(),
    partyAScore: v.number(),
    partyBScore: v.number(),
  },
  handler: async (ctx, { negotiationId, reason, partyAScore, partyBScore }) => {
    await ctx.db.patch(negotiationId, {
      phase: "failed",
      outcome: {
        type: "failed",
        description: reason,
        partyAScore,
        partyBScore,
      },
    });
  },
});

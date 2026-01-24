import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Create a multi-party negotiation session
export const createMultiParty = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    roundNumber: v.number(),
    partySnapshots: v.array(
      v.object({
        partyName: v.string(),
        generation: v.number(),
        systemPrompt: v.string(),
      })
    ),
    maxTurns: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("negotiations", {
      scenarioId: args.scenarioId,
      runNumber: 1,
      roundNumber: args.roundNumber,
      partySnapshots: args.partySnapshots,
      phase: "opening",
      currentTurn: 0,
      maxTurns: args.maxTurns,
      currentSpeakerIndex: 0,
      alliances: [],
      createdAt: Date.now(),
    });
  },
});

// Update multi-party state (phase, speaker)
export const updateMultiPartyState = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    phase: v.optional(v.string()),
    currentSpeakerIndex: v.optional(v.number()),
  },
  handler: async (ctx, { negotiationId, phase, currentSpeakerIndex }) => {
    const updates: Record<string, unknown> = {};
    if (phase !== undefined) updates.phase = phase;
    if (currentSpeakerIndex !== undefined)
      updates.currentSpeakerIndex = currentSpeakerIndex;
    await ctx.db.patch(negotiationId, updates);
  },
});

// Add a multi-party move
export const addMultiPartyMove = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    turn: v.number(),
    party: v.string(),
    moveType: v.string(),
    content: v.string(),
    reasoning: v.string(),
    emotionalTone: v.string(),
    tacticUsed: v.string(),
    targetParties: v.optional(v.array(v.string())),
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
      targetParties: args.targetParties,
      createdAt: Date.now(),
    });

    // Update negotiation turn counter
    await ctx.db.patch(args.negotiationId, {
      currentTurn: args.turn + 1,
    });
  },
});

// Update alliances
export const updateAlliances = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    alliances: v.array(
      v.object({
        members: v.array(v.string()),
        formedAtTurn: v.number(),
        purpose: v.string(),
      })
    ),
  },
  handler: async (ctx, { negotiationId, alliances }) => {
    await ctx.db.patch(negotiationId, { alliances });
  },
});

// Complete the multi-party negotiation with outcome
export const completeMultiParty = internalMutation({
  args: {
    negotiationId: v.id("negotiations"),
    outcome: v.object({
      type: v.string(),
      description: v.string(),
      finalDeal: v.optional(v.string()),
      partyScores: v.array(
        v.object({
          partyName: v.string(),
          score: v.number(),
          satisfaction: v.string(),
          wouldChange: v.string(),
        })
      ),
      winningCoalition: v.optional(v.array(v.string())),
    }),
    alliances: v.array(
      v.object({
        members: v.array(v.string()),
        formedAtTurn: v.number(),
        purpose: v.string(),
      })
    ),
  },
  handler: async (ctx, { negotiationId, outcome, alliances }) => {
    await ctx.db.patch(negotiationId, {
      phase: "resolved",
      multiPartyOutcome: outcome,
      alliances,
    });
  },
});

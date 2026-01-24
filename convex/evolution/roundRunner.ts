"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

interface PartyScore {
  partyName: string;
  score: number;
  satisfaction: string;
  wouldChange: string;
}

interface MultiPartyOutcome {
  type: string;
  description: string;
  finalDeal?: string;
  partyScores: PartyScore[];
  winningCoalition?: string[];
}

interface RoundResult {
  negotiationId: Id<"negotiations">;
  outcome: MultiPartyOutcome;
  rankings: Array<{ partyName: string; score: number; rank: number }>;
  insight: string;
  evolutions: Array<{
    partyName: string;
    previousApproach: string;
    newApproach: string;
    reason: string;
  }>;
}

// Run a full evolution session across multiple rounds
export const runEvolutionSession = action({
  args: {
    scenarioId: v.id("scenarios"),
    totalRounds: v.number(), // e.g., 3-5 rounds
  },
  returns: v.any(),
  handler: async (ctx, { scenarioId, totalRounds }): Promise<Doc<"negotiationRounds"> | null> => {
    // Initialize round tracking
    await ctx.runMutation(internal.negotiationRounds.mutations.create, {
      scenarioId,
      totalRounds,
    });

    for (let round = 1; round <= totalRounds; round++) {
      // Update current round
      await ctx.runMutation(
        internal.negotiationRounds.mutations.updateCurrentRound,
        {
          scenarioId,
          round,
        }
      );

      // Run negotiation
      const negotiationId = await ctx.runAction(
        api.negotiations.multiPartyEngine.runMultiPartyNegotiation,
        { scenarioId, roundNumber: round }
      );

      // Get results
      const negotiation = await ctx.runQuery(api.negotiations.queries.get, {
        id: negotiationId,
      });

      if (!negotiation?.multiPartyOutcome) {
        console.error(`Round ${round} failed - no outcome`);
        continue;
      }

      // Record results
      const rankings = negotiation.multiPartyOutcome.partyScores.map(
        (ps: PartyScore, i: number) => ({
          partyName: ps.partyName,
          score: ps.score,
          rank: i + 1,
        })
      );

      await ctx.runMutation(
        internal.negotiationRounds.mutations.recordResult,
        {
          scenarioId,
          round,
          negotiationId,
          outcomeType: negotiation.multiPartyOutcome.type,
          rankings,
        }
      );

      // Generate insight
      await ctx.runAction(api.evolution.personalityEvolution.generateRoundInsight, {
        scenarioId,
        roundNumber: round,
      });

      // Evolve losing parties (except last round)
      if (round < totalRounds) {
        await ctx.runAction(api.evolution.personalityEvolution.evolveParties, {
          scenarioId,
          roundNumber: round,
        });
      }
    }

    // Mark complete
    await ctx.runMutation(internal.negotiationRounds.mutations.complete, {
      scenarioId,
    });

    return await ctx.runQuery(api.negotiationRounds.queries.get, { scenarioId });
  },
});

// Run a single round (for step-by-step UI control)
export const runSingleRound = action({
  args: {
    scenarioId: v.id("scenarios"),
    roundNumber: v.number(),
    shouldEvolve: v.optional(v.boolean()), // Whether to evolve after this round
  },
  returns: v.any(),
  handler: async (ctx, { scenarioId, roundNumber, shouldEvolve = true }): Promise<RoundResult> => {
    // Check if round tracking exists, if not create it
    let rounds = await ctx.runQuery(api.negotiationRounds.queries.get, {
      scenarioId,
    });

    if (!rounds) {
      await ctx.runMutation(internal.negotiationRounds.mutations.create, {
        scenarioId,
        totalRounds: 5, // Default, can be updated later
      });
    }

    // Update current round
    await ctx.runMutation(
      internal.negotiationRounds.mutations.updateCurrentRound,
      {
        scenarioId,
        round: roundNumber,
      }
    );

    // Run negotiation
    const negotiationId: Id<"negotiations"> = await ctx.runAction(
      api.negotiations.multiPartyEngine.runMultiPartyNegotiation,
      { scenarioId, roundNumber }
    );

    // Get results
    const negotiation: Doc<"negotiations"> | null = await ctx.runQuery(api.negotiations.queries.get, {
      id: negotiationId,
    });

    if (!negotiation?.multiPartyOutcome) {
      throw new Error(`Round ${roundNumber} failed - no outcome`);
    }

    // Record results
    const rankings = negotiation.multiPartyOutcome.partyScores.map((ps: PartyScore, i: number) => ({
      partyName: ps.partyName,
      score: ps.score,
      rank: i + 1,
    }));

    await ctx.runMutation(internal.negotiationRounds.mutations.recordResult, {
      scenarioId,
      round: roundNumber,
      negotiationId,
      outcomeType: negotiation.multiPartyOutcome.type,
      rankings,
    });

    // Generate insight
    const insight: string = await ctx.runAction(
      api.evolution.personalityEvolution.generateRoundInsight,
      {
        scenarioId,
        roundNumber,
      }
    );

    // Evolve if requested
    let evolutions: Array<{
      partyName: string;
      previousApproach: string;
      newApproach: string;
      reason: string;
    }> = [];

    if (shouldEvolve) {
      evolutions = await ctx.runAction(
        api.evolution.personalityEvolution.evolveParties,
        {
          scenarioId,
          roundNumber,
        }
      );
    }

    return {
      negotiationId,
      outcome: negotiation.multiPartyOutcome,
      rankings,
      insight,
      evolutions,
    };
  },
});

// Pause an evolution session
export const pauseSession = action({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    await ctx.runMutation(internal.negotiationRounds.mutations.updateStatus, {
      scenarioId,
      status: "paused",
    });
  },
});

// Resume an evolution session
export const resumeSession = action({
  args: { scenarioId: v.id("scenarios") },
  returns: v.any(),
  handler: async (ctx, { scenarioId }): Promise<Doc<"negotiationRounds"> | null> => {
    const rounds = await ctx.runQuery(api.negotiationRounds.queries.get, {
      scenarioId,
    });

    if (!rounds || rounds.status === "completed") {
      throw new Error("No active session to resume");
    }

    await ctx.runMutation(internal.negotiationRounds.mutations.updateStatus, {
      scenarioId,
      status: "running",
    });

    // Continue from current round
    const currentRound = rounds.currentRound;
    const totalRounds = rounds.totalRounds;

    for (let round = currentRound; round <= totalRounds; round++) {
      // Check if we should still be running
      const currentStatus: Doc<"negotiationRounds"> | null = await ctx.runQuery(
        api.negotiationRounds.queries.get,
        { scenarioId }
      );
      if (currentStatus?.status === "paused") {
        return currentStatus;
      }

      await ctx.runMutation(
        internal.negotiationRounds.mutations.updateCurrentRound,
        {
          scenarioId,
          round,
        }
      );

      const negotiationId = await ctx.runAction(
        api.negotiations.multiPartyEngine.runMultiPartyNegotiation,
        { scenarioId, roundNumber: round }
      );

      const negotiation = await ctx.runQuery(api.negotiations.queries.get, {
        id: negotiationId,
      });

      if (negotiation?.multiPartyOutcome) {
        const rankings = negotiation.multiPartyOutcome.partyScores.map(
          (ps: PartyScore, i: number) => ({
            partyName: ps.partyName,
            score: ps.score,
            rank: i + 1,
          })
        );

        await ctx.runMutation(
          internal.negotiationRounds.mutations.recordResult,
          {
            scenarioId,
            round,
            negotiationId,
            outcomeType: negotiation.multiPartyOutcome.type,
            rankings,
          }
        );

        await ctx.runAction(
          api.evolution.personalityEvolution.generateRoundInsight,
          {
            scenarioId,
            roundNumber: round,
          }
        );

        if (round < totalRounds) {
          await ctx.runAction(
            api.evolution.personalityEvolution.evolveParties,
            {
              scenarioId,
              roundNumber: round,
            }
          );
        }
      }
    }

    await ctx.runMutation(internal.negotiationRounds.mutations.complete, {
      scenarioId,
    });

    return await ctx.runQuery(api.negotiationRounds.queries.get, { scenarioId });
  },
});

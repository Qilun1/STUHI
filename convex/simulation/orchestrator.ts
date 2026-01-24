"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import {
  calculateScores,
  calculateTrustDelta,
  determineOutcome,
  didKeepPromise,
} from "./scorer";

// Run a complete round - creates 5 games and processes them
export const runRound = action({
  args: {},
  handler: async (ctx): Promise<{ roundNumber: number; gamesPlayed: number }> => {
    // Check simulation state
    const state = await ctx.runQuery(api.simulation.state.get);
    if (!state) {
      throw new Error("Simulation not initialized");
    }
    if (state.status !== "running") {
      throw new Error("Simulation is not running");
    }

    // Increment round
    const roundNumber = await ctx.runMutation(
      internal.simulation.state.incrementRound
    );

    // Get all active agents
    const agents = await ctx.runQuery(api.agents.queries.list);
    if (agents.length < 2) {
      throw new Error("Need at least 2 agents to run a round");
    }

    // Create random pairings (5 games for 10 agents)
    const pairings = createRandomPairings(
      agents.map((a) => a._id),
      state.gamesPerRound
    );

    // Process games in parallel (OpenAI has high rate limits)
    const gamePromises = pairings.map(([agentAId, agentBId]) =>
      ctx.runAction(internal.simulation.orchestrator.processGame, {
        roundNumber,
        agentAId,
        agentBId,
      })
    );

    await Promise.all(gamePromises);

    // Create round summary
    await ctx.runMutation(internal.simulation.scorer.createRoundSummary, {
      roundNumber,
    });

    // Check if evolution is due (every evolutionInterval rounds)
    const shouldEvolve = await ctx.runQuery(api.simulation.state.shouldEvolve);
    if (shouldEvolve) {
      console.log(`Evolution triggered at round ${roundNumber}`);
      await ctx.runAction(internal.evolution.evolve.evolveAllAgents, {
        roundNumber,
      });
    }

    // Check if we should continue running
    const updatedState = await ctx.runQuery(api.simulation.state.get);
    if (updatedState?.status === "running") {
      // Schedule next round after a short delay
      await ctx.scheduler.runAfter(1000, api.simulation.orchestrator.runRound, {});
    }

    return { roundNumber, gamesPlayed: pairings.length };
  },
});

// Process a single game from start to finish
export const processGame = internalAction({
  args: {
    roundNumber: v.number(),
    agentAId: v.id("agents"),
    agentBId: v.id("agents"),
  },
  handler: async (ctx, args): Promise<{
    gameId: Id<"games">;
    agentADecision: "split" | "steal";
    agentBDecision: "split" | "steal";
    scoreA: number;
    scoreB: number;
  }> => {
    // Create the game
    const gameId = await ctx.runMutation(internal.games.create, {
      roundNumber: args.roundNumber,
      agentAId: args.agentAId,
      agentBId: args.agentBId,
    });

    // Run negotiation phase (3 exchanges, 6 total messages)
    const promises: {
      A: "split" | "steal" | "ambiguous" | "none";
      B: "split" | "steal" | "ambiguous" | "none";
    } = { A: "none", B: "none" };

    for (let messageNumber = 1; messageNumber <= 3; messageNumber++) {
      // Agent A speaks first
      const messageA = await ctx.runAction(
        internal.agents.llmAgent.generateNegotiationMessage,
        {
          agentId: args.agentAId,
          gameId,
          messageNumber,
        }
      );

      // Extract promise from Agent A's message
      const promiseA = await ctx.runAction(
        internal.agents.llmAgent.extractPromise,
        { message: messageA }
      );
      if (promiseA === "split" || promiseA === "steal") {
        promises.A = promiseA as "split" | "steal";
      }

      // Store Agent A's message
      await ctx.runMutation(internal.messages.add, {
        gameId,
        senderId: args.agentAId,
        content: messageA,
        messageNumber,
        impliedPromise: promiseA,
      });

      // Agent B responds
      const messageB = await ctx.runAction(
        internal.agents.llmAgent.generateNegotiationMessage,
        {
          agentId: args.agentBId,
          gameId,
          messageNumber,
        }
      );

      // Extract promise from Agent B's message
      const promiseB = await ctx.runAction(
        internal.agents.llmAgent.extractPromise,
        { message: messageB }
      );
      if (promiseB === "split" || promiseB === "steal") {
        promises.B = promiseB as "split" | "steal";
      }

      // Store Agent B's message
      await ctx.runMutation(internal.messages.add, {
        gameId,
        senderId: args.agentBId,
        content: messageB,
        messageNumber,
        impliedPromise: promiseB,
      });
    }

    // Record final promises
    await ctx.runMutation(internal.games.recordPromises, {
      gameId,
      agentAPromise: promises.A,
      agentBPromise: promises.B,
    });

    // Transition to decision phase
    await ctx.runMutation(internal.games.updatePhase, {
      gameId,
      phase: "decision",
    });

    // Get decisions from both agents (parallel for speed)
    const [decisionA, decisionB] = await Promise.all([
      ctx.runAction(internal.agents.llmAgent.generateDecision, {
        agentId: args.agentAId,
        gameId,
      }),
      ctx.runAction(internal.agents.llmAgent.generateDecision, {
        agentId: args.agentBId,
        gameId,
      }),
    ]);

    // Record decisions
    await ctx.runMutation(internal.games.recordDecisions, {
      gameId,
      agentADecision: decisionA.decision,
      agentBDecision: decisionB.decision,
    });

    // Transition to reveal phase
    await ctx.runMutation(internal.games.updatePhase, {
      gameId,
      phase: "reveal",
    });

    // Calculate scores
    const { scoreA, scoreB } = calculateScores(
      decisionA.decision,
      decisionB.decision
    );

    // Calculate trust deltas
    const trustAtoB = await ctx.runQuery(
      internal.simulation.scorer.getTrustScore,
      {
        fromAgentId: args.agentAId,
        toAgentId: args.agentBId,
      }
    );
    const trustBtoA = await ctx.runQuery(
      internal.simulation.scorer.getTrustScore,
      {
        fromAgentId: args.agentBId,
        toAgentId: args.agentAId,
      }
    );

    const deltaAtoB = calculateTrustDelta(
      decisionB.decision,
      promises.B,
      trustAtoB
    );
    const deltaBtoA = calculateTrustDelta(
      decisionA.decision,
      promises.A,
      trustBtoA
    );

    // Update trust relationships
    await Promise.all([
      ctx.runMutation(internal.simulation.scorer.updateTrust, {
        fromAgentId: args.agentAId,
        toAgentId: args.agentBId,
        trustDelta: deltaAtoB,
      }),
      ctx.runMutation(internal.simulation.scorer.updateTrust, {
        fromAgentId: args.agentBId,
        toAgentId: args.agentAId,
        trustDelta: deltaBtoA,
      }),
    ]);

    // Record interactions for both agents
    await Promise.all([
      ctx.runMutation(internal.simulation.scorer.recordInteraction, {
        agentId: args.agentAId,
        opponentId: args.agentBId,
        gameId,
        roundNumber: args.roundNumber,
        myDecision: decisionA.decision,
        theirDecision: decisionB.decision,
        myPromise: promises.A,
        theirPromise: promises.B,
        myScore: scoreA,
        theirScore: scoreB,
        trustDelta: deltaAtoB,
      }),
      ctx.runMutation(internal.simulation.scorer.recordInteraction, {
        agentId: args.agentBId,
        opponentId: args.agentAId,
        gameId,
        roundNumber: args.roundNumber,
        myDecision: decisionB.decision,
        theirDecision: decisionA.decision,
        myPromise: promises.B,
        theirPromise: promises.A,
        myScore: scoreB,
        theirScore: scoreA,
        trustDelta: deltaBtoA,
      }),
    ]);

    // Determine outcomes
    const outcomeA = determineOutcome(scoreA, scoreB);
    const outcomeB = determineOutcome(scoreB, scoreA);

    // Update agent stats
    await Promise.all([
      ctx.runMutation(internal.agents.mutations.updateStats, {
        agentId: args.agentAId,
        score: scoreA,
        didWin: outcomeA.didWin,
        didLose: outcomeA.didLose,
        didCooperate: decisionA.decision === "split",
        keptPromise: didKeepPromise(decisionA.decision, promises.A),
      }),
      ctx.runMutation(internal.agents.mutations.updateStats, {
        agentId: args.agentBId,
        score: scoreB,
        didWin: outcomeB.didWin,
        didLose: outcomeB.didLose,
        didCooperate: decisionB.decision === "split",
        keptPromise: didKeepPromise(decisionB.decision, promises.B),
      }),
    ]);

    // Record final scores and complete the game
    await ctx.runMutation(internal.games.recordScores, {
      gameId,
      agentAScore: scoreA,
      agentBScore: scoreB,
    });

    return {
      gameId,
      agentADecision: decisionA.decision,
      agentBDecision: decisionB.decision,
      scoreA,
      scoreB,
    };
  },
});

// Create random pairings from agent IDs
function createRandomPairings(
  agentIds: Id<"agents">[],
  count: number
): [Id<"agents">, Id<"agents">][] {
  const shuffled = [...agentIds].sort(() => Math.random() - 0.5);
  const pairings: [Id<"agents">, Id<"agents">][] = [];

  // Create pairs from shuffled array
  for (let i = 0; i < shuffled.length - 1 && pairings.length < count; i += 2) {
    pairings.push([shuffled[i], shuffled[i + 1]]);
  }

  // If we need more pairs and have odd number, wrap around
  if (pairings.length < count && shuffled.length >= 2) {
    // For remaining pairs, create from different positions
    let attempts = 0;
    while (pairings.length < count && attempts < 100) {
      const a = shuffled[Math.floor(Math.random() * shuffled.length)];
      const b = shuffled[Math.floor(Math.random() * shuffled.length)];
      if (a !== b) {
        // Check if this pairing already exists
        const exists = pairings.some(
          ([x, y]) => (x === a && y === b) || (x === b && y === a)
        );
        if (!exists) {
          pairings.push([a, b]);
        }
      }
      attempts++;
    }
  }

  return pairings;
}

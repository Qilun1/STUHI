import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Get current simulation state
export const get = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    return state;
  },
});

// Initialize simulation state
export const initialize = mutation({
  args: {
    gamesPerRound: v.optional(v.number()),
    evolutionInterval: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if state already exists
    const existing = await ctx.db.query("simulationState").first();
    if (existing) {
      throw new Error("Simulation state already initialized");
    }

    const now = Date.now();
    return await ctx.db.insert("simulationState", {
      currentRound: 0,
      status: "stopped",
      gamesPerRound: args.gamesPerRound ?? 5, // 5 games per round (10 agents = 5 pairs)
      evolutionInterval: args.evolutionInterval ?? 5, // Evolve every 5 rounds
      lastEvolutionRound: 0,
      updatedAt: now,
    });
  },
});

// Start simulation
export const start = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    if (!state) {
      throw new Error("Simulation not initialized");
    }

    const now = Date.now();
    await ctx.db.patch(state._id, {
      status: "running",
      startedAt: state.startedAt ?? now,
      updatedAt: now,
    });
  },
});

// Pause simulation
export const pause = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    if (!state) {
      throw new Error("Simulation not initialized");
    }

    await ctx.db.patch(state._id, {
      status: "paused",
      updatedAt: Date.now(),
    });
  },
});

// Stop simulation
export const stop = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    if (!state) {
      throw new Error("Simulation not initialized");
    }

    await ctx.db.patch(state._id, {
      status: "stopped",
      updatedAt: Date.now(),
    });
  },
});

// Increment round
export const incrementRound = internalMutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    if (!state) {
      throw new Error("Simulation not initialized");
    }

    const newRound = state.currentRound + 1;
    const now = Date.now();

    await ctx.db.patch(state._id, {
      currentRound: newRound,
      roundStartedAt: now,
      updatedAt: now,
    });

    return newRound;
  },
});

// Record that evolution occurred
export const recordEvolution = internalMutation({
  args: { roundNumber: v.number() },
  handler: async (ctx, args) => {
    const state = await ctx.db.query("simulationState").first();
    if (!state) {
      throw new Error("Simulation not initialized");
    }

    await ctx.db.patch(state._id, {
      lastEvolutionRound: args.roundNumber,
      updatedAt: Date.now(),
    });
  },
});

// Check if evolution is due
export const shouldEvolve = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    if (!state) return false;

    const roundsSinceEvolution = state.currentRound - state.lastEvolutionRound;
    return roundsSinceEvolution >= state.evolutionInterval;
  },
});

// Reset simulation (for testing)
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("simulationState").first();
    if (state) {
      await ctx.db.patch(state._id, {
        currentRound: 0,
        status: "stopped",
        lastEvolutionRound: 0,
        roundStartedAt: undefined,
        startedAt: undefined,
        updatedAt: Date.now(),
      });
    }
  },
});

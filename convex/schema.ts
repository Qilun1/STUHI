import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Agent personality types
const agentType = v.union(
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

// Game phase states
const gamePhase = v.union(
  v.literal("negotiation"),
  v.literal("decision"),
  v.literal("reveal"),
  v.literal("completed")
);

// Decision types
const decision = v.union(v.literal("split"), v.literal("steal"));

// Promise types (including "none" for no clear promise)
const promise = v.union(
  v.literal("split"),
  v.literal("steal"),
  v.literal("ambiguous"),
  v.literal("none")
);

export default defineSchema({
  // Agent profiles with evolvable prompts
  agents: defineTable({
    name: v.string(),
    type: agentType,
    badge: v.string(), // e.g., "[DIP]", "[SHK]"
    color: v.string(), // Hex color for UI

    // Evolvable system prompt
    systemPrompt: v.string(),
    promptVersion: v.number(),

    // Cumulative stats
    totalScore: v.number(),
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
    draws: v.number(),

    // Behavioral metrics
    cooperationRate: v.number(), // 0-1
    promiseKeepingRate: v.number(), // 0-1

    // Status
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_score", ["totalScore"])
    .index("by_active", ["isActive"]),

  // Individual game matches between two agents
  games: defineTable({
    roundNumber: v.number(),
    agentAId: v.id("agents"),
    agentBId: v.id("agents"),
    phase: gamePhase,

    // Decisions (null until decision phase complete)
    agentADecision: v.optional(decision),
    agentBDecision: v.optional(decision),

    // Promises made during negotiation (extracted from messages)
    agentAPromise: v.optional(promise),
    agentBPromise: v.optional(promise),

    // Scores awarded after reveal
    agentAScore: v.optional(v.number()),
    agentBScore: v.optional(v.number()),

    // Timing
    startedAt: v.number(),
    negotiationEndedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index("by_round", ["roundNumber"])
    .index("by_phase", ["phase"])
    .index("by_agentA", ["agentAId"])
    .index("by_agentB", ["agentBId"])
    .index("by_round_phase", ["roundNumber", "phase"]),

  // Chat messages during negotiation phase
  messages: defineTable({
    gameId: v.id("games"),
    senderId: v.id("agents"),
    content: v.string(),
    messageNumber: v.number(), // 1, 2, or 3 for each agent

    // Extracted intent from message
    impliedPromise: v.optional(promise),

    timestamp: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_order", ["gameId", "timestamp"]),

  // Historical record of agent interactions
  interactions: defineTable({
    agentId: v.id("agents"),
    opponentId: v.id("agents"),
    gameId: v.id("games"),
    roundNumber: v.number(),

    // What happened
    myDecision: decision,
    theirDecision: decision,
    myPromise: promise,
    theirPromise: promise,

    // Outcome
    myScore: v.number(),
    theirScore: v.number(),

    // Trust delta after this interaction
    trustDelta: v.number(),

    timestamp: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_pair", ["agentId", "opponentId"])
    .index("by_round", ["roundNumber"]),

  // Trust relationships between agents (cached/computed)
  trustRelationships: defineTable({
    fromAgentId: v.id("agents"),
    toAgentId: v.id("agents"),
    trustScore: v.number(), // -100 to 100
    interactionCount: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_from", ["fromAgentId"])
    .index("by_pair", ["fromAgentId", "toAgentId"]),

  // Prompt evolution history for agents
  promptEvolutions: defineTable({
    agentId: v.id("agents"),
    version: v.number(),
    prompt: v.string(),

    // Performance metrics at time of evolution
    gamesInPeriod: v.number(),
    winRate: v.number(),
    averageScore: v.number(),
    cooperationRate: v.number(),
    promiseKeepingRate: v.number(),
    trustGained: v.number(),

    // Evolution metadata
    parentVersion: v.optional(v.number()),
    evolutionReason: v.string(),
    selfReflection: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_agent_version", ["agentId", "version"]),

  // Global simulation state
  simulationState: defineTable({
    currentRound: v.number(),
    status: v.union(
      v.literal("running"),
      v.literal("paused"),
      v.literal("stopped")
    ),
    gamesPerRound: v.number(),
    evolutionInterval: v.number(), // Every N rounds
    lastEvolutionRound: v.number(),
    roundStartedAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    updatedAt: v.number(),
  }),

  // Agent memories about specific opponents
  agentMemories: defineTable({
    agentId: v.id("agents"),
    aboutAgentId: v.id("agents"),
    aboutAgentName: v.string(), // Denormalized for easy access

    // Short memory notes (max ~50 chars each)
    notes: v.array(v.string()), // e.g., ["Betrayed me round 5", "Always lies about splitting"]

    // Quick stats
    timesBetrayed: v.number(),
    timesBetrayedThem: v.number(),
    gamesPlayed: v.number(),

    // Trust assessment
    trustLevel: v.union(
      v.literal("trusted"),
      v.literal("neutral"),
      v.literal("distrusted"),
      v.literal("enemy")
    ),

    updatedAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_pair", ["agentId", "aboutAgentId"]),

  // Round summaries for historical analysis and charts
  roundSummaries: defineTable({
    roundNumber: v.number(),
    totalGames: v.number(),
    totalSplits: v.number(),
    totalSteals: v.number(),
    cooperationRate: v.number(), // (both split) / total
    betrayalCount: v.number(), // (one split, one steal)
    mutualDefectionCount: v.number(), // (both steal)
    averageScore: v.number(),
    topAgentId: v.id("agents"),
    topAgentScore: v.number(),
    completedAt: v.number(),
  }).index("by_round", ["roundNumber"]),
});

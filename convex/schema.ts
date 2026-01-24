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

  // ============================================
  // NEGOTIATION SIMULATOR TABLES
  // ============================================

  // Scenarios - the negotiation setup
  scenarios: defineTable({
    // Input
    sourceQuery: v.string(), // "Greenland purchase"
    partyCount: v.optional(v.number()), // Number of parties (default 2)

    // Generated content
    title: v.string(),
    description: v.string(),

    // Research results
    context: v.string(), // Current situation summary
    keyFacts: v.array(
      v.object({
        fact: v.string(),
        source: v.optional(v.string()),
        confidence: v.string(),
      })
    ),

    // Parties with personality and evolution support
    parties: v.array(
      v.object({
        name: v.string(),
        representative: v.string(),
        publicPosition: v.string(),
        interests: v.array(v.string()),
        redLines: v.array(v.string()),
        batna: v.string(),
        pressurePoints: v.array(v.string()),
        powerLevel: v.number(),

        // Research-based personality
        personality: v.optional(
          v.object({
            negotiationStyle: v.string(), // "aggressive", "diplomatic", "principled", etc.
            communicationTone: v.string(), // "blunt", "formal", "emotional"
            riskTolerance: v.string(), // "high", "medium", "low"
            trustLevel: v.string(), // "skeptical", "neutral", "trusting"
            keyTraits: v.array(v.string()), // ["unpredictable", "deal-maker", "stubborn"]
            historicalBehavior: v.string(), // "Known for walking away from deals..."
          })
        ),

        // Generated strategy prompt (from research)
        systemPrompt: v.optional(v.string()),

        // For evolution tracking
        currentGeneration: v.optional(v.number()), // 0 = original research-based
        evolutionHistory: v.optional(
          v.array(
            v.object({
              generation: v.number(),
              change: v.string(), // "Became more cooperative"
              reason: v.string(), // "Lost Round 1 by being too aggressive"
            })
          )
        ),

        // Relationships
        potentialAllies: v.optional(v.array(v.string())),
        rivals: v.optional(v.array(v.string())),
      })
    ),

    // Possible outcomes
    possibleOutcomes: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        partyAScore: v.number(),
        partyBScore: v.number(),
        likelihood: v.string(),
      })
    ),

    // Status
    status: v.string(), // researching | ready | active | completed
    statusMessage: v.optional(v.string()),

    // Research activity log
    researchActivity: v.optional(
      v.array(
        v.object({
          type: v.string(), // search | analyze | generate | complete
          message: v.string(),
          detail: v.optional(v.string()), // e.g., the actual search query
          timestamp: v.number(),
          // Expandable data for click-to-view
          data: v.optional(
            v.object({
              sources: v.optional(
                v.array(
                  v.object({
                    title: v.string(),
                    url: v.string(),
                    snippet: v.optional(v.string()),
                  })
                )
              ),
              items: v.optional(v.array(v.string())),
            })
          ),
        })
      )
    ),

    // Analytics (filled after simulations)
    optimalStrategy: v.optional(v.string()),
    totalSimulations: v.optional(v.number()),

    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Individual negotiation runs
  negotiations: defineTable({
    scenarioId: v.id("scenarios"),
    runNumber: v.number(),
    roundNumber: v.optional(v.number()), // For evolution rounds: 1, 2, 3...

    // Strategy assignment (legacy 2-party)
    partyAStrategy: v.optional(v.string()),
    partyBStrategy: v.optional(v.string()),

    // Multi-party: Party state at start of this negotiation
    partySnapshots: v.optional(
      v.array(
        v.object({
          partyName: v.string(),
          generation: v.number(),
          systemPrompt: v.string(),
        })
      )
    ),

    // State
    phase: v.string(), // opening | bargaining | closing | resolved | failed
    currentTurn: v.number(),
    maxTurns: v.number(),
    currentSpeakerIndex: v.optional(v.number()), // For multi-party round-robin

    // Alliances formed during negotiation
    alliances: v.optional(
      v.array(
        v.object({
          members: v.array(v.string()),
          formedAtTurn: v.number(),
          purpose: v.string(),
        })
      )
    ),

    // Legacy 2-party outcome
    outcome: v.optional(
      v.object({
        type: v.string(), // deal | walkaway | timeout
        description: v.string(),
        finalOffer: v.optional(v.string()),
        partyAScore: v.number(),
        partyBScore: v.number(),
      })
    ),

    // Multi-party outcome
    multiPartyOutcome: v.optional(
      v.object({
        type: v.string(), // "deal" | "partial" | "collapse"
        description: v.string(),
        finalDeal: v.optional(v.string()),
        partyScores: v.array(
          v.object({
            partyName: v.string(),
            score: v.number(),
            satisfaction: v.string(),
            wouldChange: v.string(), // Hint for evolution
          })
        ),
        winningCoalition: v.optional(v.array(v.string())),
      })
    ),

    createdAt: v.number(),
  })
    .index("by_scenario", ["scenarioId"])
    .index("by_scenario_and_strategies", [
      "scenarioId",
      "partyAStrategy",
      "partyBStrategy",
    ])
    .index("by_scenario_round", ["scenarioId", "roundNumber"]),

  // Individual moves in a negotiation
  negotiationMoves: defineTable({
    negotiationId: v.id("negotiations"),
    turn: v.number(),
    party: v.string(),

    moveType: v.string(), // offer | counteroffer | concession | demand | threat | accept | reject | walkaway | alliance_proposal | support | challenge
    content: v.string(), // What they said
    reasoning: v.string(), // Internal reasoning (not shown)

    emotionalTone: v.string(), // firm | conciliatory | aggressive | neutral | theatrical
    tacticUsed: v.string(), // anchoring | reciprocity | deadline | appeal_to_fairness | coalition_building | divide_and_conquer | etc

    // Multi-party extensions
    targetParties: v.optional(v.array(v.string())), // ["all"] or ["specific", "parties"]

    createdAt: v.number(),
  }).index("by_negotiation", ["negotiationId"]),

  // Aggregated strategy results per scenario
  strategyResults: defineTable({
    scenarioId: v.id("scenarios"),

    strategyA: v.string(),
    strategyB: v.string(),

    // Results
    runsCompleted: v.number(),
    partyAWins: v.number(),
    partyBWins: v.number(),
    mutualGains: v.number(),
    failures: v.number(),

    avgPartyAScore: v.number(),
    avgPartyBScore: v.number(),
    avgTurnsToResolve: v.number(),

    // Best tactics discovered
    effectiveTactics: v.array(
      v.object({
        tactic: v.string(),
        successRate: v.number(),
      })
    ),
  }).index("by_scenario", ["scenarioId"]),

  // Track evolution across negotiation rounds
  negotiationRounds: defineTable({
    scenarioId: v.id("scenarios"),

    // Round tracking
    currentRound: v.number(),
    totalRounds: v.number(),

    // Evolution log
    evolutionLog: v.array(
      v.object({
        round: v.number(),
        partyName: v.string(),
        previousApproach: v.string(),
        newApproach: v.string(),
        reason: v.string(),
      })
    ),

    // Results per round
    roundResults: v.array(
      v.object({
        round: v.number(),
        negotiationId: v.id("negotiations"),
        outcomeType: v.string(),
        rankings: v.array(
          v.object({
            partyName: v.string(),
            score: v.number(),
            rank: v.number(),
          })
        ),
      })
    ),

    // Insights discovered
    insights: v.array(
      v.object({
        round: v.number(),
        insight: v.string(), // "Aggressive approaches failed against principled opponents"
      })
    ),

    status: v.string(), // "running" | "paused" | "completed"
    createdAt: v.number(),
  }).index("by_scenario", ["scenarioId"]),
});

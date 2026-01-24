# Negotiation Simulation - Implementation Plan

## Overview

Transform Stuhi from Split/Steal game into a **real-world grounded negotiation training simulator**.

**Core Loop:**
1. User picks/enters negotiation scenario
2. AI researches web for real context
3. System generates parties, stakes, outcomes
4. Run negotiations with different strategies
5. Discover optimal approaches through many simulations

---

## Phase 1: Setup & Dependencies

### 1.1 Install New Dependencies
```bash
bun add @tavily/core   # Web search API
```

### 1.2 Environment Variables
```env
# .env.local
TAVILY_API_KEY=tvly-xxxxx   # Get from tavily.com (free tier available)
```

### 1.3 Clean Up Old Code (Optional - can keep for reference)
- Keep existing agent/game infrastructure as reference
- We'll build new tables alongside

---

## Phase 2: Database Schema

### 2.1 Create `convex/schema.ts` additions

Add these new tables:

```typescript
// Scenarios - the negotiation setup
scenarios: defineTable({
  // Input
  sourceQuery: v.string(),              // "Greenland purchase"

  // Generated content
  title: v.string(),
  description: v.string(),

  // Research results
  context: v.string(),                  // Current situation summary
  keyFacts: v.array(v.object({
    fact: v.string(),
    source: v.optional(v.string()),
    confidence: v.string(),
  })),

  // Parties
  parties: v.array(v.object({
    name: v.string(),
    representative: v.string(),
    publicPosition: v.string(),
    interests: v.array(v.string()),
    redLines: v.array(v.string()),
    batna: v.string(),
    pressurePoints: v.array(v.string()),
    powerLevel: v.number(),
  })),

  // Possible outcomes
  possibleOutcomes: v.array(v.object({
    name: v.string(),
    description: v.string(),
    partyAScore: v.number(),
    partyBScore: v.number(),
    likelihood: v.string(),
  })),

  // Status
  status: v.string(),                   // researching | ready | active | completed
  statusMessage: v.optional(v.string()),

  // Analytics (filled after simulations)
  optimalStrategy: v.optional(v.string()),
  totalSimulations: v.optional(v.number()),

  createdAt: v.number(),
})
.index("by_status", ["status"]),

// Individual negotiation runs
negotiations: defineTable({
  scenarioId: v.id("scenarios"),
  runNumber: v.number(),

  // Strategy assignment
  partyAStrategy: v.string(),
  partyBStrategy: v.string(),

  // State
  phase: v.string(),                    // opening | bargaining | closing | resolved | failed
  currentTurn: v.number(),
  maxTurns: v.number(),

  // Outcome
  outcome: v.optional(v.object({
    type: v.string(),                   // deal | walkaway | timeout
    description: v.string(),
    finalOffer: v.optional(v.string()),
    partyAScore: v.number(),
    partyBScore: v.number(),
  })),

  createdAt: v.number(),
})
.index("by_scenario", ["scenarioId"])
.index("by_scenario_and_strategies", ["scenarioId", "partyAStrategy", "partyBStrategy"]),

// Individual moves in a negotiation
negotiationMoves: defineTable({
  negotiationId: v.id("negotiations"),
  turn: v.number(),
  party: v.string(),

  moveType: v.string(),                 // offer | counteroffer | concession | demand | threat | accept | reject | walkaway
  content: v.string(),                  // What they said
  reasoning: v.string(),                // Internal reasoning (not shown)

  emotionalTone: v.string(),            // firm | conciliatory | aggressive | neutral
  tacticUsed: v.string(),               // anchoring | reciprocity | deadline | appeal_to_fairness | etc

  createdAt: v.number(),
})
.index("by_negotiation", ["negotiationId"]),

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
  effectiveTactics: v.array(v.object({
    tactic: v.string(),
    successRate: v.number(),
  })),
})
.index("by_scenario", ["scenarioId"]),
```

### 2.2 Run Schema Migration
```bash
bunx convex dev  # Will prompt to push schema changes
```

---

## Phase 3: Research System

### 3.1 Create `convex/research/search.ts`

```typescript
// Web search integration with Tavily
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

export const searchWeb = action({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "advanced",
        max_results: 5,
        include_answer: true,
      }),
    });

    const data = await response.json();
    return {
      answer: data.answer,
      results: data.results.map((r: any) => ({
        title: r.title,
        url: r.url,
        content: r.content,
      })),
    };
  },
});
```

### 3.2 Create `convex/research/extract.ts`

```typescript
// Extract structured facts from search results
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const openai = new OpenAI();

export const extractFacts = action({
  args: {
    topic: v.string(),
    searchResults: v.array(v.object({
      title: v.string(),
      url: v.string(),
      content: v.string(),
    })),
    answer: v.optional(v.string()),
  },
  handler: async (ctx, { topic, searchResults, answer }) => {
    const prompt = `Analyze these search results about "${topic}":

${answer ? `Summary: ${answer}\n\n` : ""}
Sources:
${searchResults.map(r => `[${r.title}]\n${r.content}`).join("\n\n---\n\n")}

Extract and return JSON:
{
  "keyFacts": [
    { "fact": "...", "confidence": "high|medium|low" }
  ],
  "identifiedParties": [
    { "name": "...", "role": "...", "stance": "..." }
  ],
  "coreTensions": ["..."],
  "currentStatus": "1-2 sentence summary of current situation"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content!);
  },
});
```

### 3.3 Create `convex/research/generate.ts`

```typescript
// Generate parties and outcomes from research
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const openai = new OpenAI();

export const generateParties = action({
  args: {
    topic: v.string(),
    facts: v.any(),
  },
  handler: async (ctx, { topic, facts }) => {
    const prompt = `Based on research about "${topic}":

KEY FACTS:
${facts.keyFacts.map((f: any) => `• ${f.fact}`).join("\n")}

IDENTIFIED PARTIES:
${facts.identifiedParties.map((p: any) => `• ${p.name}: ${p.stance}`).join("\n")}

CORE TENSIONS:
${facts.coreTensions.join("\n")}

CURRENT STATUS:
${facts.currentStatus}

Generate detailed negotiation profiles for the 2 main parties as JSON:
{
  "parties": [
    {
      "name": "Official name",
      "representative": "Title of negotiator",
      "publicPosition": "What they say publicly",
      "interests": ["4-6 underlying interests/needs"],
      "redLines": ["2-3 absolute limits"],
      "batna": "Their best alternative if no deal",
      "pressurePoints": ["What could be exploited against them"],
      "powerLevel": 1-10
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content!);
  },
});

export const generateOutcomes = action({
  args: {
    topic: v.string(),
    parties: v.any(),
    currentStatus: v.string(),
  },
  handler: async (ctx, { topic, parties, currentStatus }) => {
    const prompt = `NEGOTIATION: ${topic}

CURRENT SITUATION: ${currentStatus}

PARTY A: ${parties[0].name}
- Wants: ${parties[0].interests.join(", ")}
- Red lines: ${parties[0].redLines.join(", ")}

PARTY B: ${parties[1].name}
- Wants: ${parties[1].interests.join(", ")}
- Red lines: ${parties[1].redLines.join(", ")}

Generate 6 realistic possible outcomes as JSON:
{
  "outcomes": [
    {
      "name": "Short name",
      "description": "What this deal looks like",
      "partyAScore": 0-100,
      "partyBScore": 0-100,
      "likelihood": "high|medium|low"
    }
  ]
}

Include: A wins, B wins, mutual gain, minimal deal, no deal, breakdown.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content!);
  },
});
```

---

## Phase 4: Scenario Management

### 4.1 Create `convex/scenarios/mutations.ts`

```typescript
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { sourceQuery: v.string() },
  handler: async (ctx, { sourceQuery }) => {
    return await ctx.db.insert("scenarios", {
      sourceQuery,
      title: "",
      description: "",
      context: "",
      keyFacts: [],
      parties: [],
      possibleOutcomes: [],
      status: "researching",
      statusMessage: "Starting research...",
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    id: v.id("scenarios"),
    status: v.optional(v.string()),
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, statusMessage }) => {
    const updates: any = {};
    if (status) updates.status = status;
    if (statusMessage) updates.statusMessage = statusMessage;
    await ctx.db.patch(id, updates);
  },
});

export const complete = internalMutation({
  args: {
    id: v.id("scenarios"),
    title: v.string(),
    description: v.string(),
    context: v.string(),
    keyFacts: v.any(),
    parties: v.any(),
    possibleOutcomes: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      context: args.context,
      keyFacts: args.keyFacts,
      parties: args.parties,
      possibleOutcomes: args.possibleOutcomes,
      status: "ready",
      statusMessage: "Scenario ready",
    });
  },
});
```

### 4.2 Create `convex/scenarios/queries.ts`

```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("scenarios") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("scenarios")
      .order("desc")
      .take(20);
  },
});

export const getReady = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("scenarios")
      .withIndex("by_status", q => q.eq("status", "ready"))
      .order("desc")
      .take(10);
  },
});
```

### 4.3 Create `convex/scenarios/actions.ts`

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

export const createFromTopic = action({
  args: { topic: v.string() },
  handler: async (ctx, { topic }) => {
    // Create scenario record
    const scenarioId = await ctx.runMutation(api.scenarios.mutations.create, {
      sourceQuery: topic,
    });

    // Step 1: Web search
    await ctx.runMutation(internal.scenarios.mutations.updateStatus, {
      id: scenarioId,
      statusMessage: "Searching the web...",
    });

    const queries = [
      `${topic} negotiation latest news`,
      `${topic} stakeholders positions`,
      `${topic} history background`,
    ];

    const searchResults = await Promise.all(
      queries.map(q => ctx.runAction(api.research.search.searchWeb, { query: q }))
    );

    const allResults = searchResults.flatMap(r => r.results);
    const answer = searchResults[0].answer;

    // Step 2: Extract facts
    await ctx.runMutation(internal.scenarios.mutations.updateStatus, {
      id: scenarioId,
      statusMessage: "Analyzing information...",
    });

    const facts = await ctx.runAction(api.research.extract.extractFacts, {
      topic,
      searchResults: allResults,
      answer,
    });

    // Step 3: Generate parties
    await ctx.runMutation(internal.scenarios.mutations.updateStatus, {
      id: scenarioId,
      statusMessage: "Generating negotiation parties...",
    });

    const { parties } = await ctx.runAction(api.research.generate.generateParties, {
      topic,
      facts,
    });

    // Step 4: Generate outcomes
    await ctx.runMutation(internal.scenarios.mutations.updateStatus, {
      id: scenarioId,
      statusMessage: "Mapping possible outcomes...",
    });

    const { outcomes } = await ctx.runAction(api.research.generate.generateOutcomes, {
      topic,
      parties,
      currentStatus: facts.currentStatus,
    });

    // Step 5: Generate title
    const titlePrompt = `Create a short compelling title (max 6 words) for a negotiation simulation about: ${topic}. Return JSON: {"title": "...", "description": "1-2 sentences"}`;

    // (Use OpenAI directly or create another action)
    const title = topic; // Simplified for now
    const description = facts.currentStatus;

    // Step 6: Save complete scenario
    await ctx.runMutation(internal.scenarios.mutations.complete, {
      id: scenarioId,
      title,
      description,
      context: facts.currentStatus,
      keyFacts: facts.keyFacts,
      parties,
      possibleOutcomes: outcomes,
    });

    return scenarioId;
  },
});
```

---

## Phase 5: Negotiation Engine

### 5.1 Create `convex/negotiations/strategies.ts`

```typescript
export const STRATEGIES = [
  {
    name: "aggressive",
    label: "Aggressive",
    description: "High anchors, few concessions, time pressure",
    systemPrompt: `You are an aggressive negotiator.
- Start with extreme positions to anchor the negotiation
- Make the other party work hard for any concession
- Use deadlines and walkaway threats
- Show strength, never appear desperate
- Demand more than you expect to get`,
  },
  {
    name: "cooperative",
    label: "Cooperative",
    description: "Seek mutual gains, build trust",
    systemPrompt: `You are a cooperative negotiator.
- Focus on interests, not positions
- Look for creative win-win solutions
- Build rapport and trust
- Share information to find mutual gains
- Aim for sustainable long-term agreements`,
  },
  {
    name: "principled",
    label: "Principled",
    description: "Objective criteria, fair standards",
    systemPrompt: `You are a principled negotiator.
- Insist on objective criteria and fair standards
- Use precedents, market rates, expert opinions
- Separate people from problems
- Never yield to pressure, only to principle
- Focus on interests behind positions`,
  },
  {
    name: "strategic",
    label: "Strategic",
    description: "Analyze opponent, adapt tactics",
    systemPrompt: `You are a strategic negotiator.
- Carefully analyze opponent behavior and patterns
- Identify their constraints and pressures
- Control information asymmetry
- Time concessions strategically
- Adapt tactics based on what's working`,
  },
  {
    name: "emotional",
    label: "Emotional",
    description: "Build rapport, personal appeals",
    systemPrompt: `You are an emotional negotiator.
- Build genuine personal connection
- Use stories and appeals to shared values
- Show strategic vulnerability
- Create liking and reciprocity
- Make them want to help you succeed`,
  },
];

export function getStrategy(name: string) {
  return STRATEGIES.find(s => s.name === name) || STRATEGIES[0];
}
```

### 5.2 Create `convex/negotiations/mutations.ts`

```typescript
import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    runNumber: v.number(),
    partyAStrategy: v.string(),
    partyBStrategy: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("negotiations", {
      ...args,
      phase: "opening",
      currentTurn: 0,
      maxTurns: 10,
      createdAt: Date.now(),
    });
  },
});

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
    await ctx.db.insert("negotiationMoves", {
      ...args,
      createdAt: Date.now(),
    });

    // Update negotiation turn
    await ctx.db.patch(args.negotiationId, {
      currentTurn: args.turn + 1,
    });
  },
});

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
```

### 5.3 Create `convex/negotiations/queries.ts`

```typescript
import { query } from "../_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("negotiations") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getMoves = query({
  args: { negotiationId: v.id("negotiations") },
  handler: async (ctx, { negotiationId }) => {
    return await ctx.db
      .query("negotiationMoves")
      .withIndex("by_negotiation", q => q.eq("negotiationId", negotiationId))
      .order("asc")
      .collect();
  },
});

export const getByScenario = query({
  args: { scenarioId: v.id("scenarios") },
  handler: async (ctx, { scenarioId }) => {
    return await ctx.db
      .query("negotiations")
      .withIndex("by_scenario", q => q.eq("scenarioId", scenarioId))
      .order("desc")
      .take(50);
  },
});
```

### 5.4 Create `convex/negotiations/engine.ts`

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import OpenAI from "openai";
import { getStrategy } from "./strategies";

const openai = new OpenAI();

export const runNegotiation = action({
  args: {
    scenarioId: v.id("scenarios"),
    partyAStrategy: v.string(),
    partyBStrategy: v.string(),
    runNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: args.scenarioId
    });

    if (!scenario) throw new Error("Scenario not found");

    // Create negotiation record
    const negotiationId = await ctx.runMutation(
      internal.negotiations.mutations.create,
      {
        scenarioId: args.scenarioId,
        runNumber: args.runNumber ?? 1,
        partyAStrategy: args.partyAStrategy,
        partyBStrategy: args.partyBStrategy,
      }
    );

    const maxTurns = 10;
    let turn = 0;
    let resolved = false;
    const moves: any[] = [];

    while (!resolved && turn < maxTurns) {
      const isPartyA = turn % 2 === 0;
      const currentParty = scenario.parties[isPartyA ? 0 : 1];
      const otherParty = scenario.parties[isPartyA ? 1 : 0];
      const strategy = getStrategy(isPartyA ? args.partyAStrategy : args.partyBStrategy);

      // Generate move
      const move = await generateMove({
        scenario,
        currentParty,
        otherParty,
        strategy,
        moves,
        turn,
      });

      // Store move
      await ctx.runMutation(internal.negotiations.mutations.addMove, {
        negotiationId,
        turn,
        party: currentParty.name,
        ...move,
      });

      moves.push({ party: currentParty.name, ...move });

      // Check if resolved
      if (move.moveType === "accept" || move.moveType === "walkaway") {
        resolved = true;

        const outcome = await scoreOutcome({
          scenario,
          moves,
          finalMoveType: move.moveType,
          partyAStrategy: args.partyAStrategy,
          partyBStrategy: args.partyBStrategy,
        });

        await ctx.runMutation(internal.negotiations.mutations.complete, {
          negotiationId,
          outcome,
        });
      }

      turn++;
    }

    // If hit max turns without resolution
    if (!resolved) {
      await ctx.runMutation(internal.negotiations.mutations.complete, {
        negotiationId,
        outcome: {
          type: "timeout",
          description: "Negotiations stalled without agreement",
          partyAScore: 20,
          partyBScore: 20,
        },
      });
    }

    return negotiationId;
  },
});

async function generateMove({
  scenario,
  currentParty,
  otherParty,
  strategy,
  moves,
  turn,
}: any) {
  const prompt = `You are ${currentParty.representative} representing ${currentParty.name}.

SCENARIO: ${scenario.description}

YOUR INTERESTS:
${currentParty.interests.map((i: string) => `- ${i}`).join("\n")}

YOUR RED LINES (cannot accept):
${currentParty.redLines.map((r: string) => `- ${r}`).join("\n")}

YOUR BATNA (alternative if no deal):
${currentParty.batna}

OPPONENT (${otherParty.name}) INTERESTS:
${otherParty.interests.map((i: string) => `- ${i}`).join("\n")}

YOUR NEGOTIATION STRATEGY:
${strategy.systemPrompt}

CONVERSATION SO FAR:
${moves.length === 0 ? "(Opening - you speak first)" : moves.map((m: any) => `${m.party}: [${m.moveType}] ${m.content}`).join("\n")}

Turn ${turn + 1} of 10.

Generate your next move. Choose moveType from:
- offer: Make a specific proposal
- counteroffer: Modify their proposal
- concession: Give ground on something
- demand: Insist on something
- threat: Warn of consequences
- accept: Accept current terms (ends negotiation)
- walkaway: End negotiations (ends negotiation)

Return JSON:
{
  "moveType": "...",
  "content": "What you say (2-3 sentences max)",
  "reasoning": "Your internal thinking (not shown to opponent)",
  "emotionalTone": "firm|conciliatory|aggressive|neutral",
  "tacticUsed": "anchoring|reciprocity|deadline|fairness|pressure|rapport|..."
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  return JSON.parse(response.choices[0].message.content!);
}

async function scoreOutcome({
  scenario,
  moves,
  finalMoveType,
  partyAStrategy,
  partyBStrategy,
}: any) {
  if (finalMoveType === "walkaway") {
    return {
      type: "walkaway",
      description: "Negotiations ended without agreement",
      partyAScore: 25,
      partyBScore: 25,
    };
  }

  // Use LLM to evaluate the deal
  const prompt = `Evaluate this negotiation outcome:

SCENARIO: ${scenario.description}

PARTY A (${scenario.parties[0].name}) wanted:
${scenario.parties[0].interests.join(", ")}

PARTY B (${scenario.parties[1].name}) wanted:
${scenario.parties[1].interests.join(", ")}

FINAL EXCHANGE:
${moves.slice(-3).map((m: any) => `${m.party}: ${m.content}`).join("\n")}

The deal was ACCEPTED.

Score how well each party did (0-100) based on how many of their interests were met.

Return JSON:
{
  "type": "deal",
  "description": "Brief description of what was agreed",
  "finalOffer": "The accepted terms",
  "partyAScore": 0-100,
  "partyBScore": 0-100
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!);
}
```

---

## Phase 6: Multi-Run Simulation

### 6.1 Create `convex/simulations/runner.ts`

```typescript
"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { STRATEGIES } from "../negotiations/strategies";

export const runStrategyDiscovery = action({
  args: {
    scenarioId: v.id("scenarios"),
    runsPerMatchup: v.number(),
  },
  handler: async (ctx, { scenarioId, runsPerMatchup }) => {
    const strategies = STRATEGIES.map(s => s.name);
    const results: any[] = [];
    let runNumber = 0;

    // Test all strategy combinations
    for (const stratA of strategies) {
      for (const stratB of strategies) {
        for (let i = 0; i < runsPerMatchup; i++) {
          runNumber++;

          const negotiationId = await ctx.runAction(
            api.negotiations.engine.runNegotiation,
            {
              scenarioId,
              partyAStrategy: stratA,
              partyBStrategy: stratB,
              runNumber,
            }
          );

          const negotiation = await ctx.runQuery(
            api.negotiations.queries.get,
            { id: negotiationId }
          );

          results.push({
            stratA,
            stratB,
            outcome: negotiation?.outcome,
          });
        }
      }
    }

    // Aggregate results
    const analysis = analyzeResults(results);

    // Update scenario with findings
    await ctx.runMutation(internal.scenarios.mutations.updateStatus, {
      id: scenarioId,
      status: "completed",
      statusMessage: `Completed ${runNumber} simulations`,
    });

    return analysis;
  },
});

function analyzeResults(results: any[]) {
  const strategyStats: Record<string, { wins: number; total: number; avgScore: number }> = {};

  for (const r of results) {
    // Track Party A strategy performance
    if (!strategyStats[r.stratA]) {
      strategyStats[r.stratA] = { wins: 0, total: 0, avgScore: 0 };
    }
    strategyStats[r.stratA].total++;
    if (r.outcome?.partyAScore > r.outcome?.partyBScore) {
      strategyStats[r.stratA].wins++;
    }
    strategyStats[r.stratA].avgScore += r.outcome?.partyAScore || 0;
  }

  // Calculate averages and rank
  const rankings = Object.entries(strategyStats)
    .map(([strategy, stats]) => ({
      strategy,
      winRate: stats.wins / stats.total,
      avgScore: stats.avgScore / stats.total,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  return {
    rankings,
    bestStrategy: rankings[0]?.strategy,
    totalRuns: results.length,
  };
}
```

---

## Phase 7: Frontend

### 7.1 Create `src/components/scenario/ScenarioSetup.tsx`

```tsx
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const PRESETS = [
  { id: "greenland", label: "Greenland Purchase", query: "US purchasing Greenland from Denmark" },
  { id: "trade", label: "US-China Trade War", query: "US China tariff trade negotiations" },
  { id: "climate", label: "Climate Agreement", query: "International climate emissions agreement" },
  { id: "hostage", label: "Hostage Negotiation", query: "International hostage prisoner exchange" },
];

export function ScenarioSetup({ onStart }: { onStart: (id: string) => void }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const createScenario = useMutation(api.scenarios.actions.createFromTopic);

  const handleCreate = async (query: string) => {
    setLoading(true);
    try {
      const id = await createScenario({ topic: query });
      onStart(id);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) {
    return <ScenarioLoader />;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-white mb-2">
        Negotiation Simulator
      </h1>
      <p className="text-zinc-400 mb-8">
        Train AI on real-world negotiation scenarios
      </p>

      {/* Custom input */}
      <div className="mb-8">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Enter a negotiation scenario..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white mb-3"
        />
        <button
          onClick={() => handleCreate(topic)}
          disabled={!topic}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 rounded-lg font-medium text-white"
        >
          Research & Generate
        </button>
      </div>

      {/* Presets */}
      <p className="text-zinc-500 mb-4">Or choose a preset:</p>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleCreate(preset.query)}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-left"
          >
            <span className="text-white font-medium">{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScenarioLoader() {
  return (
    <div className="max-w-md mx-auto p-8 text-center">
      <div className="text-6xl mb-4 animate-bounce">🔍</div>
      <h2 className="text-xl text-white mb-2">Researching scenario...</h2>
      <p className="text-zinc-400">Searching the web and generating parties</p>
    </div>
  );
}
```

### 7.2 Create `src/components/scenario/ScenarioPreview.tsx`

```tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function ScenarioPreview({
  scenarioId,
  onStart,
}: {
  scenarioId: Id<"scenarios">;
  onStart: () => void;
}) {
  const scenario = useQuery(api.scenarios.queries.get, { id: scenarioId });

  if (!scenario || scenario.status === "researching") {
    return <div className="p-8 text-center text-white">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-2">{scenario.title}</h1>
      <p className="text-zinc-400 mb-8">{scenario.description}</p>

      {/* Key Facts */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-white mb-3">Key Facts</h2>
        <ul className="space-y-2">
          {scenario.keyFacts.slice(0, 5).map((f, i) => (
            <li key={i} className="text-zinc-300">• {f.fact}</li>
          ))}
        </ul>
      </div>

      {/* Parties */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {scenario.parties.map((party, i) => (
          <div key={i} className="bg-zinc-900 rounded-lg p-4">
            <h3 className="text-xl font-bold text-white mb-1">{party.name}</h3>
            <p className="text-zinc-400 text-sm mb-3">{party.representative}</p>

            <p className="text-sm text-zinc-500 mb-2">Interests:</p>
            <ul className="text-sm text-zinc-300 mb-3">
              {party.interests.slice(0, 3).map((interest, j) => (
                <li key={j}>• {interest}</li>
              ))}
            </ul>

            <p className="text-sm text-zinc-500 mb-1">Red Lines:</p>
            <ul className="text-sm text-red-400">
              {party.redLines.map((line, j) => (
                <li key={j}>• {line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-lg text-white font-bold text-lg"
      >
        Start Negotiations
      </button>
    </div>
  );
}
```

### 7.3 Create `src/components/negotiation/NegotiationView.tsx`

```tsx
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function NegotiationView({
  negotiationId,
  scenario,
}: {
  negotiationId: Id<"negotiations">;
  scenario: any;
}) {
  const negotiation = useQuery(api.negotiations.queries.get, { id: negotiationId });
  const moves = useQuery(api.negotiations.queries.getMoves, { negotiationId });

  if (!negotiation) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-white">
          <span className="font-bold">{scenario.parties[0].name}</span>
          <span className="text-zinc-500 mx-2">({negotiation.partyAStrategy})</span>
        </div>
        <div className="text-zinc-500">vs</div>
        <div className="text-white text-right">
          <span className="font-bold">{scenario.parties[1].name}</span>
          <span className="text-zinc-500 mx-2">({negotiation.partyBStrategy})</span>
        </div>
      </div>

      {/* Moves */}
      <div className="space-y-4 mb-8">
        {moves?.map((move, i) => {
          const isPartyA = move.party === scenario.parties[0].name;
          return (
            <div
              key={i}
              className={`flex ${isPartyA ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-md p-4 rounded-lg ${
                  isPartyA ? "bg-blue-900/50" : "bg-green-900/50"
                }`}
              >
                <div className="text-xs text-zinc-400 mb-1">
                  {move.party} • {move.moveType} • {move.tacticUsed}
                </div>
                <p className="text-white">{move.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Outcome */}
      {negotiation.outcome && (
        <div className="bg-zinc-900 rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">
            {negotiation.outcome.type === "deal" ? "🤝" : "💔"}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {negotiation.outcome.type === "deal" ? "Deal Reached" : "No Agreement"}
          </h3>
          <p className="text-zinc-400 mb-4">{negotiation.outcome.description}</p>
          <div className="flex justify-center gap-8">
            <div>
              <div className="text-3xl font-bold text-blue-400">
                {negotiation.outcome.partyAScore}
              </div>
              <div className="text-zinc-500">{scenario.parties[0].name}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">
                {negotiation.outcome.partyBScore}
              </div>
              <div className="text-zinc-500">{scenario.parties[1].name}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 7.4 Update `src/App.tsx`

```tsx
import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { ScenarioSetup } from "./components/scenario/ScenarioSetup";
import { ScenarioPreview } from "./components/scenario/ScenarioPreview";
import { NegotiationView } from "./components/negotiation/NegotiationView";
import { STRATEGIES } from "../convex/negotiations/strategies";

type Phase = "setup" | "preview" | "configure" | "negotiation" | "analysis";

function App() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [negotiationId, setNegotiationId] = useState<string | null>(null);
  const [strategies, setStrategies] = useState({ a: "cooperative", b: "aggressive" });

  const scenario = useQuery(
    api.scenarios.queries.get,
    scenarioId ? { id: scenarioId as any } : "skip"
  );

  const runNegotiation = useAction(api.negotiations.engine.runNegotiation);

  const handleStartNegotiation = async () => {
    if (!scenarioId) return;
    setPhase("negotiation");
    const id = await runNegotiation({
      scenarioId: scenarioId as any,
      partyAStrategy: strategies.a,
      partyBStrategy: strategies.b,
    });
    setNegotiationId(id);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">NEGOTIATION SIM</h1>
          {phase !== "setup" && (
            <button
              onClick={() => {
                setPhase("setup");
                setScenarioId(null);
                setNegotiationId(null);
              }}
              className="text-zinc-400 hover:text-white"
            >
              ← New Scenario
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      {phase === "setup" && (
        <ScenarioSetup
          onStart={(id) => {
            setScenarioId(id);
            setPhase("preview");
          }}
        />
      )}

      {phase === "preview" && scenarioId && (
        <ScenarioPreview
          scenarioId={scenarioId as any}
          onStart={() => setPhase("configure")}
        />
      )}

      {phase === "configure" && scenario && (
        <div className="max-w-2xl mx-auto p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Configure Strategies</h2>

          {/* Party A */}
          <div className="mb-6">
            <label className="text-zinc-400 mb-2 block">
              {scenario.parties[0].name} strategy:
            </label>
            <select
              value={strategies.a}
              onChange={(e) => setStrategies({ ...strategies, a: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white"
            >
              {STRATEGIES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label} - {s.description}
                </option>
              ))}
            </select>
          </div>

          {/* Party B */}
          <div className="mb-8">
            <label className="text-zinc-400 mb-2 block">
              {scenario.parties[1].name} strategy:
            </label>
            <select
              value={strategies.b}
              onChange={(e) => setStrategies({ ...strategies, b: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white"
            >
              {STRATEGIES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.label} - {s.description}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleStartNegotiation}
            className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-lg text-white font-bold"
          >
            Run Negotiation
          </button>
        </div>
      )}

      {phase === "negotiation" && negotiationId && scenario && (
        <NegotiationView
          negotiationId={negotiationId as any}
          scenario={scenario}
        />
      )}
    </div>
  );
}

export default App;
```

---

## Phase 8: Polish & Demo

### 8.1 Add Loading States
- Skeleton loaders for scenario generation
- Progress indicators for research steps
- Typewriter effect for negotiation moves

### 8.2 Add Analysis View
- Strategy comparison charts
- Win rate by strategy
- Optimal strategy display

### 8.3 Demo Flow
1. Pick "Greenland" preset
2. Show research happening (web search animation)
3. Display generated parties & stakes
4. Run single negotiation (aggressive vs cooperative)
5. Show outcome
6. "Run 25 simulations" → show strategy rankings

---

## Quick Reference: File Structure

```
convex/
├── schema.ts                    # ADD new tables
├── research/
│   ├── search.ts               # NEW - web search
│   ├── extract.ts              # NEW - fact extraction
│   └── generate.ts             # NEW - party/outcome generation
├── scenarios/
│   ├── mutations.ts            # NEW
│   ├── queries.ts              # NEW
│   └── actions.ts              # NEW - main create flow
├── negotiations/
│   ├── strategies.ts           # NEW - strategy definitions
│   ├── mutations.ts            # NEW
│   ├── queries.ts              # NEW
│   └── engine.ts               # NEW - negotiation loop
└── simulations/
    └── runner.ts               # NEW - multi-run discovery

src/
├── App.tsx                      # UPDATE - new flow
└── components/
    ├── scenario/
    │   ├── ScenarioSetup.tsx   # NEW
    │   └── ScenarioPreview.tsx # NEW
    └── negotiation/
        └── NegotiationView.tsx # NEW
```

---

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 2 | Schema + migrations | 30 min |
| 3 | Research system | 1 hour |
| 4 | Scenario management | 45 min |
| 5 | Negotiation engine | 1.5 hours |
| 6 | Multi-run simulation | 45 min |
| 7 | Frontend | 2 hours |
| 8 | Polish | 1 hour |
| **Total** | | **~8 hours** |

---

## Start Command

```bash
# Terminal 1
bun run dev

# Terminal 2
bunx convex dev

# Get Tavily API key
# https://tavily.com (free tier: 1000 searches/month)
```

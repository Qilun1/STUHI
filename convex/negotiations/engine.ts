"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { getStrategy } from "./strategies";
import { Doc, Id } from "../_generated/dataModel";

// Types for internal use
interface NegotiationMove {
  party: string;
  moveType: string;
  content: string;
  reasoning: string;
  emotionalTone: string;
  tacticUsed: string;
}

interface MoveResponse {
  moveType: string;
  content: string;
  reasoning: string;
  emotionalTone: string;
  tacticUsed: string;
}

interface OutcomeResponse {
  type: string;
  description: string;
  finalOffer?: string;
  partyAScore: number;
  partyBScore: number;
}

// OpenAI API helper with retry logic
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    responseFormat?: "json_object";
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || "gpt-4o-mini",
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 500,
        ...(options.responseFormat && {
          response_format: { type: options.responseFormat },
        }),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    }

    const errorText = await response.text();
    lastError = new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  throw lastError || new Error("Max retries exceeded");
}

// Build the prompt for generating a move
function buildMovePrompt(
  scenario: Doc<"scenarios">,
  currentPartyIndex: number,
  strategy: ReturnType<typeof getStrategy>,
  moves: NegotiationMove[],
  turn: number,
  maxTurns: number
): string {
  const currentParty = scenario.parties[currentPartyIndex];
  const otherParty = scenario.parties[currentPartyIndex === 0 ? 1 : 0];

  const conversationHistory =
    moves.length === 0
      ? "(Opening move - you speak first)"
      : moves
          .map(
            (m, i) =>
              `Turn ${i + 1} - ${m.party} [${m.moveType}]: "${m.content}"`
          )
          .join("\n");

  return `You are ${currentParty.representative} representing ${currentParty.name}.

SCENARIO: ${scenario.description}

YOUR INTERESTS (what you want to achieve):
${currentParty.interests.map((i) => `- ${i}`).join("\n")}

YOUR RED LINES (cannot accept under any circumstances):
${currentParty.redLines.map((r) => `- ${r}`).join("\n")}

YOUR BATNA (best alternative if no deal):
${currentParty.batna}

YOUR PRESSURE POINTS (vulnerabilities):
${currentParty.pressurePoints.map((p) => `- ${p}`).join("\n")}

OPPONENT: ${otherParty.name}
Their representative: ${otherParty.representative}
Their public position: ${otherParty.publicPosition}
Their likely interests:
${otherParty.interests.map((i) => `- ${i}`).join("\n")}

YOUR NEGOTIATION STRATEGY:
${strategy.systemPrompt}

NEGOTIATION SO FAR:
${conversationHistory}

This is turn ${turn + 1} of ${maxTurns}. ${turn >= maxTurns - 2 ? "TIME IS RUNNING OUT - consider closing or walking away." : ""}

Generate your next move. Choose moveType from:
- offer: Make a specific proposal
- counteroffer: Modify their proposal
- concession: Give ground on something
- demand: Insist on something specific
- threat: Warn of consequences if they don't agree
- accept: Accept current terms (ENDS NEGOTIATION - only if deal is acceptable)
- walkaway: End negotiations without deal (ENDS NEGOTIATION - use if deal violates red lines)

Respond with ONLY a JSON object:
{
  "moveType": "offer|counteroffer|concession|demand|threat|accept|walkaway",
  "content": "What you say to the opponent (2-4 sentences, be specific about terms)",
  "reasoning": "Your internal strategic thinking (not shown to opponent)",
  "emotionalTone": "firm|conciliatory|aggressive|neutral",
  "tacticUsed": "one of: anchoring, deadline, reciprocity, fairness, pressure, rapport, information_control, precedent, etc."
}`;
}

// Parse the LLM response into a structured move
function parseMove(response: string): MoveResponse {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        moveType: parsed.moveType || "offer",
        content: parsed.content || "...",
        reasoning: parsed.reasoning || "",
        emotionalTone: parsed.emotionalTone || "neutral",
        tacticUsed: parsed.tacticUsed || "unknown",
      };
    }
  } catch (e) {
    // Fallback parsing
  }

  return {
    moveType: "offer",
    content: response.slice(0, 200),
    reasoning: "Failed to parse structured response",
    emotionalTone: "neutral",
    tacticUsed: "unknown",
  };
}

// Score the outcome of a negotiation
async function scoreOutcome(
  scenario: Doc<"scenarios">,
  moves: NegotiationMove[],
  finalMoveType: string
): Promise<OutcomeResponse> {
  // Walkaway = both get BATNA equivalent (low score)
  if (finalMoveType === "walkaway") {
    return {
      type: "walkaway",
      description: "Negotiations ended without agreement. Both parties fall back to their alternatives.",
      partyAScore: 25,
      partyBScore: 25,
    };
  }

  // Accept = evaluate the deal
  if (finalMoveType === "accept") {
    const lastFewMoves = moves.slice(-4);
    const prompt = `Evaluate this negotiation outcome:

SCENARIO: ${scenario.description}

PARTY A (${scenario.parties[0].name}) wanted:
${scenario.parties[0].interests.join(", ")}
Red lines: ${scenario.parties[0].redLines.join(", ")}

PARTY B (${scenario.parties[1].name}) wanted:
${scenario.parties[1].interests.join(", ")}
Red lines: ${scenario.parties[1].redLines.join(", ")}

FINAL EXCHANGE:
${lastFewMoves.map((m) => `${m.party}: "${m.content}"`).join("\n")}

The deal was ACCEPTED.

Score how well each party did (0-100) based on:
- How many of their interests were satisfied
- Whether they avoided their red lines
- The balance of the final terms

Return ONLY JSON:
{
  "type": "deal",
  "description": "Brief 1-sentence description of what was agreed",
  "finalOffer": "The key terms of the accepted deal",
  "partyAScore": <0-100>,
  "partyBScore": <0-100>
}`;

    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      { responseFormat: "json_object", temperature: 0.3 }
    );

    try {
      const parsed = JSON.parse(response);
      return {
        type: "deal",
        description: parsed.description || "Deal reached",
        finalOffer: parsed.finalOffer,
        partyAScore: Math.min(100, Math.max(0, parsed.partyAScore || 50)),
        partyBScore: Math.min(100, Math.max(0, parsed.partyBScore || 50)),
      };
    } catch (e) {
      return {
        type: "deal",
        description: "Deal reached (details unclear)",
        partyAScore: 50,
        partyBScore: 50,
      };
    }
  }

  // Timeout
  return {
    type: "timeout",
    description: "Negotiations stalled without reaching agreement within the time limit.",
    partyAScore: 20,
    partyBScore: 20,
  };
}

// Main negotiation runner
export const runNegotiation = action({
  args: {
    scenarioId: v.id("scenarios"),
    partyAStrategy: v.string(),
    partyBStrategy: v.string(),
    runNumber: v.optional(v.number()),
    maxTurns: v.optional(v.number()),
  },
  returns: v.id("negotiations"),
  handler: async (ctx, args) => {
    // Load scenario
    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: args.scenarioId,
    });

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    if (scenario.parties.length < 2) {
      throw new Error("Scenario must have at least 2 parties");
    }

    const maxTurns = args.maxTurns ?? 10;

    // Create negotiation record
    const negotiationId: Id<"negotiations"> = await ctx.runMutation(
      internal.negotiations.mutations.create,
      {
        scenarioId: args.scenarioId,
        runNumber: args.runNumber ?? 1,
        partyAStrategy: args.partyAStrategy,
        partyBStrategy: args.partyBStrategy,
        maxTurns,
      }
    );

    // Run negotiation loop
    const moves: NegotiationMove[] = [];
    let turn = 0;
    let resolved = false;
    let finalMoveType = "timeout";

    while (!resolved && turn < maxTurns) {
      // Determine whose turn it is (alternating)
      const isPartyA = turn % 2 === 0;
      const currentPartyIndex = isPartyA ? 0 : 1;
      const currentParty = scenario.parties[currentPartyIndex];
      const strategyName = isPartyA ? args.partyAStrategy : args.partyBStrategy;
      const strategy = getStrategy(strategyName);

      // Update phase based on turn
      let phase = "opening";
      if (turn >= 2 && turn < maxTurns - 2) phase = "bargaining";
      if (turn >= maxTurns - 2) phase = "closing";

      await ctx.runMutation(internal.negotiations.mutations.updatePhase, {
        negotiationId,
        phase,
      });

      // Generate move
      const prompt = buildMovePrompt(
        scenario,
        currentPartyIndex,
        strategy,
        moves,
        turn,
        maxTurns
      );

      const response = await callOpenAI(
        [{ role: "user", content: prompt }],
        { responseFormat: "json_object", temperature: 0.8 }
      );

      const move = parseMove(response);

      // Store the move
      await ctx.runMutation(internal.negotiations.mutations.addMove, {
        negotiationId,
        turn,
        party: currentParty.name,
        moveType: move.moveType,
        content: move.content,
        reasoning: move.reasoning,
        emotionalTone: move.emotionalTone,
        tacticUsed: move.tacticUsed,
      });

      // Track for scoring
      moves.push({
        party: currentParty.name,
        ...move,
      });

      // Check for termination
      if (move.moveType === "accept" || move.moveType === "walkaway") {
        resolved = true;
        finalMoveType = move.moveType;
      }

      turn++;
    }

    // Score the outcome
    const outcome = await scoreOutcome(scenario, moves, finalMoveType);

    // Complete the negotiation
    await ctx.runMutation(internal.negotiations.mutations.complete, {
      negotiationId,
      outcome,
    });

    return negotiationId;
  },
});

// Run a single turn (for step-by-step UI)
export const runSingleTurn = action({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (ctx, { negotiationId }): Promise<{
    done: boolean;
    negotiationId: string;
    move?: MoveResponse;
  }> => {
    // Get current negotiation state
    const negotiation = await ctx.runQuery(api.negotiations.queries.get, {
      id: negotiationId,
    });

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    if (negotiation.phase === "resolved" || negotiation.phase === "failed") {
      return { done: true, negotiationId };
    }

    // Get scenario
    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: negotiation.scenarioId,
    });

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    // Get existing moves
    const existingMoves = await ctx.runQuery(api.negotiations.queries.getMoves, {
      negotiationId,
    });

    const moves: NegotiationMove[] = existingMoves.map((m: Doc<"negotiationMoves">) => ({
      party: m.party,
      moveType: m.moveType,
      content: m.content,
      reasoning: m.reasoning,
      emotionalTone: m.emotionalTone,
      tacticUsed: m.tacticUsed,
    }));

    const turn = negotiation.currentTurn;

    // Check for timeout
    if (turn >= negotiation.maxTurns) {
      const outcome = await scoreOutcome(scenario, moves, "timeout");
      await ctx.runMutation(internal.negotiations.mutations.complete, {
        negotiationId,
        outcome,
      });
      return { done: true, negotiationId };
    }

    // Generate next move
    const isPartyA = turn % 2 === 0;
    const currentPartyIndex = isPartyA ? 0 : 1;
    const currentParty = scenario.parties[currentPartyIndex];
    const strategyName = isPartyA
      ? negotiation.partyAStrategy
      : negotiation.partyBStrategy;
    const strategy = getStrategy(strategyName || "balanced");

    const prompt = buildMovePrompt(
      scenario,
      currentPartyIndex,
      strategy,
      moves,
      turn,
      negotiation.maxTurns
    );

    const response = await callOpenAI(
      [{ role: "user", content: prompt }],
      { responseFormat: "json_object", temperature: 0.8 }
    );

    const move = parseMove(response);

    // Store the move
    await ctx.runMutation(internal.negotiations.mutations.addMove, {
      negotiationId,
      turn,
      party: currentParty.name,
      moveType: move.moveType,
      content: move.content,
      reasoning: move.reasoning,
      emotionalTone: move.emotionalTone,
      tacticUsed: move.tacticUsed,
    });

    // Check for termination
    if (move.moveType === "accept" || move.moveType === "walkaway") {
      moves.push({ party: currentParty.name, ...move });
      const outcome = await scoreOutcome(scenario, moves, move.moveType);
      await ctx.runMutation(internal.negotiations.mutations.complete, {
        negotiationId,
        outcome,
      });
      return { done: true, negotiationId };
    }

    return { done: false, negotiationId, move };
  },
});

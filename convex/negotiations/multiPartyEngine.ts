"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";

// Types
interface Move {
  party: string;
  moveType: string;
  content: string;
  reasoning: string;
  emotionalTone: string;
  tacticUsed: string;
  targetParties?: string[];
}

interface Alliance {
  members: string[];
  formedAtTurn: number;
  purpose: string;
}

interface PartyScore {
  partyName: string;
  score: number;
  satisfaction: string;
  wouldChange: string;
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
        temperature: options.temperature ?? 0.9,
        max_tokens: options.maxTokens ?? 600,
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

// Build prompt for multi-party context
function buildMultiPartyPrompt(
  scenario: Doc<"scenarios">,
  speakerIndex: number,
  moves: Move[],
  alliances: Alliance[],
  turn: number,
  maxTurns: number
): string {
  const speaker = scenario.parties[speakerIndex];
  const otherParties = scenario.parties.filter((_, i) => i !== speakerIndex);

  // Use the party's system prompt if available, otherwise build basic context
  const basePrompt = speaker.systemPrompt || `You are ${speaker.representative} representing ${speaker.name}.

YOUR INTERESTS:
${speaker.interests.map((i) => `- ${i}`).join("\n")}

YOUR RED LINES:
${speaker.redLines.map((r) => `- ${r}`).join("\n")}

YOUR BATNA:
${speaker.batna}`;

  // Group recent moves by party
  const recentByParty: Record<string, Move[]> = {};
  for (const m of moves.slice(-15)) {
    if (!recentByParty[m.party]) recentByParty[m.party] = [];
    recentByParty[m.party].push(m);
  }

  // Format alliance info
  const myAlliances = alliances.filter((a) => a.members.includes(speaker.name));
  const againstMe = alliances.filter(
    (a) => !a.members.includes(speaker.name) && a.members.length > 1
  );

  const allianceInfo = myAlliances.length > 0
    ? `You are allied with: ${myAlliances.map((a) => a.members.filter((m) => m !== speaker.name).join(", ")).join("; ")}`
    : "You have no alliances yet.";

  const enemyAllianceInfo = againstMe.length > 0
    ? `Other alliances: ${againstMe.map((a) => a.members.join(" + ")).join("; ")}`
    : "";

  return `${basePrompt}

=== CURRENT NEGOTIATION ===

SCENARIO: ${scenario.description}

OTHER PARTIES AT THE TABLE:
${otherParties
  .map(
    (p) => `
${p.name} (${p.representative})
- Power Level: ${p.powerLevel}/10
- Their Position: ${p.publicPosition}
${p.personality ? `- Their Style: ${p.personality.negotiationStyle}, ${p.personality.communicationTone}` : ""}
- Recent Moves: ${recentByParty[p.name]?.slice(-2).map((m) => `[${m.moveType}] ${m.content.slice(0, 60)}...`).join(" -> ") || "None yet"}`
  )
  .join("\n")}

ALLIANCES:
${allianceInfo}
${enemyAllianceInfo}

NEGOTIATION TRANSCRIPT:
${moves.length === 0 ? "(You speak first)" : moves.slice(-10).map((m) => `${m.party}: [${m.moveType}] "${m.content}"`).join("\n")}

Turn ${turn + 1} of ${maxTurns}. ${turn >= maxTurns - 3 ? "TIME IS RUNNING OUT." : ""}

=== YOUR MOVE ===

Choose your action:
- offer: Propose terms (to all or specific parties)
- counteroffer: Modify a proposal
- concession: Give ground
- demand: Insist on something
- alliance_proposal: Propose alliance with specific parties
- support: Publicly back another party's position
- challenge: Question or attack another party's position
- accept: Accept current deal (if one exists)
- walkaway: Leave negotiations

Return JSON:
{
  "moveType": "...",
  "targetParties": ["all"] or ["specific", "parties"],
  "content": "What you say - stay in character!",
  "reasoning": "Your internal thinking",
  "emotionalTone": "firm|conciliatory|aggressive|neutral|theatrical",
  "tacticUsed": "anchoring|coalition_building|divide_and_conquer|appeal_to_fairness|etc"
}`;
}

// Parse the LLM response into a structured move
function parseMove(response: string, partyName: string): Move {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        party: partyName,
        moveType: parsed.moveType || "offer",
        content: parsed.content || "...",
        reasoning: parsed.reasoning || "",
        emotionalTone: parsed.emotionalTone || "neutral",
        tacticUsed: parsed.tacticUsed || "unknown",
        targetParties: parsed.targetParties || ["all"],
      };
    }
  } catch {
    // Fallback parsing
  }

  return {
    party: partyName,
    moveType: "offer",
    content: response.slice(0, 200),
    reasoning: "Failed to parse structured response",
    emotionalTone: "neutral",
    tacticUsed: "unknown",
    targetParties: ["all"],
  };
}

// Detect alliances from moves
function detectAlliances(moves: Move[], existingAlliances: Alliance[]): Alliance[] {
  const alliances = [...existingAlliances];
  const currentTurn = moves.length;

  // Look for alliance proposals and supports in recent moves
  for (let i = Math.max(0, moves.length - 5); i < moves.length; i++) {
    const move = moves[i];

    if (move.moveType === "alliance_proposal" && move.targetParties) {
      // Check if there's an acceptance from target
      const targets = move.targetParties.filter((t) => t !== "all");
      for (const target of targets) {
        const acceptance = moves.slice(i + 1).find(
          (m) =>
            m.party === target &&
            (m.moveType === "support" || m.moveType === "accept") &&
            m.content.toLowerCase().includes("alliance")
        );

        if (acceptance) {
          // Check if alliance already exists
          const existsAlready = alliances.some(
            (a) => a.members.includes(move.party) && a.members.includes(target)
          );

          if (!existsAlready) {
            alliances.push({
              members: [move.party, target],
              formedAtTurn: currentTurn,
              purpose: `Alliance formed from ${move.party}'s proposal`,
            });
          }
        }
      }
    }

    // Detect implicit alliances from consistent support
    if (move.moveType === "support" && move.targetParties) {
      const supportedParty = move.targetParties[0];
      if (supportedParty && supportedParty !== "all") {
        // Count support moves between these parties
        const mutualSupport = moves.filter(
          (m) =>
            (m.party === supportedParty &&
              m.moveType === "support" &&
              m.targetParties?.includes(move.party)) ||
            (m.party === move.party &&
              m.moveType === "support" &&
              m.targetParties?.includes(supportedParty))
        );

        if (mutualSupport.length >= 2) {
          const existsAlready = alliances.some(
            (a) =>
              a.members.includes(move.party) && a.members.includes(supportedParty)
          );

          if (!existsAlready) {
            alliances.push({
              members: [move.party, supportedParty],
              formedAtTurn: currentTurn,
              purpose: "Implicit alliance from mutual support",
            });
          }
        }
      }
    }
  }

  return alliances;
}

// Check if negotiation has reached resolution
function checkForResolution(moves: Move[], partyCount: number): boolean {
  const recentMoves = moves.slice(-partyCount * 2);

  // Check for walkaway
  if (recentMoves.some((m) => m.moveType === "walkaway")) {
    return true;
  }

  // Check for broad acceptance
  const accepters = new Set(
    recentMoves.filter((m) => m.moveType === "accept").map((m) => m.party)
  );

  // Majority acceptance
  if (accepters.size >= Math.ceil(partyCount / 2)) {
    return true;
  }

  return false;
}

// Score the multi-party outcome
async function scoreMultiPartyOutcome(
  scenario: Doc<"scenarios">,
  moves: Move[],
  alliances: Alliance[]
): Promise<{
  type: string;
  description: string;
  finalDeal?: string;
  partyScores: PartyScore[];
  winningCoalition?: string[];
}> {
  const accepters = moves
    .filter((m) => m.moveType === "accept")
    .map((m) => m.party);
  const walkaways = moves
    .filter((m) => m.moveType === "walkaway")
    .map((m) => m.party);

  let outcomeType = "collapse";
  if (accepters.length >= scenario.parties.length / 2) {
    outcomeType = walkaways.length > 0 ? "partial" : "deal";
  }

  const lastFewMoves = moves.slice(-10);
  const prompt = `Evaluate this multi-party negotiation outcome:

SCENARIO: ${scenario.description}

PARTIES AND THEIR GOALS:
${scenario.parties
  .map(
    (p) => `${p.name}:
- Wanted: ${p.interests.join(", ")}
- Red lines: ${p.redLines.join(", ")}
- Style: ${p.personality?.negotiationStyle || "unknown"}`
  )
  .join("\n\n")}

ALLIANCES FORMED:
${alliances.length > 0 ? alliances.map((a) => `${a.members.join(" + ")}: ${a.purpose}`).join("\n") : "No alliances"}

FINAL EXCHANGE:
${lastFewMoves.map((m) => `${m.party} [${m.moveType}]: "${m.content}"`).join("\n")}

OUTCOME: ${outcomeType.toUpperCase()}
- Parties who accepted: ${accepters.join(", ") || "None"}
- Parties who walked away: ${walkaways.join(", ") || "None"}

Score how well each party did (0-100) and analyze:
1. How many of their interests were satisfied
2. Whether they avoided their red lines
3. Their negotiation performance
4. What they would do differently

Return ONLY JSON:
{
  "description": "Brief 1-2 sentence description of what happened",
  "finalDeal": "The key terms if a deal was reached",
  "partyScores": [
    {
      "partyName": "...",
      "score": 0-100,
      "satisfaction": "satisfied|neutral|dissatisfied",
      "wouldChange": "What they would do differently next time"
    }
  ],
  "winningCoalition": ["parties in the winning group"] or null
}`;

  const response = await callOpenAI([{ role: "user", content: prompt }], {
    responseFormat: "json_object",
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(response);
    return {
      type: outcomeType,
      description: parsed.description || "Negotiation concluded",
      finalDeal: parsed.finalDeal,
      partyScores: parsed.partyScores || [],
      winningCoalition: parsed.winningCoalition,
    };
  } catch {
    // Fallback scoring
    return {
      type: outcomeType,
      description: "Negotiation concluded (scoring failed)",
      partyScores: scenario.parties.map((p) => ({
        partyName: p.name,
        score: outcomeType === "deal" ? 50 : 25,
        satisfaction: "neutral",
        wouldChange: "Unknown",
      })),
    };
  }
}

// Main multi-party negotiation runner
export const runMultiPartyNegotiation = action({
  args: {
    scenarioId: v.id("scenarios"),
    roundNumber: v.optional(v.number()),
  },
  returns: v.id("negotiations"),
  handler: async (ctx, { scenarioId, roundNumber = 1 }) => {
    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: scenarioId,
    });

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    const partyCount = scenario.parties.length;
    if (partyCount < 2) {
      throw new Error("Scenario must have at least 2 parties");
    }

    const maxTurns = partyCount * 4; // ~4 speaking turns per party

    // Create negotiation with party snapshots
    const negotiationId: Id<"negotiations"> = await ctx.runMutation(
      internal.negotiations.multiPartyMutations.createMultiParty,
      {
        scenarioId,
        roundNumber,
        partySnapshots: scenario.parties.map((p: Doc<"scenarios">["parties"][0]) => ({
          partyName: p.name,
          generation: p.currentGeneration ?? 0,
          systemPrompt: p.systemPrompt || "",
        })),
        maxTurns,
      }
    );

    // Run negotiation loop
    const moves: Move[] = [];
    let alliances: Alliance[] = [];
    let turn = 0;
    let resolved = false;

    while (!resolved && turn < maxTurns) {
      const speakerIndex = turn % partyCount;
      const speaker = scenario.parties[speakerIndex];

      // Update phase and speaker
      let phase = "opening";
      if (turn >= 2 && turn < maxTurns - 3) phase = "bargaining";
      if (turn >= maxTurns - 3) phase = "closing";

      await ctx.runMutation(
        internal.negotiations.multiPartyMutations.updateMultiPartyState,
        {
          negotiationId,
          phase,
          currentSpeakerIndex: speakerIndex,
        }
      );

      // Generate move
      const prompt = buildMultiPartyPrompt(
        scenario,
        speakerIndex,
        moves,
        alliances,
        turn,
        maxTurns
      );

      const response = await callOpenAI([{ role: "user", content: prompt }], {
        responseFormat: "json_object",
        temperature: 0.9,
      });

      const move = parseMove(response, speaker.name);

      // Store move
      await ctx.runMutation(
        internal.negotiations.multiPartyMutations.addMultiPartyMove,
        {
          negotiationId,
          turn,
          party: move.party,
          moveType: move.moveType,
          content: move.content,
          reasoning: move.reasoning,
          emotionalTone: move.emotionalTone,
          tacticUsed: move.tacticUsed,
          targetParties: move.targetParties,
        }
      );

      moves.push(move);

      // Detect new alliances
      alliances = detectAlliances(moves, alliances);

      // Check for resolution
      if (checkForResolution(moves, partyCount)) {
        resolved = true;
      }

      turn++;
    }

    // Score outcome for all parties
    const outcome = await scoreMultiPartyOutcome(scenario, moves, alliances);

    await ctx.runMutation(
      internal.negotiations.multiPartyMutations.completeMultiParty,
      {
        negotiationId,
        outcome,
        alliances,
      }
    );

    return negotiationId;
  },
});

// Run a single turn for step-by-step UI
export const runSingleMultiPartyTurn = action({
  args: {
    negotiationId: v.id("negotiations"),
  },
  handler: async (
    ctx,
    { negotiationId }
  ): Promise<{
    done: boolean;
    negotiationId: string;
    move?: Move;
  }> => {
    const negotiation = await ctx.runQuery(api.negotiations.queries.get, {
      id: negotiationId,
    });

    if (!negotiation) {
      throw new Error("Negotiation not found");
    }

    if (negotiation.phase === "resolved" || negotiation.phase === "failed") {
      return { done: true, negotiationId };
    }

    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: negotiation.scenarioId,
    });

    if (!scenario) {
      throw new Error("Scenario not found");
    }

    // Get existing moves
    const existingMoves = await ctx.runQuery(
      api.negotiations.queries.getMoves,
      { negotiationId }
    );

    const moves: Move[] = existingMoves.map((m: Doc<"negotiationMoves">) => ({
      party: m.party,
      moveType: m.moveType,
      content: m.content,
      reasoning: m.reasoning,
      emotionalTone: m.emotionalTone,
      tacticUsed: m.tacticUsed,
      targetParties: m.targetParties || ["all"],
    }));

    const partyCount = scenario.parties.length;
    const turn = negotiation.currentTurn;

    // Check for timeout
    if (turn >= negotiation.maxTurns) {
      const alliances: Alliance[] = negotiation.alliances || [];
      const outcome = await scoreMultiPartyOutcome(scenario, moves, alliances);
      await ctx.runMutation(
        internal.negotiations.multiPartyMutations.completeMultiParty,
        {
          negotiationId,
          outcome,
          alliances,
        }
      );
      return { done: true, negotiationId };
    }

    const speakerIndex = turn % partyCount;
    const speaker = scenario.parties[speakerIndex];
    const alliances: Alliance[] = negotiation.alliances || [];

    // Generate move
    const prompt = buildMultiPartyPrompt(
      scenario,
      speakerIndex,
      moves,
      alliances,
      turn,
      negotiation.maxTurns
    );

    const response = await callOpenAI([{ role: "user", content: prompt }], {
      responseFormat: "json_object",
      temperature: 0.9,
    });

    const move = parseMove(response, speaker.name);

    // Store move
    await ctx.runMutation(
      internal.negotiations.multiPartyMutations.addMultiPartyMove,
      {
        negotiationId,
        turn,
        party: move.party,
        moveType: move.moveType,
        content: move.content,
        reasoning: move.reasoning,
        emotionalTone: move.emotionalTone,
        tacticUsed: move.tacticUsed,
        targetParties: move.targetParties,
      }
    );

    // Check for resolution
    const updatedMoves = [...moves, move];
    const updatedAlliances = detectAlliances(updatedMoves, alliances);

    // Update alliances in DB
    if (updatedAlliances.length > alliances.length) {
      await ctx.runMutation(
        internal.negotiations.multiPartyMutations.updateAlliances,
        {
          negotiationId,
          alliances: updatedAlliances,
        }
      );
    }

    if (
      move.moveType === "accept" ||
      move.moveType === "walkaway" ||
      checkForResolution(updatedMoves, partyCount)
    ) {
      const outcome = await scoreMultiPartyOutcome(
        scenario,
        updatedMoves,
        updatedAlliances
      );
      await ctx.runMutation(
        internal.negotiations.multiPartyMutations.completeMultiParty,
        {
          negotiationId,
          outcome,
          alliances: updatedAlliances,
        }
      );
      return { done: true, negotiationId };
    }

    return { done: false, negotiationId, move };
  },
});

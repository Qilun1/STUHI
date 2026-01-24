"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";

// OpenAI API helper
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    responseFormat?: "json_object";
    temperature?: number;
  } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o",
      messages,
      temperature: options.temperature ?? 0.7,
      ...(options.responseFormat && {
        response_format: { type: options.responseFormat },
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Generate a system prompt based on party personality
function generateSystemPrompt(party: {
  name: string;
  representative: string;
  interests: string[];
  redLines: string[];
  batna: string;
  personality: {
    negotiationStyle: string;
    communicationTone: string;
    riskTolerance: string;
    trustLevel: string;
    keyTraits: string[];
    historicalBehavior: string;
  };
}): string {
  return `You are ${party.representative} representing ${party.name}.

YOUR PERSONALITY:
- Negotiation Style: ${party.personality.negotiationStyle}
- Communication: ${party.personality.communicationTone}
- Risk Tolerance: ${party.personality.riskTolerance}
- Trust Level: ${party.personality.trustLevel}
- Key Traits: ${party.personality.keyTraits.join(", ")}

YOUR HISTORICAL BEHAVIOR:
${party.personality.historicalBehavior}

YOUR GOALS:
${party.interests.map((i: string) => `- ${i}`).join("\n")}

YOUR RED LINES (never cross these):
${party.redLines.map((r: string) => `- ${r}`).join("\n")}

YOUR BATNA (backup if no deal):
${party.batna}

NEGOTIATION INSTRUCTIONS:
1. Stay in character - negotiate as this person/entity ACTUALLY would
2. Use your natural communication style (${party.personality.communicationTone})
3. Take risks appropriate to your tolerance (${party.personality.riskTolerance})
4. Your trust level is ${party.personality.trustLevel} - act accordingly
5. Display your key traits: ${party.personality.keyTraits.join(", ")}

Remember: You are roleplaying a REAL negotiator. Be authentic to their known behavior.`;
}

// Apply evolution changes to a party
function applyEvolution(
  party: Doc<"scenarios">["parties"][0],
  evolution: {
    analysis: string;
    recommendedChanges: {
      negotiationStyle?: string;
      communicationTone?: string;
      riskTolerance?: string;
      newTraits?: string[];
      removeTraits?: string[];
    };
    newSystemPromptAdditions: string;
    evolutionSummary: string;
  }
): Doc<"scenarios">["parties"][0] {
  const updated = { ...party };

  if (!updated.personality) {
    return updated;
  }

  updated.currentGeneration = (party.currentGeneration ?? 0) + 1;

  // Apply personality changes
  if (
    evolution.recommendedChanges.negotiationStyle &&
    evolution.recommendedChanges.negotiationStyle !== "keep"
  ) {
    updated.personality = {
      ...updated.personality,
      negotiationStyle: evolution.recommendedChanges.negotiationStyle,
    };
  }
  if (
    evolution.recommendedChanges.communicationTone &&
    evolution.recommendedChanges.communicationTone !== "keep"
  ) {
    updated.personality = {
      ...updated.personality,
      communicationTone: evolution.recommendedChanges.communicationTone,
    };
  }
  if (
    evolution.recommendedChanges.riskTolerance &&
    evolution.recommendedChanges.riskTolerance !== "keep"
  ) {
    updated.personality = {
      ...updated.personality,
      riskTolerance: evolution.recommendedChanges.riskTolerance,
    };
  }

  // Update traits
  let keyTraits = [...(party.personality?.keyTraits || [])];
  if (evolution.recommendedChanges.removeTraits) {
    keyTraits = keyTraits.filter(
      (t) => !evolution.recommendedChanges.removeTraits?.includes(t)
    );
  }
  if (evolution.recommendedChanges.newTraits) {
    keyTraits = [...keyTraits, ...evolution.recommendedChanges.newTraits];
  }
  updated.personality = {
    ...updated.personality!,
    keyTraits,
  };

  // Regenerate system prompt
  updated.systemPrompt =
    generateSystemPrompt(updated as Parameters<typeof generateSystemPrompt>[0]) +
    `\n\nEVOLUTION NOTE: ${evolution.newSystemPromptAdditions}`;

  // Track evolution history
  updated.evolutionHistory = [
    ...(party.evolutionHistory || []),
    {
      generation: updated.currentGeneration!,
      change: evolution.evolutionSummary,
      reason: evolution.analysis,
    },
  ];

  return updated;
}

// Evolve losing parties after each round
export const evolveParties = action({
  args: {
    scenarioId: v.id("scenarios"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { scenarioId, roundNumber }) => {
    // Get results from this round
    const rounds = await ctx.runQuery(api.negotiationRounds.queries.get, {
      scenarioId,
    });
    const lastRound = rounds?.roundResults.find(
      (r: { round: number }) => r.round === roundNumber
    );

    if (!lastRound) {
      throw new Error("Round results not found");
    }

    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: scenarioId,
    });
    if (!scenario) {
      throw new Error("Scenario not found");
    }

    const evolutions: Array<{
      partyName: string;
      previousApproach: string;
      newApproach: string;
      reason: string;
    }> = [];

    // Identify losers (bottom half by score)
    const sorted = [...lastRound.rankings].sort((a, b) => b.score - a.score);
    const losers = sorted.slice(Math.ceil(sorted.length / 2));

    for (const loser of losers) {
      const party = scenario.parties.find((p: Doc<"scenarios">["parties"][0]) => p.name === loser.partyName);
      if (!party || !party.personality) continue;

      // Ask LLM how this party should adapt
      const prompt = `NEGOTIATION COACHING

${party.representative} representing ${party.name} just completed a negotiation.

THEIR APPROACH:
- Style: ${party.personality.negotiationStyle}
- Tone: ${party.personality.communicationTone}
- Risk: ${party.personality.riskTolerance}
- Traits: ${party.personality.keyTraits.join(", ")}

RESULT:
- Rank: ${loser.rank} out of ${sorted.length} parties
- Score: ${loser.score}/100
- Outcome: ${lastRound.outcomeType}

WHAT WORKED AGAINST THEM:
${sorted
  .slice(0, 2)
  .map((w) => `- ${w.partyName} (rank ${w.rank}, score ${w.score})`)
  .join("\n")}

Based on this outcome, how should ${party.name} adapt their approach for the next round?

Consider:
- Should they be more or less aggressive?
- Should they build more alliances?
- Should they change their communication style?
- What specific tactical changes would help?

Return JSON:
{
  "analysis": "What went wrong and why",
  "recommendedChanges": {
    "negotiationStyle": "new style or 'keep'",
    "communicationTone": "new tone or 'keep'",
    "riskTolerance": "new level or 'keep'",
    "newTraits": ["traits to add"],
    "removeTraits": ["traits to remove"]
  },
  "newSystemPromptAdditions": "2-3 sentences to add to their prompt",
  "evolutionSummary": "One sentence describing the change"
}`;

      const result = await callOpenAI([{ role: "user", content: prompt }], {
        responseFormat: "json_object",
      });

      const evolution = JSON.parse(result);

      // Apply evolution to party
      const updatedParty = applyEvolution(party, evolution);

      evolutions.push({
        partyName: party.name,
        previousApproach: `${party.personality.negotiationStyle}, ${party.personality.communicationTone}`,
        newApproach: `${updatedParty.personality?.negotiationStyle}, ${updatedParty.personality?.communicationTone}`,
        reason: evolution.evolutionSummary,
      });

      // Update party in scenario
      await ctx.runMutation(internal.scenarios.mutations.updateParty, {
        scenarioId,
        partyName: party.name,
        updates: updatedParty,
      });
    }

    // Log evolutions
    await ctx.runMutation(internal.negotiationRounds.mutations.addEvolutions, {
      scenarioId,
      round: roundNumber,
      evolutions,
    });

    return evolutions;
  },
});

// Generate insight from a round
export const generateRoundInsight = action({
  args: {
    scenarioId: v.id("scenarios"),
    roundNumber: v.number(),
  },
  handler: async (ctx, { scenarioId, roundNumber }) => {
    const rounds = await ctx.runQuery(api.negotiationRounds.queries.get, {
      scenarioId,
    });
    const lastRound = rounds?.roundResults.find(
      (r: { round: number }) => r.round === roundNumber
    );

    if (!lastRound) {
      return "Round results not available.";
    }

    const scenario = await ctx.runQuery(api.scenarios.queries.get, {
      id: scenarioId,
    });
    if (!scenario) {
      return "Scenario not found.";
    }

    const prompt = `Analyze this negotiation round and provide ONE key insight:

SCENARIO: ${scenario.title}

PARTIES AND THEIR STYLES:
${scenario.parties
  .map(
    (p: Doc<"scenarios">["parties"][0]) =>
      `- ${p.name}: ${p.personality?.negotiationStyle || "unknown"} style, ${p.personality?.communicationTone || "unknown"} tone`
  )
  .join("\n")}

ROUND ${roundNumber} RESULTS:
- Outcome: ${lastRound.outcomeType}
- Rankings: ${lastRound.rankings.map((r: { partyName: string; score: number; rank: number }) => `${r.partyName}: ${r.score}/100 (rank ${r.rank})`).join(", ")}

PREVIOUS EVOLUTIONS:
${rounds?.evolutionLog
  .filter((e: { round: number }) => e.round < roundNumber)
  .map(
    (e: { partyName: string; previousApproach: string; newApproach: string }) =>
      `- ${e.partyName}: ${e.previousApproach} -> ${e.newApproach}`
  )
  .join("\n") || "None yet"}

Provide ONE insight (1-2 sentences) about what negotiation pattern or lesson emerged from this round.
Focus on tactical observations, not just outcomes.

Return ONLY the insight text, no JSON.`;

    const insight = await callOpenAI([{ role: "user", content: prompt }], {
      temperature: 0.5,
    });

    await ctx.runMutation(internal.negotiationRounds.mutations.addInsight, {
      scenarioId,
      round: roundNumber,
      insight: insight.trim(),
    });

    return insight.trim();
  },
});

"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: { model?: string; responseFormat?: "json_object"; temperature?: number } = {}
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

// Legacy 2-party generation (backward compatible)
export const generateParties = action({
  args: {
    topic: v.string(),
    facts: v.any(),
  },
  handler: async (ctx, { topic, facts }) => {
    const prompt = `Based on research about "${topic}":

KEY FACTS:
${facts.keyFacts.map((f: { fact: string }) => `• ${f.fact}`).join("\n")}

IDENTIFIED PARTIES:
${facts.identifiedParties.map((p: { name: string; stance: string }) => `• ${p.name}: ${p.stance}`).join("\n")}

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

    const result = await callOpenAI(
      [{ role: "user", content: prompt }],
      { responseFormat: "json_object" }
    );

    return JSON.parse(result);
  },
});

// Multi-party generation with personalities
export const generateMultiPartyWithPersonalities = action({
  args: {
    topic: v.string(),
    facts: v.any(),
    partyCount: v.number(),
  },
  handler: async (ctx, { topic, facts, partyCount }) => {
    const prompt = `Based on research about "${topic}":

KEY FACTS:
${facts.keyFacts.map((f: { fact: string }) => `• ${f.fact}`).join("\n")}

IDENTIFIED PARTIES:
${facts.identifiedParties.map((p: { name: string; stance: string }) => `• ${p.name}: ${p.stance}`).join("\n")}

HISTORICAL CONTEXT:
${facts.currentStatus}

Generate ${partyCount} REALISTIC negotiation profiles based on REAL behavior patterns.

For each party, research their ACTUAL negotiation style:
- How do they typically negotiate? (aggressive, diplomatic, etc.)
- What's their communication style? (blunt, formal, emotional)
- Are they risk-takers or risk-averse?
- Do they trust easily or are they skeptical?
- What are their known behavioral patterns?

EXAMPLE for Trump in Greenland:
- Style: Aggressive, transactional
- Tone: Blunt, unpredictable
- Risk: High tolerance
- Trust: Skeptical
- Traits: "Deal-maker mindset", "Uses walkaway threats", "Values winning over relationships"
- Historical: "Known for surprise offers, aggressive opening positions, willing to walk away"

Return JSON:
{
  "parties": [
    {
      "name": "Official name (e.g., United States)",
      "representative": "Specific person or role (e.g., President Trump)",
      "publicPosition": "Their stated goal",
      "interests": ["4-6 underlying interests"],
      "redLines": ["2-3 absolute limits"],
      "batna": "Best alternative if no deal",
      "pressurePoints": ["Vulnerabilities"],
      "powerLevel": 1-10,
      "personality": {
        "negotiationStyle": "aggressive|diplomatic|principled|pragmatic|emotional",
        "communicationTone": "blunt|formal|warm|calculated|unpredictable",
        "riskTolerance": "high|medium|low",
        "trustLevel": "skeptical|neutral|trusting",
        "keyTraits": ["3-5 specific traits based on real behavior"],
        "historicalBehavior": "1-2 sentences about how they've negotiated before"
      },
      "potentialAllies": ["parties with aligned interests"],
      "rivals": ["parties with conflicting interests"]
    }
  ]
}`;

    const result = await callOpenAI(
      [{ role: "user", content: prompt }],
      { responseFormat: "json_object", temperature: 0.7 }
    );

    const parsed = JSON.parse(result);

    // Generate system prompts for each party based on personality
    for (const party of parsed.parties) {
      if (party.personality) {
        party.systemPrompt = generateSystemPrompt(party);
        party.currentGeneration = 0;
        party.evolutionHistory = [];
      }
    }

    return parsed;
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

    const result = await callOpenAI(
      [{ role: "user", content: prompt }],
      { responseFormat: "json_object" }
    );

    return JSON.parse(result);
  },
});

"use node";
import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: { responseFormat?: "json_object" } = {}
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
      model: "gpt-4o-mini",
      messages,
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

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

interface WebSearchResponse {
  answer: string;
  results: SearchResult[];
}

// Entry point - creates scenario and schedules research
export const createFromTopic = action({
  args: {
    topic: v.string(),
    partyCount: v.optional(v.number()), // If not provided, AI will determine based on the situation
  },
  handler: async (ctx, { topic, partyCount }): Promise<Id<"scenarios">> => {
    // Create scenario record immediately
    const scenarioId = await ctx.runMutation(api.scenarios.mutations.create, {
      sourceQuery: topic,
    });

    // Schedule research to run async - returns immediately so UI can poll
    await ctx.scheduler.runAfter(0, internal.scenarios.actions.runResearch, {
      scenarioId,
      topic,
      partyCount, // Pass partyCount (may be undefined, AI will determine)
    });

    return scenarioId;
  },
});

// Internal action that does the actual research work
export const runResearch = internalAction({
  args: {
    scenarioId: v.id("scenarios"),
    topic: v.string(),
    partyCount: v.optional(v.number()),
  },
  handler: async (ctx, { scenarioId, topic, partyCount }): Promise<void> => {
    // Step 1: Web search
    const queries = [
      `${topic} negotiation latest news`,
      `${topic} stakeholders positions`,
      `${topic} history background`,
    ];

    // Log each search query
    for (const query of queries) {
      await ctx.runMutation(internal.scenarios.mutations.addActivity, {
        id: scenarioId,
        type: "search",
        message: "Searching the web",
        detail: query,
      });
    }

    const searchResults: WebSearchResponse[] = await Promise.all(
      queries.map((q) =>
        ctx.runAction(api.research.search.searchWeb, { query: q })
      )
    );

    const allResults = searchResults.flatMap((r) => r.results);
    const answer = searchResults[0].answer;

    // Log search completion with sources
    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "search",
      message: "Web search complete",
      detail: `Found ${allResults.length} sources`,
      data: {
        sources: allResults.slice(0, 10).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 150),
        })),
      },
    });

    // Step 2: Extract facts
    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "analyze",
      message: "Extracting key facts",
      detail: "Analyzing search results with AI",
    });

    const facts = await ctx.runAction(api.research.extract.extractFacts, {
      topic,
      searchResults: allResults,
      answer,
    });

    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "analyze",
      message: "Facts extracted",
      detail: `Found ${facts.keyFacts?.length || 0} key facts, ${facts.identifiedParties?.length || 0} parties`,
      data: {
        items: [
          ...(facts.keyFacts?.slice(0, 5).map((f: { fact: string }) => `📌 ${f.fact}`) || []),
          ...(facts.identifiedParties?.map((p: { name: string; stance: string }) => `👤 ${p.name}: ${p.stance}`) || []),
        ],
      },
    });

    // Step 3: Determine party count if not specified
    let effectivePartyCount = partyCount;

    if (!effectivePartyCount) {
      await ctx.runMutation(internal.scenarios.mutations.addActivity, {
        id: scenarioId,
        type: "analyze",
        message: "Analyzing stakeholders",
        detail: "Determining relevant parties for this negotiation",
      });

      // Ask AI to determine optimal party count based on the situation
      const partyCountResult = await callOpenAI(
        [
          {
            role: "user",
            content: `Based on this negotiation topic and the identified stakeholders, determine how many parties should be involved:

TOPIC: ${topic}

IDENTIFIED PARTIES FROM RESEARCH:
${facts.identifiedParties?.map((p: { name: string; stance: string }) => `- ${p.name}: ${p.stance}`).join("\n") || "None identified"}

KEY FACTS:
${facts.keyFacts?.slice(0, 5).map((f: { fact: string }) => `- ${f.fact}`).join("\n") || "None"}

Rules:
- Minimum 2 parties, maximum 6 parties
- Include only parties who are DIRECTLY involved in the negotiation
- Consider sub-parties (e.g., Greenland is separate from Denmark in sovereignty discussions)
- Don't include observers unless they have real negotiating power

Return JSON:
{
  "partyCount": <2-6>,
  "reasoning": "Brief explanation",
  "suggestedParties": ["Party 1", "Party 2", ...]
}`,
          },
        ],
        { responseFormat: "json_object" }
      );

      const countData = JSON.parse(partyCountResult);
      effectivePartyCount = Math.min(6, Math.max(2, countData.partyCount || 2));

      await ctx.runMutation(internal.scenarios.mutations.addActivity, {
        id: scenarioId,
        type: "analyze",
        message: `Identified ${effectivePartyCount} key parties`,
        detail: countData.suggestedParties?.join(", ") || countData.reasoning,
        data: {
          items: countData.suggestedParties?.map((p: string) => `👤 ${p}`) || [],
        },
      });
    }

    // Step 4: Generate parties with personalities
    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "generate",
      message: "Generating party profiles",
      detail: `Creating ${effectivePartyCount} detailed negotiation profiles with personalities`,
    });

    // Use the multi-party generator if more than 2 parties or if personalities are needed
    const { parties } = effectivePartyCount > 2
      ? await ctx.runAction(
          api.research.generate.generateMultiPartyWithPersonalities,
          {
            topic,
            facts,
            partyCount: effectivePartyCount,
          }
        )
      : await ctx.runAction(
          api.research.generate.generateMultiPartyWithPersonalities,
          {
            topic,
            facts,
            partyCount: effectivePartyCount,
          }
        );

    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "generate",
      message: "Parties created",
      detail: parties.map((p: { name: string }) => p.name).join(parties.length > 3 ? ", " : " vs "),
      data: {
        items: parties.map(
          (p: { name: string; publicPosition: string; personality?: { negotiationStyle: string; communicationTone: string } }) =>
            `🏛️ ${p.name}${p.personality ? ` [${p.personality.negotiationStyle}, ${p.personality.communicationTone}]` : ""}\n   Position: ${p.publicPosition}`
        ),
      },
    });

    // Step 4: Generate outcomes
    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "generate",
      message: "Mapping possible outcomes",
      detail: "Generating realistic deal scenarios",
    });

    const { outcomes } = await ctx.runAction(
      api.research.generate.generateOutcomes,
      {
        topic,
        parties,
        currentStatus: facts.currentStatus,
      }
    );

    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "generate",
      message: "Outcomes mapped",
      detail: `${outcomes.length} possible outcomes`,
      data: {
        items: outcomes.map(
          (o: { name: string; description: string; likelihood: string }) =>
            `${o.likelihood === "high" ? "🟢" : o.likelihood === "medium" ? "🟡" : "🔴"} ${o.name}: ${o.description}`
        ),
      },
    });

    // Step 5: Generate title
    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "generate",
      message: "Finalizing scenario",
      detail: "Generating title and summary",
    });

    const titleResult = await callOpenAI(
      [
        {
          role: "user",
          content: `Create a short compelling title (max 6 words) for a negotiation simulation about: ${topic}. Return JSON: {"title": "...", "description": "1-2 sentences"}`,
        },
      ],
      { responseFormat: "json_object" }
    );

    const titleData = JSON.parse(titleResult);
    const title = titleData.title || topic;
    const description = titleData.description || facts.currentStatus;

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

    await ctx.runMutation(internal.scenarios.mutations.addActivity, {
      id: scenarioId,
      type: "complete",
      message: "Research complete",
      detail: title,
    });
  },
});

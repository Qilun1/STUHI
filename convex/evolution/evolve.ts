"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// OpenAI API call for evolution reflection
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 500
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature: 0.7,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Evolve a single agent's prompt based on their performance
export const evolveAgent = internalAction({
  args: {
    agentId: v.id("agents"),
    roundNumber: v.number(),
  },
  handler: async (ctx, args): Promise<{ newPrompt: string; reflection: string }> => {
    // Get agent data
    const agent = await ctx.runQuery(internal.evolution.helpers.getAgentForEvolution, {
      agentId: args.agentId,
    });

    if (!agent) {
      throw new Error("Agent not found");
    }

    // Get recent interactions (last 5 rounds worth)
    const recentInteractions = await ctx.runQuery(
      internal.evolution.helpers.getRecentInteractions,
      {
        agentId: args.agentId,
        sinceRound: Math.max(0, args.roundNumber - 5),
      }
    );

    // Calculate performance metrics for the period
    const periodStats = calculatePeriodStats(recentInteractions);

    // Build context for LLM
    const evolutionPrompt = buildEvolutionPrompt(agent, periodStats, recentInteractions);

    // Call LLM for reflection and new prompt
    const response = await callOpenAI(
      [
        {
          role: "system",
          content: `You are an AI evolution system. Analyze an agent's game performance and evolve their strategy.

CRITICAL: You must respond with a JSON object in this EXACT format:
{
  "reflection": "2-3 sentences about what worked and what didn't",
  "newPrompt": "The complete system prompt as a single string with the same structure as the original"
}

The "newPrompt" MUST be a plain text string (not a nested object). Keep the same format as the original prompt with BELIEFS, NEGOTIATION STYLE, DECISION MAKING sections, and the Remember line at the end. Make strategic improvements based on performance while maintaining the agent's core personality.`,
        },
        {
          role: "user",
          content: evolutionPrompt,
        },
      ],
      1500
    );

    // Parse response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const reflection = parsed.reflection || "No reflection provided";

        // Ensure newPrompt is a string
        let newPrompt = agent.systemPrompt;
        if (typeof parsed.newPrompt === "string") {
          newPrompt = parsed.newPrompt;
        } else if (parsed.newPrompt) {
          // If it's an object, try to stringify it into a readable format
          console.log("Warning: newPrompt was an object, using original prompt");
        }

        // Save evolution to database
        await ctx.runMutation(internal.evolution.helpers.recordEvolution, {
          agentId: args.agentId,
          version: agent.promptVersion + 1,
          prompt: newPrompt,
          parentVersion: agent.promptVersion,
          evolutionReason: `Performance review after round ${args.roundNumber}`,
          selfReflection: reflection,
          gamesInPeriod: periodStats.gamesPlayed,
          winRate: periodStats.winRate,
          averageScore: periodStats.averageScore,
          cooperationRate: periodStats.cooperationRate,
          promiseKeepingRate: periodStats.promiseKeepingRate,
          trustGained: periodStats.trustGained,
        });

        // Update agent's prompt
        await ctx.runMutation(internal.evolution.helpers.updateAgentPrompt, {
          agentId: args.agentId,
          newPrompt,
          newVersion: agent.promptVersion + 1,
        });

        return { newPrompt, reflection };
      }
    } catch (e) {
      console.error("Failed to parse evolution response:", e);
    }

    return { newPrompt: agent.systemPrompt, reflection: "Evolution failed" };
  },
});

// Evolve all agents
export const evolveAllAgents = internalAction({
  args: {
    roundNumber: v.number(),
  },
  handler: async (ctx, args): Promise<{ evolvedCount: number }> => {
    // Get all active agents
    const agents = await ctx.runQuery(internal.evolution.helpers.getActiveAgents, {});

    let evolvedCount = 0;

    // Evolve each agent (could parallelize, but being careful with rate limits)
    for (const agent of agents) {
      try {
        await ctx.runAction(internal.evolution.evolve.evolveAgent, {
          agentId: agent._id,
          roundNumber: args.roundNumber,
        });
        evolvedCount++;
      } catch (e) {
        console.error(`Failed to evolve agent ${agent.name}:`, e);
      }
    }

    // Record that evolution occurred
    await ctx.runMutation(internal.simulation.state.recordEvolution, {
      roundNumber: args.roundNumber,
    });

    return { evolvedCount };
  },
});

// Helper: Calculate stats for the period
interface PeriodStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  averageScore: number;
  cooperationRate: number;
  promiseKeepingRate: number;
  trustGained: number;
  betrayalsReceived: number;
  betrayalsMade: number;
}

function calculatePeriodStats(
  interactions: Array<{
    myDecision: string;
    theirDecision: string;
    myPromise: string;
    myScore: number;
    theirScore: number;
    trustDelta: number;
  }>
): PeriodStats {
  if (interactions.length === 0) {
    return {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      averageScore: 0,
      cooperationRate: 0,
      promiseKeepingRate: 0,
      trustGained: 0,
      betrayalsReceived: 0,
      betrayalsMade: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let totalScore = 0;
  let cooperations = 0;
  let promisesKept = 0;
  let promisesMade = 0;
  let trustGained = 0;
  let betrayalsReceived = 0;
  let betrayalsMade = 0;

  for (const i of interactions) {
    totalScore += i.myScore;
    trustGained += i.trustDelta;

    if (i.myScore > i.theirScore) wins++;
    if (i.myScore < i.theirScore) losses++;

    if (i.myDecision === "split") cooperations++;

    if (i.myPromise === "split" || i.myPromise === "steal") {
      promisesMade++;
      if (i.myDecision === i.myPromise) promisesKept++;
    }

    // Betrayal: one split, one steal
    if (i.myDecision === "split" && i.theirDecision === "steal") {
      betrayalsReceived++;
    }
    if (i.myDecision === "steal" && i.theirDecision === "split") {
      betrayalsMade++;
    }
  }

  return {
    gamesPlayed: interactions.length,
    wins,
    losses,
    winRate: wins / interactions.length,
    averageScore: totalScore / interactions.length,
    cooperationRate: cooperations / interactions.length,
    promiseKeepingRate: promisesMade > 0 ? promisesKept / promisesMade : 1,
    trustGained,
    betrayalsReceived,
    betrayalsMade,
  };
}

// Helper: Build the evolution prompt
function buildEvolutionPrompt(
  agent: {
    name: string;
    type: string;
    systemPrompt: string;
    totalScore: number;
    gamesPlayed: number;
    cooperationRate: number;
    promiseKeepingRate: number;
  },
  stats: PeriodStats,
  interactions: Array<{
    myDecision: string;
    theirDecision: string;
    myPromise: string;
    theirPromise: string;
    myScore: number;
  }>
): string {
  // Summarize recent interaction patterns
  const patterns = interactions.slice(-10).map((i) => {
    const outcome =
      i.myScore > 50 ? "won" : i.myScore < 50 ? "lost" : "tied";
    return `${i.myDecision.toUpperCase()} vs ${i.theirDecision.toUpperCase()} (${outcome}, promised: ${i.myPromise}, they promised: ${i.theirPromise})`;
  });

  return `AGENT: ${agent.name} (${agent.type})

CURRENT SYSTEM PROMPT:
${agent.systemPrompt}

OVERALL STATS:
- Total Score: ${agent.totalScore}
- Games Played: ${agent.gamesPlayed}
- Overall Cooperation Rate: ${(agent.cooperationRate * 100).toFixed(1)}%
- Overall Promise Keeping: ${(agent.promiseKeepingRate * 100).toFixed(1)}%

RECENT PERIOD PERFORMANCE (last 5 rounds):
- Games: ${stats.gamesPlayed}
- Wins: ${stats.wins}, Losses: ${stats.losses}
- Win Rate: ${(stats.winRate * 100).toFixed(1)}%
- Average Score: ${stats.averageScore.toFixed(1)}
- Cooperation Rate: ${(stats.cooperationRate * 100).toFixed(1)}%
- Promise Keeping: ${(stats.promiseKeepingRate * 100).toFixed(1)}%
- Trust Gained/Lost: ${stats.trustGained > 0 ? "+" : ""}${stats.trustGained.toFixed(1)}
- Times Betrayed: ${stats.betrayalsReceived}
- Times I Betrayed: ${stats.betrayalsMade}

RECENT GAME PATTERNS:
${patterns.join("\n")}

Based on this data, provide a reflection on what's working and what isn't, and an evolved system prompt that improves the agent's strategy while maintaining their core personality type (${agent.type}).`;
}

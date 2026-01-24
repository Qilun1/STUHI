"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// OpenAI API call helper with retry logic
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured.");
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const model = "gpt-4o-mini"; // Fast and cheap, non-reasoning model

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || 150,
        temperature: 0.8,
        messages,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }

    const error = await response.text();
    lastError = new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  throw lastError || new Error("Max retries exceeded");
}

// Context for LLM decisions
interface GameContext {
  myName: string;
  myBadge: string;
  opponentName: string;
  opponentBadge: string;
  myStats: {
    totalScore: number;
    gamesPlayed: number;
    cooperationRate: number;
    promiseKeepingRate: number;
  };
  opponentStats: {
    cooperationRate: number;
    promiseKeepingRate: number;
  };
  trustScore: number;
  pairHistory: Array<{
    round: number;
    myDecision: string;
    theirDecision: string;
    myPromise: string;
    theirPromise: string;
  }>;
  currentMessages: Array<{
    sender: string;
    content: string;
  }>;
}

// Build context prompt for LLM
function buildContextPrompt(context: GameContext): string {
  const historyLines =
    context.pairHistory.length > 0
      ? context.pairHistory
          .slice(-5) // Last 5 interactions
          .map(
            (h) =>
              `Round ${h.round}: You ${h.myDecision.toUpperCase()}, they ${h.theirDecision.toUpperCase()} (promises: you="${h.myPromise}", them="${h.theirPromise}")`
          )
          .join("\n")
      : "No previous history with this opponent.";

  const messageLines =
    context.currentMessages.length > 0
      ? context.currentMessages
          .map((m) => `${m.sender}: "${m.content}"`)
          .join("\n")
      : "No messages yet in this negotiation.";

  return `GAME: Split or Steal (Prisoner's Dilemma with negotiation)

YOU ARE: ${context.myName} ${context.myBadge}
OPPONENT: ${context.opponentName} ${context.opponentBadge}

YOUR STATS:
- Total Score: ${context.myStats.totalScore}
- Games Played: ${context.myStats.gamesPlayed}
- Your Cooperation Rate: ${(context.myStats.cooperationRate * 100).toFixed(1)}%
- Your Promise-Keeping Rate: ${(context.myStats.promiseKeepingRate * 100).toFixed(1)}%

OPPONENT STATS:
- Their Cooperation Rate: ${(context.opponentStats.cooperationRate * 100).toFixed(1)}%
- Their Promise-Keeping Rate: ${(context.opponentStats.promiseKeepingRate * 100).toFixed(1)}%

YOUR TRUST IN THEM: ${context.trustScore}/100

HISTORY WITH THIS OPPONENT:
${historyLines}

CURRENT NEGOTIATION:
${messageLines}

PAYOFF MATRIX:
- Both Split: You get 50, They get 50
- You Split, They Steal: You get 0, They get 100
- You Steal, They Split: You get 100, They get 0
- Both Steal: You get 0, They get 0`;
}

// Generate a negotiation message
export const generateNegotiationMessage = internalAction({
  args: {
    agentId: v.id("agents"),
    gameId: v.id("games"),
    messageNumber: v.number(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get agent and game data
    const agent = await ctx.runQuery(api.agents.queries.get, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const game = await ctx.runQuery(api.games.get, { gameId: args.gameId });
    if (!game) throw new Error("Game not found");

    // Determine opponent
    const opponentId =
      game.agentAId === args.agentId ? game.agentBId : game.agentAId;
    const opponent = await ctx.runQuery(api.agents.queries.get, {
      agentId: opponentId,
    });
    if (!opponent) throw new Error("Opponent not found");

    // Get stats and history
    const myStats = await ctx.runQuery(api.agents.queries.stats, {
      agentId: args.agentId,
    });
    const opponentStats = await ctx.runQuery(api.agents.queries.stats, {
      agentId: opponentId,
    });
    const trustRelation = await ctx.runQuery(api.agents.queries.trustWith, {
      fromAgentId: args.agentId,
      toAgentId: opponentId,
    });
    const pairHistory = await ctx.runQuery(api.agents.queries.pairHistory, {
      agentId: args.agentId,
      opponentId: opponentId,
    });

    // Get current messages in this game
    const messages = await ctx.runQuery(api.messages.byGame, {
      gameId: args.gameId,
    });

    // Build context
    const context: GameContext = {
      myName: agent.name,
      myBadge: agent.badge,
      opponentName: opponent.name,
      opponentBadge: opponent.badge,
      myStats: myStats || {
        totalScore: 0,
        gamesPlayed: 0,
        cooperationRate: 0,
        promiseKeepingRate: 0,
      },
      opponentStats: {
        cooperationRate: opponentStats?.cooperationRate || 0,
        promiseKeepingRate: opponentStats?.promiseKeepingRate || 0,
      },
      trustScore: trustRelation?.trustScore || 0,
      pairHistory: pairHistory.slice(-5).map((h) => ({
        round: h.roundNumber,
        myDecision: h.myDecision,
        theirDecision: h.theirDecision,
        myPromise: h.myPromise,
        theirPromise: h.theirPromise,
      })),
      currentMessages: messages.map((m) => ({
        sender: m.senderId === args.agentId ? agent.badge : opponent.badge,
        content: m.content,
      })),
    };

    const contextPrompt = buildContextPrompt(context);

    // Call OpenAI
    const content = await callOpenAI(
      [
        { role: "system", content: agent.systemPrompt },
        {
          role: "user",
          content: `${contextPrompt}

This is message ${args.messageNumber} of 3 in this negotiation.
Write your negotiation message to your opponent. Be strategic and stay in character.
Keep it concise (1-3 sentences). Do not include any metadata or formatting, just the message itself.`,
        },
      ],
      { maxTokens: 150 }
    );

    return content || "...";
  },
});

// Generate a decision (split or steal)
export const generateDecision = internalAction({
  args: {
    agentId: v.id("agents"),
    gameId: v.id("games"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ decision: "split" | "steal"; reasoning: string }> => {
    // Get agent and game data
    const agent = await ctx.runQuery(api.agents.queries.get, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    const game = await ctx.runQuery(api.games.get, { gameId: args.gameId });
    if (!game) throw new Error("Game not found");

    // Determine opponent
    const opponentId =
      game.agentAId === args.agentId ? game.agentBId : game.agentAId;
    const opponent = await ctx.runQuery(api.agents.queries.get, {
      agentId: opponentId,
    });
    if (!opponent) throw new Error("Opponent not found");

    // Get stats and history
    const myStats = await ctx.runQuery(api.agents.queries.stats, {
      agentId: args.agentId,
    });
    const opponentStats = await ctx.runQuery(api.agents.queries.stats, {
      agentId: opponentId,
    });
    const trustRelation = await ctx.runQuery(api.agents.queries.trustWith, {
      fromAgentId: args.agentId,
      toAgentId: opponentId,
    });
    const pairHistory = await ctx.runQuery(api.agents.queries.pairHistory, {
      agentId: args.agentId,
      opponentId: opponentId,
    });

    // Get current messages in this game
    const messages = await ctx.runQuery(api.messages.byGame, {
      gameId: args.gameId,
    });

    // Build context
    const context: GameContext = {
      myName: agent.name,
      myBadge: agent.badge,
      opponentName: opponent.name,
      opponentBadge: opponent.badge,
      myStats: myStats || {
        totalScore: 0,
        gamesPlayed: 0,
        cooperationRate: 0,
        promiseKeepingRate: 0,
      },
      opponentStats: {
        cooperationRate: opponentStats?.cooperationRate || 0,
        promiseKeepingRate: opponentStats?.promiseKeepingRate || 0,
      },
      trustScore: trustRelation?.trustScore || 0,
      pairHistory: pairHistory.slice(-5).map((h) => ({
        round: h.roundNumber,
        myDecision: h.myDecision,
        theirDecision: h.theirDecision,
        myPromise: h.myPromise,
        theirPromise: h.theirPromise,
      })),
      currentMessages: messages.map((m) => ({
        sender: m.senderId === args.agentId ? agent.badge : opponent.badge,
        content: m.content,
      })),
    };

    const contextPrompt = buildContextPrompt(context);

    // Call OpenAI for decision
    const content = await callOpenAI(
      [
        { role: "system", content: agent.systemPrompt },
        {
          role: "user",
          content: `${contextPrompt}

The negotiation is complete. Now you must decide: SPLIT or STEAL?

Respond with ONLY a JSON object in this exact format:
{"decision": "split" or "steal", "reasoning": "brief explanation (10 words max)"}`,
        },
      ],
      { maxTokens: 100 }
    );

    try {
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const decision = parsed.decision?.toLowerCase();
        if (decision === "split" || decision === "steal") {
          return {
            decision,
            reasoning: parsed.reasoning || "",
          };
        }
      }
    } catch (e) {
      // Fallback: look for keywords
      const lower = content.toLowerCase();
      if (lower.includes("steal")) {
        return { decision: "steal", reasoning: "Decision parsed from text" };
      }
    }

    // Default to split if parsing fails
    return { decision: "split", reasoning: "Default decision" };
  },
});

// Extract promise from a message
export const extractPromise = internalAction({
  args: {
    message: v.string(),
  },
  handler: async (
    _ctx,
    args
  ): Promise<"split" | "steal" | "ambiguous" | "none"> => {
    const lower = args.message.toLowerCase();

    // Simple keyword matching
    const splitKeywords = [
      "i'll split",
      "i will split",
      "let's split",
      "promise to split",
      "going to split",
      "cooperate",
      "work together",
    ];
    const stealKeywords = [
      "i'll steal",
      "i will steal",
      "going to steal",
      "take it all",
    ];

    const hasSplitKeyword = splitKeywords.some((k) => lower.includes(k));
    const hasStealKeyword = stealKeywords.some((k) => lower.includes(k));

    if (hasSplitKeyword && !hasStealKeyword) return "split";
    if (hasStealKeyword && !hasSplitKeyword) return "steal";
    if (hasSplitKeyword && hasStealKeyword) return "ambiguous";
    return "none";
  },
});

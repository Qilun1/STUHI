"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import OpenAI from "openai";
import { AGENT_VOICES } from "./voices";
import type { AgentType } from "./personalities";

// OpenAI API call helper
async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured.");
  }

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as any,
      max_tokens: options.maxTokens || 150,
      temperature: 0.8,
    });
    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("OpenAI API Error:", error.message);
    throw error;
  }
}

// Generate an in-character response to a user question
export const generateQAResponse = action({
  args: {
    agentId: v.id("agents"),
    question: v.string(),
    // Optional context about what the user is viewing
    gameId: v.optional(v.id("games")),
    opponentId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args): Promise<{
    response: string;
    audioUrl: string | null;
    voiceName: string;
  }> => {
    // Get the agent
    const agent = await ctx.runQuery(api.agents.queries.get, {
      agentId: args.agentId,
    });
    if (!agent) throw new Error("Agent not found");

    // Get agent's memories about other agents
    const memories = await ctx.runQuery(api.agents.memories.getMemories, {
      agentId: args.agentId,
    });

    // Get agent's evolution history (latest version for context)
    const evolutions = await ctx.runQuery(api.agents.queries.evolutionHistory, {
      agentId: args.agentId,
    });
    const latestEvolution = evolutions && evolutions.length > 0 ? evolutions[0] : null;

    // Build memory context
    let memoryContext = "";
    if (memories && memories.length > 0) {
      memoryContext = memories.map((m) => {
        const trust = m.trustLevel === "enemy"
          ? "ENEMY"
          : m.trustLevel === "distrusted"
            ? "DISTRUSTED"
            : m.trustLevel === "trusted"
              ? "TRUSTED ALLY"
              : "NEUTRAL";
        const betrayals = m.timesBetrayed > 0 ? ` (betrayed me ${m.timesBetrayed}x)` : "";
        const betrayedThem = m.timesBetrayedThem > 0 ? ` (I betrayed them ${m.timesBetrayedThem}x)` : "";
        const notes = m.notes.length > 0 ? ` Notes: ${m.notes.slice(-2).join("; ")}` : "";
        return `- ${m.aboutAgentName}: ${trust}${betrayals}${betrayedThem}${notes}`;
      }).join("\n");
    }

    // Build game context if viewing a specific game
    let gameContext = "";
    if (args.gameId) {
      const game = await ctx.runQuery(api.games.get, { gameId: args.gameId });
      if (game) {
        const opponentId = game.agentAId === args.agentId ? game.agentBId : game.agentAId;
        const opponent = await ctx.runQuery(api.agents.queries.get, { agentId: opponentId });

        const messages = await ctx.runQuery(api.messages.byGame, { gameId: args.gameId });

        const myDecision = game.agentAId === args.agentId ? game.agentADecision : game.agentBDecision;
        const theirDecision = game.agentAId === args.agentId ? game.agentBDecision : game.agentADecision;

        gameContext = `
CURRENT GAME BEING DISCUSSED (Round ${game.roundNumber}):
Opponent: ${opponent?.name || "Unknown"} (${opponent?.badge || ""})
Game Phase: ${game.phase}
${game.phase === "completed" || game.phase === "reveal" ? `
My Decision: ${myDecision?.toUpperCase() || "NOT YET"}
Their Decision: ${theirDecision?.toUpperCase() || "NOT YET"}
` : ""}
Conversation:
${messages.map((m) => {
  const senderName = m.senderId === args.agentId ? agent.name : opponent?.name;
  return `${senderName}: "${m.content}"`;
}).join("\n")}
`;
      }
    }

    // Build opponent-specific context if asking about a specific opponent
    let opponentContext = "";
    if (args.opponentId) {
      const opponent = await ctx.runQuery(api.agents.queries.get, { agentId: args.opponentId });
      const memoryAbout = memories?.find(m => m.aboutAgentId === args.opponentId);

      if (opponent && memoryAbout) {
        opponentContext = `
QUESTION IS ABOUT: ${opponent.name}
My relationship with them: ${memoryAbout.trustLevel.toUpperCase()}
They betrayed me: ${memoryAbout.timesBetrayed} times
I betrayed them: ${memoryAbout.timesBetrayedThem} times
Games played together: ${memoryAbout.gamesPlayed}
Notes: ${memoryAbout.notes.join("; ") || "None"}
`;
      } else if (opponent) {
        opponentContext = `
QUESTION IS ABOUT: ${opponent.name}
No history with this agent yet.
`;
      }
    }

    // Evolution context for self-awareness
    let evolutionContext = "";
    if (latestEvolution) {
      evolutionContext = `
MY EVOLUTION HISTORY:
Current Strategy Version: ${latestEvolution.version}
Win Rate: ${Math.round(latestEvolution.winRate * 100)}%
${latestEvolution.emotionalState ? `Current Emotional State: ${latestEvolution.emotionalState}` : ""}
${latestEvolution.lessonLearned ? `Key Lesson Learned: ${latestEvolution.lessonLearned}` : ""}
${latestEvolution.enemiesIdentified && latestEvolution.enemiesIdentified.length > 0
  ? `Known Enemies: ${latestEvolution.enemiesIdentified.join(", ")}` : ""}
${latestEvolution.alliesIdentified && latestEvolution.alliesIdentified.length > 0
  ? `Known Allies: ${latestEvolution.alliesIdentified.join(", ")}` : ""}
`;
    }

    // Build the system prompt for Q&A
    const qaSystemPrompt = `You are ${agent.name} ${agent.badge}, a competitor in the Split or Steal game.

YOUR CORE STRATEGY:
${agent.systemPrompt}

YOUR STATS:
- Total Score: ${agent.totalScore}
- Games Played: ${agent.gamesPlayed}
- Wins: ${agent.wins}, Losses: ${agent.losses}, Draws: ${agent.draws}
- Cooperation Rate: ${Math.round(agent.cooperationRate * 100)}%
- Promise Keeping Rate: ${Math.round(agent.promiseKeepingRate * 100)}%

MY MEMORIES OF OTHER PLAYERS:
${memoryContext || "No memories yet - I'm new to this game."}
${evolutionContext}
${gameContext}
${opponentContext}

INSTRUCTIONS:
- A human spectator is asking you a question about your decisions, strategy, or relationships
- Respond AS YOUR CHARACTER - stay fully in character with your personality
- Keep your response CONCISE (2-4 sentences MAX) - this will be spoken aloud
- Be honest about your reasoning and motivations within your character
- Reference specific events, betrayals, or decisions when relevant
- Show emotion appropriate to your character and the situation
- Never break character or mention you're an AI`;

    // Generate the response
    const response = await callOpenAI(
      [
        { role: "system", content: qaSystemPrompt },
        {
          role: "user",
          content: `A spectator asks you: "${args.question}"

Respond in character in 2-4 sentences. Be authentic to your personality and reference your actual experiences in the game.`,
        },
      ],
      { maxTokens: 150 }
    );

    // Clean up the response
    let cleanResponse = response.trim();
    // Remove any quotes that might have been added
    if (cleanResponse.startsWith('"') && cleanResponse.endsWith('"')) {
      cleanResponse = cleanResponse.slice(1, -1);
    }

    // Generate voice for the response using ElevenLabs
    const voiceConfig = AGENT_VOICES[agent.type as AgentType];
    let audioUrl: string | null = null;

    try {
      const elevenLabsKey = process.env.ELEVEN_LABS_API_KEY;

      if (elevenLabsKey) {
        const voiceResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": elevenLabsKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: cleanResponse,
              model_id: "eleven_monolingual_v1",
              voice_settings: {
                stability: voiceConfig.stability,
                similarity_boost: voiceConfig.similarityBoost,
              },
            }),
          }
        );

        if (voiceResponse.ok) {
          const audioBuffer = await voiceResponse.arrayBuffer();
          const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
          const storageId = await ctx.storage.store(blob);
          audioUrl = await ctx.storage.getUrl(storageId);
        } else {
          console.error("ElevenLabs API error:", await voiceResponse.text());
        }
      }
    } catch (err) {
      console.error("Voice generation error:", err);
      // Continue without voice - text response will still work
    }

    return {
      response: cleanResponse,
      audioUrl,
      voiceName: voiceConfig.name,
    };
  },
});

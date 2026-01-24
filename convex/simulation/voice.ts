"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { AGENT_VOICES } from "../agents/voices";
import type { AgentType } from "../agents/personalities";

// Generate voice audio for a message using ElevenLabs
export const generateVoice = action({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args): Promise<{ audioUrl: string | null; voiceName: string }> => {
    const apiKey = process.env.ELEVEN_LABS_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ELEVEN_LABS_API_KEY not configured. Set it in Convex environment."
      );
    }

    // Get message by ID
    const message = await ctx.runQuery(api.messages.get, {
      messageId: args.messageId,
    });

    if (!message) {
      throw new Error("Message not found");
    }

    // Get the agent to get their voice config
    const agent = await ctx.runQuery(api.agents.queries.get, {
      agentId: message.senderId,
    });

    if (!agent) {
      throw new Error("Agent not found");
    }

    const voiceConfig = AGENT_VOICES[agent.type as AgentType];

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceConfig.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message.content,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: voiceConfig.stability,
            similarity_boost: voiceConfig.similarityBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    // Get audio as blob
    const audioBuffer = await response.arrayBuffer();

    // Store in Convex file storage
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
    const storageId = await ctx.storage.store(blob);
    const audioUrl = await ctx.storage.getUrl(storageId);

    return {
      audioUrl,
      voiceName: voiceConfig.name,
    };
  },
});

// Get voice config for an agent type (no API call)
export const getVoiceConfig = action({
  args: {
    agentType: v.string(),
  },
  handler: async (_ctx, args) => {
    const config = AGENT_VOICES[args.agentType as AgentType];
    if (!config) {
      throw new Error(`No voice config for agent type: ${args.agentType}`);
    }
    return config;
  },
});

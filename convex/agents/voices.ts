import type { AgentType } from "./personalities";

export interface VoiceConfig {
  voiceId: string;
  name: string;
  stability: number;
  similarityBoost: number;
}

// ElevenLabs voice mappings for each agent type
// These are placeholder voice IDs - replace with actual ElevenLabs voice IDs
export const AGENT_VOICES: Record<AgentType, VoiceConfig> = {
  diplomat: {
    voiceId: "pNInz6obpgDQGcFmaJgB", // Adam - calm, professional
    name: "Adam",
    stability: 0.7,
    similarityBoost: 0.8,
  },
  shark: {
    voiceId: "ErXwobaYiN019PkySvjV", // Antoni - smooth, confident
    name: "Antoni",
    stability: 0.5,
    similarityBoost: 0.9,
  },
  saint: {
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella - warm, gentle
    name: "Bella",
    stability: 0.8,
    similarityBoost: 0.7,
  },
  grudger: {
    voiceId: "VR6AewLTigWG4xSOukaG", // Arnold - stern, serious
    name: "Arnold",
    stability: 0.9,
    similarityBoost: 0.8,
  },
  analyst: {
    voiceId: "pqHfZKP75CvOlQylNhV4", // Bill - measured, analytical
    name: "Bill",
    stability: 0.9,
    similarityBoost: 0.6,
  },
  charmer: {
    voiceId: "jsCqWAovK2LkecY7zXl4", // Freya - charismatic, playful
    name: "Freya",
    stability: 0.5,
    similarityBoost: 0.9,
  },
  paranoid: {
    voiceId: "SOYHLrjzK2X1ezoPC6cr", // Harry - tense, suspicious
    name: "Harry",
    stability: 0.6,
    similarityBoost: 0.7,
  },
  healer: {
    voiceId: "MF3mGyEYCl7XYWbV9V6O", // Emily - soothing, compassionate
    name: "Emily",
    stability: 0.8,
    similarityBoost: 0.8,
  },
  wildcard: {
    voiceId: "GBv7mTt0atIp3Br8iCZE", // Thomas - unpredictable, energetic
    name: "Thomas",
    stability: 0.3,
    similarityBoost: 0.5,
  },
  mirror: {
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam - neutral, adaptable
    name: "Liam",
    stability: 0.7,
    similarityBoost: 0.7,
  },
};

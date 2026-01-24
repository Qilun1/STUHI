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
    voiceId: "N2lVS1w4EtoT3dr4eOWO", // Callum - stern, authoritative
    name: "Callum",
    stability: 0.85,
    similarityBoost: 0.9,
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
    voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella - warm, friendly, cooperative
    name: "Bella",
    stability: 0.75,
    similarityBoost: 0.85,
  },
  // === NEW AGENT VOICES ===
  gambler: {
    voiceId: "VR6AewLTigWG4xSOukaG", // Arnold - bold, confident
    name: "Arnold",
    stability: 0.4,
    similarityBoost: 0.85,
  },
  detective: {
    voiceId: "onwK4e9ZLuTAKqWW03F9", // Daniel - thoughtful, observant
    name: "Daniel",
    stability: 0.8,
    similarityBoost: 0.75,
  },
  manipulator: {
    voiceId: "IKne3meq5aSn9XLyUdCD", // Charlie - smooth, calculating
    name: "Charlie",
    stability: 0.6,
    similarityBoost: 0.9,
  },
  optimist: {
    voiceId: "XB0fDUnXU5powFXDhCwa", // Charlotte - bright, cheerful
    name: "Charlotte",
    stability: 0.7,
    similarityBoost: 0.8,
  },
  calculator: {
    voiceId: "iP95p4xoKVk53GoZ742B", // Chris - precise, robotic
    name: "Chris",
    stability: 0.95,
    similarityBoost: 0.5,
  },
  predator: {
    voiceId: "JBFqnCBsd6RMkjVDRZzb", // George - deep, intimidating
    name: "George",
    stability: 0.5,
    similarityBoost: 0.9,
  },
  phoenix: {
    voiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam - transformative, earnest
    name: "Liam",
    stability: 0.6,
    similarityBoost: 0.8,
  },
  loyalist: {
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian - warm, protective
    name: "Brian",
    stability: 0.75,
    similarityBoost: 0.85,
  },
  contrarian: {
    voiceId: "g5CIjZEefAph4nQFvHAz", // Ethan - unpredictable, playful
    name: "Ethan",
    stability: 0.35,
    similarityBoost: 0.7,
  },
  survivor: {
    voiceId: "ODq5zmih8GrVes37Dizd", // Patrick - gritty, desperate
    name: "Patrick",
    stability: 0.55,
    similarityBoost: 0.8,
  },
};

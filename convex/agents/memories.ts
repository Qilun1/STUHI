import { query, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Get all memories for an agent
export const getMemories = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentMemories")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

// Get memory about a specific opponent
export const getMemoryAbout = query({
  args: {
    agentId: v.id("agents"),
    aboutAgentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentMemories")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("aboutAgentId", args.aboutAgentId)
      )
      .first();
  },
});

// Update memory after a game (internal)
export const updateMemoryAfterGame = internalMutation({
  args: {
    agentId: v.id("agents"),
    opponentId: v.id("agents"),
    opponentName: v.string(),
    myDecision: v.string(),
    theirDecision: v.string(),
    roundNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentMemories")
      .withIndex("by_pair", (q) =>
        q.eq("agentId", args.agentId).eq("aboutAgentId", args.opponentId)
      )
      .first();

    const wasBetrayed =
      args.myDecision === "split" && args.theirDecision === "steal";
    const didBetray =
      args.myDecision === "steal" && args.theirDecision === "split";

    // Generate note based on what happened
    let newNote: string | null = null;
    if (wasBetrayed) {
      newNote = `Betrayed me R${args.roundNumber}`;
    } else if (didBetray) {
      newNote = `I betrayed them R${args.roundNumber}`;
    } else if (args.myDecision === "split" && args.theirDecision === "split") {
      // Only note cooperation occasionally to avoid spam
      if (!existing || existing.gamesPlayed % 3 === 0) {
        newNote = `Cooperated R${args.roundNumber}`;
      }
    }

    if (existing) {
      // Update existing memory
      const notes = existing.notes.slice(-4); // Keep last 4 notes
      if (newNote) notes.push(newNote);

      const timesBetrayed = existing.timesBetrayed + (wasBetrayed ? 1 : 0);
      const timesBetrayedThem =
        existing.timesBetrayedThem + (didBetray ? 1 : 0);
      const gamesPlayed = existing.gamesPlayed + 1;

      // Calculate trust level
      const betrayalRatio = timesBetrayed / gamesPlayed;
      let trustLevel: "trusted" | "neutral" | "distrusted" | "enemy";
      if (betrayalRatio === 0 && gamesPlayed >= 2) {
        trustLevel = "trusted";
      } else if (betrayalRatio >= 0.5) {
        trustLevel = "enemy";
      } else if (betrayalRatio >= 0.25) {
        trustLevel = "distrusted";
      } else {
        trustLevel = "neutral";
      }

      await ctx.db.patch(existing._id, {
        notes,
        timesBetrayed,
        timesBetrayedThem,
        gamesPlayed,
        trustLevel,
        updatedAt: Date.now(),
      });
    } else {
      // Create new memory
      const trustLevel = wasBetrayed ? "distrusted" : "neutral";
      await ctx.db.insert("agentMemories", {
        agentId: args.agentId,
        aboutAgentId: args.opponentId,
        aboutAgentName: args.opponentName,
        notes: newNote ? [newNote] : [],
        timesBetrayed: wasBetrayed ? 1 : 0,
        timesBetrayedThem: didBetray ? 1 : 0,
        gamesPlayed: 1,
        trustLevel,
        updatedAt: Date.now(),
      });
    }
  },
});

// Format memories for prompt context (internal helper)
export const formatMemoriesForPrompt = async (
  ctx: { db: { query: (table: string) => { withIndex: (name: string, fn: (q: { eq: (field: string, value: string) => { collect: () => Promise<Array<{ aboutAgentName: string; trustLevel: string; timesBetrayed: number; notes: string[]; gamesPlayed: number }>> } }) => { collect: () => Promise<Array<{ aboutAgentName: string; trustLevel: string; timesBetrayed: number; notes: string[]; gamesPlayed: number }>> }) => { collect: () => Promise<Array<{ aboutAgentName: string; trustLevel: string; timesBetrayed: number; notes: string[]; gamesPlayed: number }>> } } } },
  agentId: string
): Promise<string> => {
  const memories = await ctx.db
    .query("agentMemories")
    .withIndex("by_agent", (q: { eq: (field: string, value: string) => { collect: () => Promise<Array<{ aboutAgentName: string; trustLevel: string; timesBetrayed: number; notes: string[]; gamesPlayed: number }>> } }) => q.eq("agentId", agentId))
    .collect();

  if (memories.length === 0) return "No memories yet.";

  return memories
    .map((m) => {
      const trust =
        m.trustLevel === "enemy"
          ? "ENEMY"
          : m.trustLevel === "distrusted"
            ? "CAUTION"
            : m.trustLevel === "trusted"
              ? "ALLY"
              : "";
      const betrayals =
        m.timesBetrayed > 0 ? ` [betrayed ${m.timesBetrayed}x]` : "";
      const recentNote = m.notes.length > 0 ? ` - ${m.notes.slice(-1)[0]}` : "";
      return `${m.aboutAgentName}: ${trust}${betrayals}${recentNote}`;
    })
    .join("\n");
};

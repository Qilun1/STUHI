import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { sourceQuery: v.string() },
  handler: async (ctx, { sourceQuery }) => {
    return await ctx.db.insert("scenarios", {
      sourceQuery,
      title: "",
      description: "",
      context: "",
      keyFacts: [],
      parties: [],
      possibleOutcomes: [],
      status: "researching",
      statusMessage: "Starting research...",
      researchActivity: [
        {
          type: "start",
          message: "Starting research",
          detail: sourceQuery,
          timestamp: Date.now(),
        },
      ],
      createdAt: Date.now(),
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    id: v.id("scenarios"),
    status: v.optional(v.string()),
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, statusMessage }) => {
    const updates: Record<string, string> = {};
    if (status) updates.status = status;
    if (statusMessage) updates.statusMessage = statusMessage;
    await ctx.db.patch(id, updates);
  },
});

export const addActivity = internalMutation({
  args: {
    id: v.id("scenarios"),
    type: v.string(),
    message: v.string(),
    detail: v.optional(v.string()),
    data: v.optional(
      v.object({
        sources: v.optional(
          v.array(
            v.object({
              title: v.string(),
              url: v.string(),
              snippet: v.optional(v.string()),
            })
          )
        ),
        items: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, { id, type, message, detail, data }) => {
    const scenario = await ctx.db.get(id);
    if (!scenario) return;

    const activity = scenario.researchActivity || [];
    activity.push({
      type,
      message,
      detail,
      timestamp: Date.now(),
      data,
    });

    await ctx.db.patch(id, {
      researchActivity: activity,
      statusMessage: message,
    });
  },
});

export const complete = internalMutation({
  args: {
    id: v.id("scenarios"),
    title: v.string(),
    description: v.string(),
    context: v.string(),
    keyFacts: v.any(),
    parties: v.any(),
    possibleOutcomes: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      title: args.title,
      description: args.description,
      context: args.context,
      keyFacts: args.keyFacts,
      parties: args.parties,
      possibleOutcomes: args.possibleOutcomes,
      status: "ready",
      statusMessage: "Scenario ready",
    });
  },
});

// Update a specific party in the scenario (for evolution)
export const updateParty = internalMutation({
  args: {
    scenarioId: v.id("scenarios"),
    partyName: v.string(),
    updates: v.any(),
  },
  handler: async (ctx, { scenarioId, partyName, updates }) => {
    const scenario = await ctx.db.get(scenarioId);
    if (!scenario) throw new Error("Scenario not found");

    const updatedParties = scenario.parties.map((party) => {
      if (party.name === partyName) {
        return { ...party, ...updates };
      }
      return party;
    });

    await ctx.db.patch(scenarioId, { parties: updatedParties });
  },
});

// Update party count in scenario
export const updatePartyCount = internalMutation({
  args: {
    id: v.id("scenarios"),
    partyCount: v.number(),
  },
  handler: async (ctx, { id, partyCount }) => {
    await ctx.db.patch(id, { partyCount });
  },
});

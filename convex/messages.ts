import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Get messages for a game
export const byGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_game_order", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});

// Get messages with sender info
export const byGameWithSenders = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_game_order", (q) => q.eq("gameId", args.gameId))
      .collect();

    return await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          senderName: sender?.name,
          senderBadge: sender?.badge,
          senderColor: sender?.color,
        };
      })
    );
  },
});

// Add a message to a game
export const add = internalMutation({
  args: {
    gameId: v.id("games"),
    senderId: v.id("agents"),
    content: v.string(),
    messageNumber: v.number(),
    impliedPromise: v.optional(
      v.union(
        v.literal("split"),
        v.literal("steal"),
        v.literal("ambiguous"),
        v.literal("none")
      )
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      gameId: args.gameId,
      senderId: args.senderId,
      content: args.content,
      messageNumber: args.messageNumber,
      impliedPromise: args.impliedPromise,
      timestamp: Date.now(),
    });
  },
});

// Get message count for a game
export const countByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return messages.length;
  },
});

// Get last message in a game
export const lastInGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_game_order", (q) => q.eq("gameId", args.gameId))
      .order("desc")
      .first();
    return messages;
  },
});

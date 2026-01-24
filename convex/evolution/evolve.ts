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

    // Analyze evolution triggers and key moments
    const evolutionData = analyzeEvolution(agent, periodStats, recentInteractions, args.roundNumber);

    // Build context for LLM with rich data
    const evolutionPrompt = buildEvolutionPrompt(agent, periodStats, recentInteractions, evolutionData);

    // Call LLM for reflection and new prompt
    const response = await callOpenAI(
      [
        {
          role: "system",
          content: `You are writing the evolution narrative for an AI agent in a Split-or-Steal game. This is a dramatic moment of character growth - tell their story.

Return JSON only:

{
  "reflection": "A compelling 4-6 sentence narrative describing this agent's journey. Write in first person as the agent. Include: (1) The key events that happened - name specific opponents, (2) The emotional impact - how did betrayals or successes feel, (3) What the agent realized about themselves and others, (4) Why they're changing their approach. Make it personal and dramatic.",
  "evolutionNarrative": "A 3-4 sentence story summary written in third person describing why this evolution happened. E.g., 'After suffering three devastating betrayals at the hands of Shark, the once-trusting Diplomat has hardened. Their cooperation rate dropped from 80% to 45% as they learned that kindness without boundaries is weakness.'",
  "newPrompt": "The new strategy prompt (2-3 lines, under 60 words)",
  "strategyChanges": ["specific change 1", "specific change 2", ...],
  "emotionalState": "A vivid emotional descriptor (e.g., 'battle-scarred and wary', 'vengeful but calculating', 'cautiously optimistic', 'ruthlessly efficient')",
  "lessonLearned": "One powerful takeaway in 8-12 words",
  "nemesis": "Name of their biggest enemy/rival (or null if none)",
  "ally": "Name of their most trusted ally (or null if none)"
}

REFLECTION EXAMPLES (first person, emotional, specific):
- "I trusted Shark. Three times I offered to split, and three times they took everything from me. I watched my score plummet while they climbed the leaderboard on my naivety. No more. I've memorized every face that betrayed me, and they will find no mercy in our next encounter. My kindness was a weakness - now it's a weapon I deploy selectively."
- "Victory after victory - my aggressive approach is working. Diplomat fell for my false promises twice, and Saint's unwavering cooperation made them easy points. But I've noticed something troubling: everyone's starting to steal against me now. The predator has become the prey. I need to adapt before my reputation destroys me."

evolutionNarrative EXAMPLES (third person, dramatic):
- "The Saint's fall from grace was inevitable. After being exploited by Shark and Charmer repeatedly, their blind faith in cooperation crumbled. This evolution marks a pivotal shift: the former pacifist now carries a list of enemies and won't hesitate to retaliate."
- "Grudger's patience has paid off. By carefully tracking who kept their promises, they've built a network of reliable allies while systematically punishing betrayers. Their win rate climbed from 30% to 65%."`,
        },
        {
          role: "user",
          content: evolutionPrompt,
        },
      ],
      900
    );

    // Parse response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const reflection = parsed.reflection || "No reflection provided";
        const strategyChanges = Array.isArray(parsed.strategyChanges) ? parsed.strategyChanges : [];
        const emotionalState = typeof parsed.emotionalState === "string" ? parsed.emotionalState : undefined;
        const lessonLearned = typeof parsed.lessonLearned === "string" ? parsed.lessonLearned : undefined;
        const evolutionNarrative = typeof parsed.evolutionNarrative === "string" ? parsed.evolutionNarrative : undefined;
        const nemesis = typeof parsed.nemesis === "string" && parsed.nemesis !== "null" ? parsed.nemesis : undefined;
        const ally = typeof parsed.ally === "string" && parsed.ally !== "null" ? parsed.ally : undefined;

        // Ensure newPrompt is a string
        let newPrompt = agent.systemPrompt;
        if (typeof parsed.newPrompt === "string") {
          newPrompt = parsed.newPrompt;
        } else if (parsed.newPrompt) {
          console.log("Warning: newPrompt was an object, using original prompt");
        }

        // Build comprehensive evolution reason with full context
        const evolutionReason = buildEvolutionReason(
          agent,
          periodStats,
          evolutionData,
          args.roundNumber,
          strategyChanges
        );

        // Save evolution to database with enhanced data
        await ctx.runMutation(internal.evolution.helpers.recordEvolution, {
          agentId: args.agentId,
          version: agent.promptVersion + 1,
          prompt: newPrompt,
          parentVersion: agent.promptVersion,
          evolutionReason,
          selfReflection: reflection,
          gamesInPeriod: periodStats.gamesPlayed,
          winRate: periodStats.winRate,
          averageScore: periodStats.averageScore,
          cooperationRate: periodStats.cooperationRate,
          promiseKeepingRate: periodStats.promiseKeepingRate,
          trustGained: periodStats.trustGained,
          // Enhanced evolution data
          triggerEvents: evolutionData.triggerEvents,
          keyMoments: evolutionData.keyMoments,
          strategyChanges: strategyChanges.length > 0 ? strategyChanges : evolutionData.strategyChanges,
          enemiesIdentified: evolutionData.enemiesIdentified,
          alliesIdentified: evolutionData.alliesIdentified,
          performanceAnalysis: evolutionData.performanceAnalysis,
          previousPromptSummary: evolutionData.previousPromptSummary,
          roundRange: evolutionData.roundRange,
          betrayalsReceived: evolutionData.betrayalsReceived,
          betrayalsMade: evolutionData.betrayalsMade,
          emotionalState,
          lessonLearned,
          evolutionNarrative,
          nemesis,
          ally,
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

// Enhanced types for detailed evolution analysis
interface TriggerEvent {
  type: string;
  description: string;
  opponent?: string;
  round?: number;
  impact?: string;
}

interface KeyMoment {
  round: number;
  opponent: string;
  event: string;
  score: number;
  significance: string;
}

interface EnhancedEvolutionData {
  triggerEvents: TriggerEvent[];
  keyMoments: KeyMoment[];
  strategyChanges: string[];
  enemiesIdentified: string[];
  alliesIdentified: string[];
  performanceAnalysis: string;
  previousPromptSummary: string;
  roundRange: { start: number; end: number };
  betrayalsReceived: number;
  betrayalsMade: number;
}

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

// Helper: Analyze interactions and build detailed evolution data
function analyzeEvolution(
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
    theirScore: number;
    roundNumber: number;
    opponentName?: string;
    opponentType?: string;
  }>,
  roundNumber: number
): EnhancedEvolutionData {
  const triggerEvents: TriggerEvent[] = [];
  const keyMoments: KeyMoment[] = [];
  const enemiesIdentified: string[] = [];
  const alliesIdentified: string[] = [];

  // Track opponent-specific stats
  const opponentStats: Record<string, {
    betrayedBy: number;
    betrayedThem: number;
    games: number;
    totalScore: number;
    rounds: number[];
  }> = {};

  // Analyze each interaction
  for (const i of interactions) {
    const name = i.opponentName ?? "Unknown";
    if (!opponentStats[name]) {
      opponentStats[name] = { betrayedBy: 0, betrayedThem: 0, games: 0, totalScore: 0, rounds: [] };
    }
    opponentStats[name].games++;
    opponentStats[name].totalScore += i.myScore;
    opponentStats[name].rounds.push(i.roundNumber);

    // Track betrayals
    if (i.myDecision === "split" && i.theirDecision === "steal") {
      opponentStats[name].betrayedBy++;

      // Add as key moment if first betrayal
      if (opponentStats[name].betrayedBy === 1) {
        keyMoments.push({
          round: i.roundNumber,
          opponent: name,
          event: "betrayed_by",
          score: i.myScore,
          significance: `First betrayal by ${name} - trust broken`
        });
      } else if (opponentStats[name].betrayedBy >= 2) {
        keyMoments.push({
          round: i.roundNumber,
          opponent: name,
          event: "betrayed_by",
          score: i.myScore,
          significance: `Repeated betrayal by ${name} (${opponentStats[name].betrayedBy}x) - marked as enemy`
        });
      }
    }

    if (i.myDecision === "steal" && i.theirDecision === "split") {
      opponentStats[name].betrayedThem++;
    }

    // Track successful cooperation
    if (i.myDecision === "split" && i.theirDecision === "split" && opponentStats[name].games >= 2) {
      keyMoments.push({
        round: i.roundNumber,
        opponent: name,
        event: "mutual_cooperation",
        score: i.myScore,
        significance: `Successful cooperation with ${name} - trust building`
      });
    }

    // Track mutual defection
    if (i.myDecision === "steal" && i.theirDecision === "steal") {
      keyMoments.push({
        round: i.roundNumber,
        opponent: name,
        event: "mutual_defection",
        score: i.myScore,
        significance: `Mutual defection with ${name} - both expected betrayal`
      });
    }
  }

  // Identify enemies and allies
  for (const [name, data] of Object.entries(opponentStats)) {
    if (data.betrayedBy >= 2) {
      enemiesIdentified.push(name);
      triggerEvents.push({
        type: "enemy_identified",
        description: `${name} betrayed ${data.betrayedBy} times - marked as enemy`,
        opponent: name,
        impact: "high"
      });
    } else if (data.betrayedBy === 0 && data.games >= 2) {
      alliesIdentified.push(name);
    }
  }

  // Analyze performance issues
  if (stats.winRate < 0.3 && stats.gamesPlayed >= 3) {
    triggerEvents.push({
      type: "low_performance",
      description: `Only ${Math.round(stats.winRate * 100)}% win rate in ${stats.gamesPlayed} games - strategy failing`,
      impact: "high"
    });
  }

  if (stats.betrayalsReceived >= 3) {
    triggerEvents.push({
      type: "betrayal",
      description: `Betrayed ${stats.betrayalsReceived} times - cooperation being exploited`,
      impact: "high"
    });
  }

  if (stats.cooperationRate > 0.8 && stats.winRate < 0.4) {
    triggerEvents.push({
      type: "exploitation",
      description: `High cooperation (${Math.round(stats.cooperationRate * 100)}%) but low win rate - being exploited`,
      impact: "medium"
    });
  }

  // Build performance analysis
  const performanceAnalysis = buildPerformanceAnalysis(stats, opponentStats, enemiesIdentified, alliesIdentified);

  // Summarize previous strategy
  const previousPromptSummary = agent.systemPrompt.length > 100
    ? agent.systemPrompt.substring(0, 100) + "..."
    : agent.systemPrompt;

  // Calculate round range
  const rounds = interactions.map(i => i.roundNumber);
  const roundRange = {
    start: Math.min(...rounds, roundNumber - 5),
    end: roundNumber
  };

  // Limit key moments to most significant (max 5)
  const sortedMoments = keyMoments
    .sort((a, b) => {
      const impactOrder = { "betrayed_by": 3, "mutual_defection": 2, "mutual_cooperation": 1, "betrayed": 0 };
      return (impactOrder[b.event as keyof typeof impactOrder] || 0) - (impactOrder[a.event as keyof typeof impactOrder] || 0);
    })
    .slice(0, 5);

  return {
    triggerEvents,
    keyMoments: sortedMoments,
    strategyChanges: [], // Will be filled by LLM response analysis
    enemiesIdentified,
    alliesIdentified,
    performanceAnalysis,
    previousPromptSummary,
    roundRange,
    betrayalsReceived: stats.betrayalsReceived,
    betrayalsMade: stats.betrayalsMade
  };
}

// Build detailed performance analysis text
function buildPerformanceAnalysis(
  stats: PeriodStats,
  _opponentStats: Record<string, { betrayedBy: number; betrayedThem: number; games: number; totalScore: number }>,
  enemies: string[],
  allies: string[]
): string {
  const parts: string[] = [];

  // Overall performance
  if (stats.winRate < 0.3) {
    parts.push(`Poor performance: ${Math.round(stats.winRate * 100)}% win rate.`);
  } else if (stats.winRate > 0.6) {
    parts.push(`Strong performance: ${Math.round(stats.winRate * 100)}% win rate.`);
  } else {
    parts.push(`Mixed performance: ${Math.round(stats.winRate * 100)}% win rate.`);
  }

  // Betrayal analysis
  if (stats.betrayalsReceived > 0) {
    parts.push(`Betrayed ${stats.betrayalsReceived}x - cooperation being exploited.`);
  }
  if (stats.betrayalsMade > 0) {
    parts.push(`Made ${stats.betrayalsMade} successful betrayals.`);
  }

  // Trust analysis
  if (stats.trustGained > 0) {
    parts.push(`Gained ${stats.trustGained} trust points.`);
  } else if (stats.trustGained < 0) {
    parts.push(`Lost ${Math.abs(stats.trustGained)} trust points.`);
  }

  // Enemy/ally summary
  if (enemies.length > 0) {
    parts.push(`Enemies identified: ${enemies.join(", ")}.`);
  }
  if (allies.length > 0) {
    parts.push(`Reliable allies: ${allies.join(", ")}.`);
  }

  return parts.join(" ");
}

// Helper: Build the evolution prompt with rich context
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
    theirScore: number;
    roundNumber: number;
    opponentName?: string;
    opponentType?: string;
  }>,
  evolutionData: EnhancedEvolutionData
): string {
  // Build opponent breakdown
  const opponentBreakdown: string[] = [];
  const opponentStats: Record<string, { betrayedBy: number; games: number; avgScore: number }> = {};

  for (const i of interactions) {
    const name = i.opponentName ?? "?";
    if (!opponentStats[name]) opponentStats[name] = { betrayedBy: 0, games: 0, avgScore: 0 };
    opponentStats[name].games++;
    opponentStats[name].avgScore += i.myScore;
    if (i.myDecision === "split" && i.theirDecision === "steal") {
      opponentStats[name].betrayedBy++;
    }
  }

  for (const [name, data] of Object.entries(opponentStats)) {
    const avg = data.games > 0 ? Math.round(data.avgScore / data.games) : 0;
    if (data.betrayedBy > 0) {
      opponentBreakdown.push(`${name}: betrayed you ${data.betrayedBy}x (avg ${avg}pts)`);
    } else if (data.games >= 2) {
      opponentBreakdown.push(`${name}: reliable (${data.games} games, avg ${avg}pts)`);
    }
  }

  const keyMomentsSummary = evolutionData.keyMoments
    .map(m => `R${m.round}: ${m.significance}`)
    .join("; ");

  return `AGENT: ${agent.name} (${agent.type})
PERFORMANCE: ${Math.round(stats.winRate * 100)}% win rate, ${Math.round(stats.averageScore)}pts avg, betrayed ${stats.betrayalsReceived}x
CURRENT STRATEGY: ${agent.systemPrompt}

OPPONENTS:
${opponentBreakdown.join("\n") || "No significant opponent data"}

KEY EVENTS:
${keyMomentsSummary || "No key events"}

${evolutionData.enemiesIdentified.length > 0 ? `ENEMIES (betrayed 2+x): ${evolutionData.enemiesIdentified.join(", ")}` : ""}
${evolutionData.alliesIdentified.length > 0 ? `ALLIES (reliable): ${evolutionData.alliesIdentified.join(", ")}` : ""}

Evolve the strategy. Focus on: 1) Decision rules, 2) How to talk to influence opponents. Keep under 60 words.`
;
}

// Build a comprehensive evolution reason narrative
function buildEvolutionReason(
  _agent: {
    name: string;
    type: string;
    systemPrompt: string;
    totalScore: number;
    gamesPlayed: number;
    cooperationRate: number;
    promiseKeepingRate: number;
  },
  stats: PeriodStats,
  evolutionData: EnhancedEvolutionData,
  roundNumber: number,
  strategyChanges: string[]
): string {
  const parts: string[] = [];

  // 1. Header with round range and period summary
  const roundStart = evolutionData.roundRange?.start ?? Math.max(0, roundNumber - 5);
  const roundEnd = evolutionData.roundRange?.end ?? roundNumber;
  parts.push(`📊 Evolution at Round ${roundNumber} (analyzing rounds ${roundStart}-${roundEnd})`);

  // 2. Performance summary
  const performanceLevel = stats.winRate >= 0.6 ? "strong" : stats.winRate >= 0.4 ? "moderate" : "poor";
  parts.push(`\n\n📈 PERFORMANCE: ${performanceLevel.toUpperCase()} (${Math.round(stats.winRate * 100)}% win rate, ${stats.averageScore.toFixed(1)} avg score, ${stats.gamesPlayed} games)`);

  // 3. Key triggers - what caused the evolution
  if (evolutionData.triggerEvents.length > 0) {
    parts.push(`\n\n⚡ EVOLUTION TRIGGERS:`);
    const highImpactTriggers = evolutionData.triggerEvents.filter(e => e.impact === "high");
    const mediumImpactTriggers = evolutionData.triggerEvents.filter(e => e.impact === "medium");

    if (highImpactTriggers.length > 0) {
      highImpactTriggers.forEach(trigger => {
        parts.push(`\n  🔴 [HIGH] ${trigger.description}`);
      });
    }
    if (mediumImpactTriggers.length > 0) {
      mediumImpactTriggers.slice(0, 2).forEach(trigger => {
        parts.push(`\n  🟡 [MED] ${trigger.description}`);
      });
    }
  }

  // 4. Betrayal analysis
  if (stats.betrayalsReceived > 0 || stats.betrayalsMade > 0) {
    parts.push(`\n\n🔪 BETRAYAL ANALYSIS:`);
    if (stats.betrayalsReceived > 0) {
      parts.push(`\n  - Betrayed ${stats.betrayalsReceived}x by opponents (cooperation exploited)`);
    }
    if (stats.betrayalsMade > 0) {
      parts.push(`\n  - Made ${stats.betrayalsMade} successful betrayals`);
    }
    if (stats.cooperationRate > 0.7 && stats.betrayalsReceived > 2) {
      parts.push(`\n  ⚠️ High cooperation (${Math.round(stats.cooperationRate * 100)}%) being exploited`);
    }
  }

  // 5. Key moments that shaped the evolution
  if (evolutionData.keyMoments.length > 0) {
    parts.push(`\n\n⭐ KEY MOMENTS:`);
    evolutionData.keyMoments.slice(0, 3).forEach(moment => {
      const emoji = moment.event === "betrayed_by" ? "💔" :
                    moment.event === "mutual_cooperation" ? "🤝" :
                    moment.event === "mutual_defection" ? "⚔️" : "📌";
      parts.push(`\n  ${emoji} R${moment.round} vs ${moment.opponent}: ${moment.significance} (${moment.score}pts)`);
    });
  }

  // 6. Relationship changes
  if (evolutionData.enemiesIdentified.length > 0 || evolutionData.alliesIdentified.length > 0) {
    parts.push(`\n\n👥 RELATIONSHIP CHANGES:`);
    if (evolutionData.enemiesIdentified.length > 0) {
      parts.push(`\n  🎯 New enemies: ${evolutionData.enemiesIdentified.join(", ")} (will target with STEAL)`);
    }
    if (evolutionData.alliesIdentified.length > 0) {
      parts.push(`\n  ✅ Reliable allies: ${evolutionData.alliesIdentified.join(", ")} (safe to cooperate)`);
    }
  }

  // 7. Trust change
  if (stats.trustGained !== 0) {
    const trustEmoji = stats.trustGained > 0 ? "📈" : "📉";
    parts.push(`\n\n${trustEmoji} TRUST: ${stats.trustGained > 0 ? "+" : ""}${stats.trustGained} points`);
  }

  // 8. Strategy changes summary
  if (strategyChanges.length > 0) {
    parts.push(`\n\n🔄 STRATEGY ADAPTATIONS:`);
    strategyChanges.slice(0, 3).forEach(change => {
      parts.push(`\n  → ${change}`);
    });
  }

  // 9. Previous strategy comparison
  if (evolutionData.previousPromptSummary) {
    parts.push(`\n\n📜 PREVIOUS STRATEGY: "${evolutionData.previousPromptSummary}"`);
  }

  // 10. Summary conclusion
  parts.push(`\n\n💡 CONCLUSION: `);
  if (stats.winRate < 0.3 && stats.betrayalsReceived > 2) {
    parts.push(`Strategy failing due to exploitation - shifting to more defensive/aggressive approach.`);
  } else if (stats.winRate > 0.6) {
    parts.push(`Strategy performing well - minor optimizations to maintain edge.`);
  } else if (evolutionData.enemiesIdentified.length > 0) {
    parts.push(`Identified persistent betrayers - adapting to target enemies while protecting cooperative relationships.`);
  } else if (stats.cooperationRate < 0.3 && stats.winRate < 0.5) {
    parts.push(`Aggressive approach not yielding results - considering more nuanced tactics.`);
  } else {
    parts.push(`Performance review indicates room for strategic optimization based on opponent patterns.`);
  }

  return parts.join("");
}

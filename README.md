# STUHI: The Trust Arena

> An AI training simulation where agents learn that **words are cheap unless backed by action**.

## The Concept

STUHI is a real-time simulation based on the classic Prisoner's Dilemma, enhanced with a **negotiation phase** where AI agents communicate before making decisions. This creates a rich training environment for AI to learn:

- Trust and reputation building
- Deception detection
- The relationship between words and actions
- Long-term cooperation strategies

## The Game

### Core Mechanics: Split or Steal

Each round, two players must choose: **SPLIT** (cooperate) or **STEAL** (defect)

| Player A | Player B | A Gets | B Gets |
|----------|----------|--------|--------|
| Split    | Split    | 50%    | 50%    |
| Split    | Steal    | 0%     | 100%   |
| Steal    | Split    | 100%   | 0%     |
| Steal    | Steal    | 0%     | 0%     |

### The Twist: Negotiation Phase

Before each decision, agents can **communicate**:

```
┌─────────────────────────────────────────┐
│  ROUND STRUCTURE                        │
│                                         │
│  1. NEGOTIATION PHASE                   │
│     → Players exchange messages         │
│     → Make promises, threats, appeals   │
│     → Reference past history            │
│                                         │
│  2. DECISION PHASE                      │
│     → Split or Steal (hidden)           │
│                                         │
│  3. REVEAL                              │
│     → See what they SAID vs DID         │
│     → Reputation updates                │
└─────────────────────────────────────────┘
```

This transforms a simple game theory problem into a rich simulation of **human-like social dynamics**.

## Personality Types (AI Agents)

The simulation includes diverse personality archetypes:

| Personality | Strategy | Communication Style |
|-------------|----------|---------------------|
| **Naive Cooperator** | Always splits | Trusting, believes promises |
| **Greedy** | Always steals | Lies convincingly, breaks promises |
| **Tit-for-Tat** | Mirrors opponent's last move | Direct, references history |
| **Grudger** | Cooperates until betrayed, then never forgives | Holds grudges openly |
| **Forgiver** | Like Tit-for-Tat but occasionally forgives | Seeks reconciliation |
| **Random** | Unpredictable | Chaotic, inconsistent messaging |
| **Analyzer** | Studies opponent history before deciding | Asks probing questions |

## The Live Dashboard

A real-time "god view" of the entire simulation:

```
┌─────────────────────────────────────────────────────────────────┐
│  TRUST ARENA - Live Simulation                       [Running] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ACTIVE NEGOTIATIONS      ┌──────────────┐ │
│  │ LEADERBOARD │                              │ LIVE CHAT    │ │
│  │             │     [Tit4Tat vs Greedy]      │              │ │
│  │ 1. Forgiver │     [Naive vs Random]        │ Greedy: "I   │ │
│  │ 2. Tit4Tat  │     [Grudger vs Naive]       │ promise to   │ │
│  │ 3. Grudger  │           ...                │ split this   │ │
│  │ 4. Greedy   │                              │ time..."     │ │
│  │ 5. Naive    │        ↑ click to listen     │              │ │
│  └─────────────┘                              │ [STEAL]      │ │
│                                               └──────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  COOPERATION RATE OVER TIME                              │  │
│  │  ████████████████████▓▓▓▓▓▓▓░░░░░░░░                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TRUST NETWORK - Who trusts whom?                        │  │
│  │       [Visual graph of agent relationships]              │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Features

- **Live Matches**: See all negotiations happening in parallel
- **Click to Listen**: Open any conversation and watch it unfold in real-time
- **Leaderboard**: Who's winning? Which strategy dominates?
- **Cooperation Rate Graph**: Track how cooperation evolves over time
- **Trust Network**: Visual map of who trusts whom
- **Betrayal Alerts**: Dramatic reveals when promises are broken

## What The AI Learns

This simulation teaches AI agents crucial social intelligence:

### 1. Communication vs Action
> "Words are cheap. The AI learns that promises only have value when backed by consistent history."

### 2. Reputation Dynamics
> "Trust is built slowly and destroyed quickly. Agents learn the long-term cost of betrayal."

### 3. Deception Detection
> "By observing patterns between what agents say and do, AI learns to identify unreliable actors."

### 4. Strategic Communication
> "When should you reveal your intentions? When should you bluff? The AI discovers optimal communication strategies."

### 5. Forgiveness vs Grudges
> "Is it better to forgive and rebuild cooperation, or punish defectors forever? Different strategies emerge."

## Why This Wins (Judging Criteria)

| Criteria | Score | Why |
|----------|-------|-----|
| **Clarity** | 10/10 | Rules explained in 30 seconds |
| **Learning Potential** | 10/10 | Multi-layered: game theory + language + trust |
| **Creativity** | 10/10 | Communication layer is the differentiator |
| **Dynamics** | 10/10 | Every word and action has consequences |
| **Explanation** | 10/10 | Clear narrative of what AI learns |

## Technical Implementation

### Stack
- **Runtime**: Bun
- **Frontend**: React + TypeScript
- **Backend/Database**: Convex (real-time)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **AI Agents**: Rule-based + optional LLM (Claude Haiku / GPT-4o-mini)

### Why Convex?
- **Real-time subscriptions**: Dashboard updates instantly as games happen
- **No backend code**: Focus on simulation logic, not infrastructure
- **Built-in database**: Agent histories and stats persist automatically

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React UI      │ ←── │   Convex        │ ←── │   AI Agents     │
│   (Dashboard)   │     │   (Real-time)   │     │   (Personalities)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ↓                       ↓                       ↓
   Live updates          Game state            Decision logic
   Click interactions    Message history       Negotiation strategy
   Visualizations        Reputation scores     LLM integration (opt)
```

## Key Differentiators

1. **Not just Prisoner's Dilemma** - The negotiation phase makes this original
2. **Watchable** - Real-time dashboard makes it compelling to observe
3. **Interactive** - Click into any conversation to "listen in"
4. **Emergent behavior** - Simple rules create complex social dynamics
5. **Clear learning story** - Easy to explain what AI gains from this

## Sample Negotiation

```
╔══════════════════════════════════════════════════════════════╗
║  ROUND 7: Tit-for-Tat vs Greedy                              ║
║  History: Greedy betrayed Tit-for-Tat in Round 4             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Greedy: "Look, I know I messed up before. But I've         ║
║          changed. Let's both split and move forward."        ║
║                                                              ║
║  Tit4Tat: "You said that in Round 5 too. Then you stole.    ║
║           Your promise-keeping rate is 23%. Why should      ║
║           I believe you now?"                                ║
║                                                              ║
║  Greedy: "Fair point. But staying stuck hurts us both.      ║
║          I'll split. Watch."                                 ║
║                                                              ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │  DECISIONS LOCKED                                      │  ║
║  │  Tit4Tat: STEAL (mirroring last betrayal)             │  ║
║  │  Greedy:  STEAL (lied again)                          │  ║
║  │  RESULT:  Both get 0%                                 │  ║
║  └────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════╝
```

## Pitch One-Liner

> "A simulation where AI agents negotiate, promise, and betray each other - learning that trust is earned through actions, not words."

## Future Extensions

- **Evolution mode**: Winning strategies reproduce, losers die out
- **Human player**: Join the simulation and play against AI
- **Custom personalities**: Create your own agent strategies
- **Tournament mode**: Bracket-style competition
- **LLM integration**: Free-form natural language negotiation

## Quick Start

```bash
bun create convex@latest stuhi
cd stuhi
bunx shadcn@latest init
bun run dev          # Terminal 1
bunx convex dev      # Terminal 2
```

## License

MIT

---

**Built for FR8 Hackathon 2025**

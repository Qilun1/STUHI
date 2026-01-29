# FR8 - Split/Steal Simulation (WIP)

**A focused experimental branch** for the core Prisoner's Dilemma game simulation with LLM-powered agents and evolutionary learning.

🎮 Split or Steal | 🤖 10 Agent Types | 🧬 Strategy Evolution | 📊 Real-time Analytics

---

## Branch Overview

This **work-in-progress** branch focuses on the core split/steal game simulation mechanics. It's a streamlined version for rapid experimentation with agent personalities, decision-making strategies, and evolutionary learning.

> **Note:** This is an experimental branch. For production-ready features including voice Q&A, see the `main` or `feature/voice-qa-agent-profiles` branches.

---

## Features

### 🎮 Core Game Simulation
- 🎲 **Split or Steal** - Classic Prisoner's Dilemma game mechanics
- 💬 **LLM Negotiation** - Agents chat before making decisions
- 🔄 **Automated Rounds** - Continuous simulation with random pairings
- ⚡ **Parallel Processing** - 5 games per round, processed simultaneously

### 🤖 Agent System (10 Personalities)
- 🎩 **Diplomat** - Build trust, retaliate once if betrayed, then forgive
- 🦈 **Shark** - Lull with cooperation, then strike when comfortable
- 😇 **Saint** - Always split, lead by example
- 😤 **Grudger** - One chance only, betray once = eternal retaliation
- 🔬 **Analyst** - Decide based on opponent's statistical history
- 💋 **Charmer** - Exploit emotional trust
- 😰 **Paranoid** - Steal by default, require proven loyalty
- 💚 **Healer** - Forgive and offer fresh starts
- 🃏 **Wildcard** - Pure chaos and unpredictability
- 🪞 **Mirror** - Tit-for-tat strategy

### 🧬 Evolution System
- 📈 **Performance Tracking** - Win rate, cooperation rate, promise-keeping
- 🔄 **Self-Reflection** - Agents analyze their own performance via LLM
- 📝 **Prompt Evolution** - Strategies evolve every N rounds
- 📚 **Version History** - Full evolution history with metrics

### 🧠 Memory & Trust
- 💭 **Agent Memories** - Remember opponent behavior and betrayals
- 🤝 **Trust Scores** - Dynamic trust levels (-100 to +100)
- ⚠️ **Enemy Detection** - Quick identification of betrayers (1 betrayal threshold)
- 📝 **Promise Tracking** - Extract and track implied promises from messages

---

## Game Mechanics

### Split or Steal Payoff Matrix

| Agent A | Agent B | A's Score | B's Score |
|---------|---------|-----------|-----------|
| Split   | Split   | +3        | +3        |
| Split   | Steal   | +0        | +5        |
| Steal   | Split   | +5        | +0        |
| Steal   | Steal   | +1        | +1        |

### Game Flow Pipeline

```
1. Game Creation
       ↓
2. Negotiation Phase (LLM chat exchange)
       ↓
3. Decision Phase (split or steal)
       ↓
4. Reveal & Scoring
       ↓
5. Trust/Memory Recording
       ↓
6. Evolution Check (every N rounds)
```

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| **Backend** | Convex (BaaS), Node.js |
| **AI/ML** | OpenAI GPT-4o-mini |
| **UI Components** | Radix UI, Recharts, Lucide Icons |

---

## Prerequisites

- Node.js 18+ or [Bun](https://bun.sh)
- [Convex](https://convex.dev) account (free)
- [OpenAI](https://platform.openai.com) API key (required)
- [ElevenLabs](https://elevenlabs.io) API key (optional, for voice)

> 📖 **New to this?** See [SETUP.md](SETUP.md) for detailed instructions on getting API keys.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Qilun1/STUHI.git
cd STUHI
npm install

# 2. Set up Convex (creates account & project)
npx convex dev

# 3. Add your OpenAI API key
npx convex env set OPENAI_API_KEY "sk-your-key-here"

# 4. (Optional) Add ElevenLabs for voice
npx convex env set ELEVEN_LABS_API_KEY "your-key-here"

# 5. Start the app
npm run dev
# or
bun run dev
```

Open http://localhost:5173 in your browser.

---

## Getting API Keys

### OpenAI (Required)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys** → **Create new secret key**
4. Copy the key (starts with `sk-`)
5. Run: `npx convex env set OPENAI_API_KEY "sk-your-key"`

> **Cost**: ~$0.01-0.05 per simulation round using GPT-4o-mini. New accounts get $5 free credit.

### Convex (Required, Free)

1. Run `npx convex dev` in the project directory
2. It will open a browser to log in / create account
3. Follow prompts to create a new project
4. Done! Convex is now configured.

### ElevenLabs (Optional)

For voice features (agents speaking):

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Sign up and go to **Profile** → **API Keys**
3. Create and copy your API key
4. Run: `npx convex env set ELEVEN_LABS_API_KEY "your-key"`

> **Free tier**: 10,000 characters/month. Simulation works without it (just no voice).

---

## Usage

### Running the Simulation

1. **Setup** - Click "Setup" to initialize 10 AI agents
2. **Start** - Click "Start" to begin the simulation
3. **Watch** - Observe negotiations and decisions in real-time
4. **Inspect** - Click on matches to see negotiation details
5. **Analyze** - Click on agents to see their evolution history

### Dashboard Components

- **Leaderboard** - Agent rankings by total score
- **Active Matches** - Current round games with live updates
- **Cooperation Chart** - Trend line showing cooperation over time
- **Trust Network** - Visualization of agent relationships

---

## Database Schema

| Table | Description |
|-------|-------------|
| **agents** | Agent profiles with cumulative stats |
| **games** | Individual matches with decisions and scores |
| **messages** | Chat transcripts with extracted promises |
| **interactions** | Historical record of all agent pairings |
| **trustRelationships** | Trust scores between agent pairs |
| **promptEvolutions** | Version history of evolved strategies |
| **agentMemories** | Short-term memory of opponent behavior |
| **roundSummaries** | Analytics per round |

---

## Project Structure

```
STUHI/
├── src/
│   ├── App.tsx                    # Main application
│   └── components/
│       ├── dashboard/             # Control panel, matches
│       ├── broadcast/             # Live simulation view
│       └── visualization/         # Charts, networks
├── convex/
│   ├── agents/
│   │   ├── personalities.ts       # Agent type definitions
│   │   ├── llmAgent.ts            # OpenAI integration
│   │   ├── memories.ts            # Memory management
│   │   └── mutations.ts           # Agent state updates
│   ├── simulation/
│   │   ├── orchestrator.ts        # Game runner
│   │   ├── scorer.ts              # Scoring logic
│   │   └── state.ts               # Simulation state
│   ├── evolution/
│   │   └── evolve.ts              # Strategy evolution
│   └── schema.ts                  # Database schema
└── package.json
```

---

## Recent Optimizations

This WIP branch includes focused tuning:

- ⚡ **Ultra-short prompts** - Optimized for speed and cost
- 🎯 **Persuasion-focused tactics** - Enhanced agent negotiation strategies
- 🔍 **Lower enemy threshold** - Faster betrayal detection (2 → 1)
- 💬 **Shorter messages** - Concise agent communication

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "OPENAI_API_KEY not configured" | Run: `npx convex env set OPENAI_API_KEY "sk-your-key"` |
| "Convex deployment not found" | Run: `npx convex dev` and follow prompts |
| Agents not speaking | ElevenLabs key missing or free tier exceeded |
| Rate limit errors | Wait a minute, or check OpenAI dashboard for limits |

> 📖 See [SETUP.md](SETUP.md) for detailed troubleshooting and cost estimates.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Convex |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Development Notes

This branch is actively used for:
- 🧪 Testing new agent personality configurations
- ⚙️ Tuning decision-making parameters
- 📊 Analyzing emergent behavior patterns
- 🔄 Iterating on evolution mechanics

Results are logged to `games_output.txt` for offline analysis.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 🤖 OpenAI for GPT-4o-mini powering agent intelligence
- ⚡ Convex for real-time backend infrastructure
- 🎮 Inspired by game theory and behavioral economics research

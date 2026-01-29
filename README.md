# FR8 - The Trust Arena

**An AI-powered multi-agent simulation platform** that models the Prisoner's Dilemma game with evolving personalities, strategic negotiations, and emergent behavior.

📊 Agent Evolution | 🎮 Split or Steal | 🎤 Voice Interactions | 🧠 Memory Systems

---

## Features

### 🤖 Agent Simulation Features
- 🎭 **20 Unique Personalities** - Diplomat, Shark, Saint, Grudger, Analyst, and more
- 🧬 **Evolving Strategies** - Agents adapt their behavior based on performance
- 💬 **Negotiation Phase** - Agents exchange persuasive messages before deciding
- 📝 **Promise Tracking** - System extracts and tracks implied commitments
- 🎯 **Decision Making** - LLM-powered strategic choices (split or steal)

### 🧠 Memory & Learning Features
- 📚 **Agent Memories** - Persistent notes about specific opponents
- 🤝 **Trust Relationships** - Dynamic trust scores between agent pairs
- 📈 **Performance Metrics** - Win rate, cooperation rate, promise-keeping rate
- 🔄 **Interaction History** - Complete record of all past encounters
- 🎭 **Emotional State** - Agents develop attitudes toward nemeses and allies

### 🎤 Voice & Audio Features
- 🔊 **Text-to-Speech** - Agent messages voiced using ElevenLabs
- 🎙️ **Voice Q&A** - Ask agents questions about their decisions
- 🗣️ **Speech Recognition** - Voice input for user interactions
- 🔇 **Mute Controls** - Toggle voice playback globally

### 📊 Analytics & Visualization Features
- 🏆 **Leaderboard** - Real-time agent rankings by score
- 📉 **Cooperation Trends** - Line charts showing behavior over time
- 🕸️ **Trust Networks** - Visualize relationships between agents
- 📖 **Evolution Stories** - Dramatic narratives of strategy changes
- 🧬 **Neural Network Animation** - Immersive visual during simulation

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| **Backend** | Convex (BaaS), Node.js |
| **AI/ML** | OpenAI GPT-4o-mini |
| **Voice** | ElevenLabs SDK |
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

### Starting a Simulation

1. **Setup Phase** - Click "Setup" to initialize 20 AI agents
2. **Run Simulation** - Click "Play" to start the game rounds
3. **Watch Matches** - Observe agents negotiate and make decisions
4. **Pause/Resume** - Control simulation flow as needed

### Agent Profiles

Click on any agent in the leaderboard to view:
- 📊 **Overview** - Stats, cooperation rate, win rate
- 🧠 **Memories** - Notes about specific opponents
- 🧬 **Evolution** - History of strategy changes with narratives

### Voice Q&A

1. Click the microphone icon on an agent profile
2. Ask a question about their decisions or strategy
3. Receive an audio response from the agent

### Match Replay

1. Select a completed match from the history
2. Watch the negotiation unfold with synchronized voice
3. See the decision reveal and scoring

---

## Game Mechanics

### Split or Steal (Prisoner's Dilemma)

| Agent A | Agent B | A's Score | B's Score |
|---------|---------|-----------|-----------|
| Split   | Split   | +3        | +3        |
| Split   | Steal   | +0        | +5        |
| Steal   | Split   | +5        | +0        |
| Steal   | Steal   | +1        | +1        |

### Evolution System

Agents evolve their strategies every 5 rounds based on:
- ⚡ **Trigger Events** - Betrayals, streaks, major wins/losses
- 🎯 **Key Moments** - Significant interactions that shaped behavior
- 😤 **Emotional State** - Current attitude and frustration levels
- 🎭 **Relationship Changes** - New enemies or allies identified

---

## Project Structure

```
stuhi/
├── src/                          # Frontend React application
│   ├── components/
│   │   ├── dashboard/            # Control panel, matches
│   │   ├── matches/              # Chat, decisions, replay
│   │   ├── broadcast/            # Live simulation view
│   │   ├── visualization/        # Charts, networks
│   │   └── ui/                   # Radix UI components
│   ├── hooks/                    # Custom React hooks
│   └── lib/                      # Utilities
├── convex/                       # Backend (Convex)
│   ├── agents/                   # Agent logic & personalities
│   ├── simulation/               # Game orchestration
│   └── evolution/                # Strategy evolution
├── package.json
└── vite.config.ts
```

---

## Agent Personalities

| Agent | Strategy | Tactics |
|-------|----------|---------|
| 🎩 **Diplomat** | Build trust | References shared history, emphasizes mutual benefit |
| 🦈 **Shark** | Exploit weakness | Makes emotional appeals, exploits commitment |
| 😇 **Saint** | Genuine cooperation | Warmth and sincerity, inspires guilt in betrayers |
| 😤 **Grudger** | Conditional trust | Forgives once, never forgets second offense |
| 🔬 **Analyst** | Data-driven | Cites statistics, tests honesty through probing |
| ... | ... | *16 more unique personalities* |

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

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 🤖 OpenAI for GPT-4o-mini powering agent intelligence
- 🔊 ElevenLabs for realistic voice synthesis
- ⚡ Convex for real-time backend infrastructure
- 🎮 Inspired by game theory and behavioral economics research

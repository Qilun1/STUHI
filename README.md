# Multi-Party Negotiation Simulator

**An AI-powered multi-party negotiation platform** with research-driven personalities, dynamic alliance formation, and evolutionary strategy learning.

🤝 N-Party Negotiations | 🧬 Personality Evolution | 🔗 Alliance Detection | 📊 Multi-Round Meta-Games

---

## Branch Overview

This branch transforms the game theory simulation into a **sophisticated multi-party negotiation simulator** where 3+ parties with distinct interests negotiate simultaneously. Parties form alliances, adapt strategies between rounds, and exhibit realistic behavior based on historical research.

---

## Features

### 🤝 Multi-Party Negotiation Engine
- 👥 **N-Party Support** - 3, 4, 5+ parties with conflicting interests
- 🌍 **Real-World Scenarios** - Greenland purchase, international disputes, corporate deals
- 🔄 **Round-Robin Turns** - Each party speaks in sequence
- ⏱️ **Phase Tracking** - Opening → Bargaining → Closing with time pressure
- 🎯 **10 Move Types** - Offer, counteroffer, demand, threat, alliance proposal, and more

### 🧬 Personality Evolution System
- 📈 **Performance-Based Learning** - Losers adapt strategies between rounds
- 🎭 **Style Changes** - Aggressive → diplomatic, formal → blunt
- 📝 **Evolution Logging** - Full history of what changed and why
- 🧠 **LLM Coaching** - GPT-4 analyzes performance and recommends changes
- 🔄 **Multi-Round Meta-Games** - Strategies diverge over repeated negotiations

### 🔗 Alliance Mechanics
- 🤝 **Explicit Formation** - Parties propose and accept alliances
- 🔍 **Implicit Detection** - Mutual support moves create automatic alliances
- 📊 **Coalition Scoring** - Winning coalitions vs. isolated parties
- 🕸️ **Visual Representation** - Lines connecting allied parties in UI

### 🔬 Research-Driven Parties
- 📚 **Historical Behavior** - Based on real negotiation patterns
- 🎭 **Personality Profiles** - Style, tone, risk tolerance, trust level
- 🎯 **Key Traits** - Deal-maker mindset, uses walkaway threats, stubborn, etc.
- 💬 **Communication Patterns** - Blunt vs. formal, unpredictable vs. measured

---

## Game Mechanics

### Move Types

| Move | Description |
|------|-------------|
| 📤 **offer** | Propose specific terms to all or specific parties |
| 🔄 **counteroffer** | Modify another's proposal |
| ✋ **concession** | Give ground on a position |
| ⚡ **demand** | Insist on a specific requirement |
| ⚠️ **threat** | Warn of consequences |
| 🤝 **alliance_proposal** | Explicitly form coalition with specific parties |
| 👍 **support** | Publicly back another party's position |
| ❓ **challenge** | Question or attack another party's position |
| ✅ **accept** | Accept the current deal |
| 🚪 **walkaway** | End negotiations (ends game) |

### Resolution Conditions

| Condition | Result |
|-----------|--------|
| **Walkaway** | Any party leaves → immediate end |
| **Majority Accept** | 50%+ accept → deal reached |
| **Timeout** | Max turns reached → negotiation failed |

### Outcome Types

| Outcome | Description |
|---------|-------------|
| 🎉 **Deal** | Most parties accepted (winning coalition) |
| ⚖️ **Partial** | Some accepted, some walked (fractured agreement) |
| 💥 **Collapse** | No agreement reached (all lose) |

### Scoring

Each party receives a satisfaction score (0-100) based on:
- How many of their interests were satisfied
- Whether red lines were avoided
- Negotiation performance
- Deal quality for that party

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| **Backend** | Convex (BaaS), Node.js |
| **AI/ML** | OpenAI GPT-4 |
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

### Running a Multi-Party Negotiation

1. **Setup** - Enter a scenario topic (e.g., "Greenland purchase negotiation")
2. **Preview** - Review generated parties and their personalities
3. **Run Negotiation** - Watch parties negotiate in real-time
4. **View Results** - See outcome scores and winning coalitions
5. **Run Evolution** - Advance to next round with evolved personalities

### UI Components

**Party Circle**
- Parties arranged in a circle
- Current speaker highlighted with ring
- Alliance lines connect allied parties (green dashed)

**Move Timeline**
- Scrolling transcript with party colors
- Move types and emotional tones displayed
- Target parties shown for directed moves

**Round Tracker (Sidebar)**
- Round timeline with status indicators
- Rankings and scores per round
- Strategy evolutions documented
- Tactical insights discovered

---

## Example Scenario

**Greenland Purchase Negotiation (4 parties)**

| Party | Representative | Style | Interests |
|-------|----------------|-------|-----------|
| 🇺🇸 United States | Trump | Aggressive, unpredictable | Full acquisition |
| 🇩🇰 Denmark | PM | Diplomatic, formal | Sovereignty protection |
| 🇬🇱 Greenland | PM | Pragmatic, emotional | Economic benefits |
| 🇨🇦 Canada | Minister | Principled, calculated | Block US expansion |

**Sample Negotiation:**
```
Turn 0 (US):   [offer] "We'll pay $100B for full sovereignty"
Turn 1 (DEN):  [demand] "Greenland is non-negotiable. But we're open to trade"
Turn 2 (GRL):  [alliance_proposal] "Canada, let's coordinate leverage"
Turn 3 (CAN):  [support] "We're allied with Greenland. US bid is too aggressive"
Turn 4 (US):   [counteroffer] "OK, autonomous status instead"
Turn 5 (DEN):  [threat] "Any attempt to divide us weakens everyone"
Turn 6 (GRL):  [offer] "We want economic investment, not sovereignty transfer"
Turn 7 (CAN):  [challenge] "US is trying to divide us. Stand firm"
Turn 8 (US):   [walkaway] "If you won't negotiate, we're done"
```

**Outcome:** Collapse
- US: 20/100 | DEN: 40/100 | GRL: 25/100 | CAN: 35/100

**Evolution for Round 2:**
- US → "Less aggressive opening, focus on economic partnership"
- GRL → "Build stronger pre-negotiation coalition"
- CAN → "Support don't just oppose, propose alternatives"

---

## Project Structure

```
STUHI/
├── src/
│   └── components/
│       └── negotiator/
│           ├── negotiation/
│           │   └── MultiPartyView.tsx    # Main negotiation UI
│           └── evolution/
│               └── RoundTracker.tsx      # Evolution tracking sidebar
├── convex/
│   ├── negotiations/
│   │   ├── multiPartyEngine.ts           # Core negotiation logic
│   │   └── strategies.ts                 # Tactical strategies
│   ├── evolution/
│   │   ├── personalityEvolution.ts       # Evolution system
│   │   └── roundRunner.ts                # Round orchestration
│   ├── research/
│   │   └── generate.ts                   # Scenario generation
│   └── schema.ts                         # Database schema
└── package.json
```

---

## Key Database Tables

| Table | Description |
|-------|-------------|
| **negotiations** | Multi-party negotiation runs with outcomes |
| **negotiationMoves** | Individual moves with tactics and emotional tones |
| **scenarios** | Research-driven scenarios with party personalities |
| **negotiationRounds** | Round results and evolution logs |

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

## Comparison with Main Branch

| Feature | Main (Split-Steal) | Multi-Party |
|---------|-------------------|-------------|
| Party Count | 2 players | 3-5+ parties |
| Game Type | Prisoner's dilemma | Real-world negotiation |
| Personalities | Generic types | Research-driven |
| Alliances | None | Dynamic formation |
| Move Types | 2 (split/steal) | 10 types |
| Evolution | Post-game | Multi-round cycles |

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 🤖 OpenAI for GPT-4 powering party intelligence and evolution
- ⚡ Convex for real-time backend infrastructure
- 🎮 Inspired by game theory and international negotiation research
- 📚 Based on behavioral economics and multi-party bargaining theory

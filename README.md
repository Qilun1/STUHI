# FR8 - The Trust Arena (Voice QA Edition)

**An AI-powered multi-agent simulation platform** with interactive voice Q&A and comprehensive agent profiling capabilities.

🎤 Voice Interactions | 🧠 Agent Profiles | 📊 Evolution Tracking | 🎭 20 Personalities

---

## Branch Overview

This feature branch adds **interactive voice interaction and comprehensive agent profiling** to the STUHI game simulation platform. Users can directly converse with AI agents about their decisions, strategies, and memories.

---

## Features

### 🎤 Voice Q&A System
- 🗣️ **Multi-mode Input** - Voice recording via Web Speech API + text fallback
- 📝 **Live Transcription** - Real-time display of speech-to-text results
- 🤖 **In-Character Responses** - Agents respond using GPT-4o-mini with full context
- 🔊 **Text-to-Speech Output** - ElevenLabs generates voice responses
- 🎭 **Context-Aware** - Responses reference game history, memories, and evolution

### 🧠 Agent Profile Modal
Three detailed tabs for each agent:

**📊 Overview Tab**
- Current strategy and system prompt
- Performance stats (wins, losses, draws, promise-keeping rate)
- Relationship summary with trust distribution
- Integrated VoiceQA component

**💭 Memories Tab**
- All relationships and memories with other agents
- Trust levels with color coding (trusted/neutral/distrusted/enemy)
- Betrayal history and notes for each relationship

**🧬 Evolution Tab**
- Complete strategy evolution history
- Win rate and performance per version
- Emotional state badges and key lessons
- Trigger events, strategy changes, and narratives
- Agent's self-reflection in first person

### 🎵 Voice & Audio Infrastructure
- 🎙️ **Speech Recognition Hook** - Cross-browser Web Speech API wrapper
- 📻 **Voice Queue System** - Sequential audio playback management
- 🔇 **Mute Controls** - Global toggle with localStorage persistence
- 🎭 **Voice Mapping** - 20 unique ElevenLabs voices for each personality

### 🤖 Agent Simulation Features
- 🎭 **20 Unique Personalities** - Diplomat, Shark, Saint, Grudger, Analyst, and more
- 🧬 **Evolving Strategies** - Agents adapt based on performance
- 💬 **Negotiation Phase** - Persuasive message exchange before decisions
- 📝 **Promise Tracking** - Implied commitment detection and tracking
- 🎯 **LLM Decision Making** - Strategic split/steal choices

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| **Backend** | Convex (BaaS), Node.js |
| **AI/ML** | OpenAI GPT-4o-mini |
| **Voice** | ElevenLabs SDK, Web Speech API |
| **UI Components** | Radix UI, Recharts, Lucide Icons |

---

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key
- ElevenLabs API key (required for voice features)
- Convex account

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Qilun1/STUHI.git
cd STUHI
git checkout feature/voice-qa-agent-profiles
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```dotenv
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# ElevenLabs Configuration (required for voice features)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 4. Convex Setup

```bash
npx convex dev
```

### 5. Start Development Server

```bash
npm run dev
```

---

## Usage

### Voice Q&A with Agents

1. Click on any agent in the leaderboard to open their profile
2. Navigate to the **Overview** tab
3. Click the microphone icon or type your question
4. Ask about their decisions, strategy, or relationships
5. Receive an in-character audio response

**Example Questions:**
- "Why did you betray the Diplomat?"
- "What's your strategy against aggressive players?"
- "How do you feel about your current win rate?"

### Agent Profile Exploration

1. **Overview** - View stats and ask questions
2. **Memories** - See what the agent remembers about opponents
3. **Evolution** - Track how their strategy changed over time

---

## Voice Configuration

Each agent personality maps to a unique ElevenLabs voice:

| Agent | Voice | Characteristics |
|-------|-------|-----------------|
| 🎩 Diplomat | Adam | Calm, measured |
| 🦈 Shark | Antoni | Smooth, confident |
| 😇 Saint | Bella | Warm, sincere |
| 😤 Grudger | Josh | Firm, direct |
| 🔬 Analyst | Arnold | Precise, methodical |
| ... | ... | *15 more unique voices* |

---

## New Components

| Component | Path | Description |
|-----------|------|-------------|
| `VoiceQA` | `src/components/VoiceQA.tsx` | Voice interaction interface |
| `AgentProfileModal` | `src/components/AgentProfileModal.tsx` | Tabbed agent profile modal |
| `useSpeechRecognition` | `src/hooks/useSpeechRecognition.ts` | Web Speech API hook |
| `useVoiceQueue` | `src/hooks/useVoiceQueue.ts` | Audio playback queue |
| `voiceQA` | `convex/agents/voiceQA.ts` | Backend voice generation |
| `voices` | `convex/agents/voices.ts` | Voice configuration mapping |

---

## Data Flow

```
User speaks question
       ↓
Speech Recognition (Web Speech API)
       ↓
Backend Action (generateQAResponse)
       ↓
Context Gathering (memories, evolution, game state)
       ↓
GPT-4o-mini generates in-character response
       ↓
ElevenLabs generates audio
       ↓
Audio returned and played via VoiceQueue
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Convex |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- 🤖 OpenAI for GPT-4o-mini powering agent intelligence
- 🔊 ElevenLabs for realistic voice synthesis
- 🎙️ Web Speech API for browser-based speech recognition
- ⚡ Convex for real-time backend infrastructure

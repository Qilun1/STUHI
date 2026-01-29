# Setup Guide - Getting Started with FR8

This guide walks you through setting up all required services and API keys to run the FR8 Trust Arena simulation.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Qilun1/STUHI.git
cd STUHI
npm install

# 2. Set up Convex backend
npx convex dev

# 3. Configure API keys (see detailed instructions below)
npx convex env set OPENAI_API_KEY "your-key-here"

# 4. Start the app
npm run dev
```

---

## Required Services

### 1. Convex (Backend) - FREE

Convex provides the database and serverless backend. The free tier is generous and sufficient for development.

**Setup Steps:**

1. Go to [convex.dev](https://convex.dev) and click "Get Started"
2. Sign up with GitHub, Google, or email
3. When you run `npx convex dev`, it will:
   - Prompt you to log in (opens browser)
   - Ask you to create a new project or link existing
   - Automatically configure your local environment

**Free Tier Includes:**
- 1GB database storage
- 25GB bandwidth/month
- Unlimited functions
- Real-time subscriptions

---

### 2. OpenAI API - REQUIRED (Pay-as-you-go)

OpenAI powers all agent intelligence, decision-making, and evolution.

**Setup Steps:**

1. Go to [platform.openai.com](https://platform.openai.com)
2. Click "Sign Up" (or "Log In" if you have an account)
3. Navigate to **API Keys** in the left sidebar
4. Click **"Create new secret key"**
5. Give it a name (e.g., "FR8 Development")
6. Copy the key immediately (you won't see it again!)

**Configure in Convex:**
```bash
npx convex env set OPENAI_API_KEY "sk-your-key-here"
```

**Pricing:**
- GPT-4o-mini: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical simulation round: ~$0.01-0.05
- New accounts get $5 free credit

**Cost-Saving Tips:**
- The simulation uses GPT-4o-mini (cheapest GPT-4 variant)
- Agent prompts are optimized to be short
- Pause simulation when not actively watching

---

## Optional Services

### 3. ElevenLabs (Voice) - OPTIONAL

ElevenLabs provides text-to-speech for agent voices. The simulation works without it (agents just won't speak).

**Setup Steps:**

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Click "Sign Up" and create an account
3. Go to your **Profile** → **API Keys**
4. Click **"Create API Key"**
5. Copy the key

**Configure in Convex:**
```bash
npx convex env set ELEVEN_LABS_API_KEY "your-key-here"
```

**Free Tier Includes:**
- 10,000 characters/month
- 3 custom voices
- Standard voice quality

**Pricing (if you exceed free tier):**
- Starter: $5/month for 30,000 characters
- Creator: $22/month for 100,000 characters

---

### 4. Tavily (Research) - OPTIONAL

Tavily provides web search for research-based negotiation scenarios (multi-party-negotiation branch only).

**Setup Steps:**

1. Go to [tavily.com](https://tavily.com)
2. Click "Get Started" and sign up
3. Go to **Dashboard** → **API Keys**
4. Copy your API key

**Configure in Convex:**
```bash
npx convex env set TAVILY_API_KEY "tvly-your-key-here"
```

**Free Tier Includes:**
- 1,000 searches/month
- Standard search quality

---

## Environment Configuration Summary

### Required Environment Variables

| Variable | Required | Service | Where to Set |
|----------|----------|---------|--------------|
| `OPENAI_API_KEY` | Yes | OpenAI | Convex env |
| `ELEVEN_LABS_API_KEY` | No | ElevenLabs | Convex env |
| `TAVILY_API_KEY` | No | Tavily | Convex env |

### Setting Convex Environment Variables

```bash
# View current env vars
npx convex env list

# Set a variable
npx convex env set VARIABLE_NAME "value"

# Remove a variable
npx convex env remove VARIABLE_NAME
```

---

## Verifying Your Setup

### Check Convex Connection

```bash
npx convex dev
# Should show: "✓ Connected to https://your-project.convex.cloud"
```

### Check API Keys

1. Start the app: `npm run dev`
2. Open http://localhost:5173
3. Click "Setup" to initialize agents
4. Click "Play" to start a round
5. If agents negotiate and make decisions, OpenAI is working
6. If you hear voices, ElevenLabs is working

### Common Issues

**"OPENAI_API_KEY not configured"**
- Run: `npx convex env set OPENAI_API_KEY "your-key"`
- Make sure you copied the full key starting with `sk-`

**"Convex deployment not found"**
- Run: `npx convex dev` and follow the prompts
- Make sure you're logged into Convex

**"Rate limit exceeded" from OpenAI**
- New accounts have lower rate limits
- Wait a minute and try again
- Consider upgrading to a paid tier

**Agents not speaking (no voice)**
- ElevenLabs key may be missing or invalid
- Run: `npx convex env set ELEVEN_LABS_API_KEY "your-key"`
- Check you haven't exceeded free tier limits

---

## Cost Estimates

### Development/Testing
- **OpenAI**: ~$1-5/month with moderate use
- **ElevenLabs**: Free tier usually sufficient
- **Convex**: Free tier sufficient

### Heavy Usage (running simulations continuously)
- **OpenAI**: ~$10-30/month
- **ElevenLabs**: ~$5-22/month
- **Convex**: Free tier likely sufficient

---

## Security Best Practices

1. **Never commit API keys** - The `.gitignore` already excludes `.env.local`
2. **Use Convex env vars** - More secure than local files
3. **Rotate keys periodically** - Especially if you suspect exposure
4. **Set usage limits** - Configure spending limits in OpenAI dashboard
5. **Monitor usage** - Check dashboards for unexpected spikes

---

## Getting Help

- **Convex**: [docs.convex.dev](https://docs.convex.dev) | [Discord](https://convex.dev/community)
- **OpenAI**: [platform.openai.com/docs](https://platform.openai.com/docs)
- **ElevenLabs**: [docs.elevenlabs.io](https://docs.elevenlabs.io)
- **This Project**: [GitHub Issues](https://github.com/Qilun1/STUHI/issues)

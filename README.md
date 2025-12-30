# Foundry

**AI-powered development orchestration that turns ideas and user feedback into agent-executable work orders.**

Foundry bridges the gap between raw ideas, user feedback, and actionable development tasks. When building with AI coding agents, the human coordination layer becomes the bottleneck—Foundry eliminates it by transforming fuzzy inputs into discrete, scoped work orders ready for AI agent execution.

---

## The Problem

Building products fast with AI coding agents creates a new bottleneck: **the human coordination layer**.

You're juggling:
- Raw ideas from brainstorming sessions
- Voice transcripts and rough notes
- Continuous user feedback from interviews
- A sprawling backlog of features with unclear priorities

No current tool connects the full loop: **user signal → prioritized scope → agent-ready specs**. Linear, Notion, and similar tools weren't designed for AI-native development workflows.

## The Solution

Foundry is a **forcing function for development**. Every feature, every idea, every piece of feedback flows through it.

- **Breaks down fuzzy inputs** into discrete, agent-executable work orders (~10-minute tasks for Claude Code)
- **Tracks request volume** from user feedback to surface what users actually want
- **Maintains a ranked priority list** that evolves as new signal comes in
- **Provides full context** so AI agents can execute without back-and-forth

---

## Use Cases

### 1. Rapid Idea-to-Feature Decomposition

**Scenario**: You have 5 raw ideas from user interviews—rambling text, voice transcripts, rough notes.

**Without Foundry**: 2-4 hours manually decomposing and writing specs
**With Foundry**: 10 minutes to have 25 prioritized, scoped features

**How it works**:
1. Paste your raw ideas (rambling text, voice transcripts, anything)
2. AI extracts structured problem statements and solutions
3. Each idea decomposes into 3-8 discrete user-facing features
4. Features appear in your backlog, ready for refinement or immediate handoff

### 2. Interactive Feature Refinement

**Scenario**: You have a vague idea but need help scoping it properly.

**How it works**:
1. Open the Idea Agent and describe your rough concept
2. AI asks 2-3 clarifying questions based on your project's tech stack
3. Select from suggested options or provide custom answers
4. AI generates a complete mini-PRD with:
   - Problem and solution statements
   - User stories (As a... I want... So that...)
   - Acceptance criteria (Given/When/Then)
5. Review and save as a ready-to-build feature

### 3. Feedback-Driven Prioritization

**Scenario**: You're collecting user feedback from interviews and need to know what to build next.

**How it works**:
1. Track request volume—how many users asked for each feature
2. Combine your gut feel (manual priority) with data (request frequency)
3. See features ranked by signal strength
4. Build what users actually want, not what you assume they want

### 4. Multi-Project Portfolio Management

**Scenario**: You're juggling multiple products or features across different projects.

**How it works**:
1. Dashboard shows all projects with feature counts by status
2. Quick stats: ideas in pipeline, features being scoped, ready for development, done
3. Navigate between projects without losing context
4. Unified prioritization across your entire portfolio

---

## User Flows

### Primary Flow: Idea → Feature → Ready

```
Create project with name, description, tech stack
                    ↓
Add idea (describe feature in natural language)
                    ↓
AI breaks down idea into discrete features
                    ↓
Features appear in dashboard (Idea status)
                    ↓
Edit features, refine scope, change status
                    ↓
    Idea → Scoped → Ready → Done
                    ↓
Features ready for Claude Code handoff
```

### Interactive Refinement Flow

```
Click "Add Idea" on project page
                    ↓
Opens side panel with AI assistant
                    ↓
Describe your initial idea
                    ↓
Agent asks clarifying questions with clickable options
                    ↓
Select options or type custom responses
                    ↓
Agent generates mini-PRD with full spec
                    ↓
Review preview, click "Save Feature"
                    ↓
Feature created with complete specification
```

### Feature Lifecycle

| Status | Description |
|--------|-------------|
| **Idea** | Raw feature extracted from idea or feedback |
| **Scoped** | Refined with clear requirements |
| **Ready** | Fully specified, ready for AI agent execution |
| **Done** | Implemented and shipped |

---

## Business Value

### Time Savings
- **4-8x faster** idea decomposition vs. manual spec writing
- **Instant** conversion from rambling inputs to structured features
- **Real-time** AI assistance eliminates back-and-forth clarification

### Quality Improvements
- **Consistent scoping**: Every feature is sized for AI agent execution
- **Complete specs**: Mini-PRDs include user stories and acceptance criteria
- **Context preservation**: Full project context travels with every feature

### Strategic Benefits
- **Data-driven prioritization**: Build what users actually request
- **No orphaned ideas**: Everything flows through the system
- **Reduced coordination overhead**: Single source of truth for all product work
- **AI-native workflow**: Designed for Claude Code and similar agents

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.0+)
- PostgreSQL database
- AI API keys (configured in `.env.local`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd foundry

# Install dependencies
bun install
```

### Environment Setup

Create a `.env.local` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/foundry"

# AI Provider (Google Gemini)
GOOGLE_GENERATIVE_AI_API_KEY="your-api-key"
```

### Database Setup

```bash
# Apply migrations
bun db:migrate

# (Optional) Open visual database browser
bun db:studio
```

### Development

```bash
# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to access Foundry.

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server (localhost:3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun db:generate --name=<name>` | Generate migration from schema changes |
| `bun db:migrate` | Apply pending migrations |
| `bun db:studio` | Open Drizzle Studio (visual DB browser) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Framework** | Next.js 16 (App Router) |
| **Frontend** | React 19, Tailwind CSS v4 |
| **Components** | ShadCN UI (customized) |
| **Database** | PostgreSQL with Drizzle ORM |
| **AI** | Vercel AI SDK v6, Google Gemini |
| **Icons** | Phosphor Icons |
| **Language** | TypeScript |

---

## Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── projects/        # Project CRUD
│   │   ├── features/        # Feature updates
│   │   └── projects/[id]/
│   │       ├── ideas/       # Idea breakdown
│   │       └── idea-agent/  # Interactive AI agent
│   ├── projects/[id]/       # Project detail page
│   └── page.tsx             # Dashboard
├── components/
│   ├── dashboard/           # Dashboard components
│   ├── project/             # Feature management UI
│   └── ui/                  # ShadCN components
├── db/
│   ├── schema.ts            # Database schema
│   ├── repositories/        # Data access layer
│   └── migrate.ts           # Migration runner
└── lib/
    └── ai/                  # AI integration
        ├── idea-breakdown.ts
        └── agents/
            └── idea-agent.ts
```

---

## Roadmap

### Current (v0.1)
- [x] Multi-project dashboard
- [x] Idea → feature breakdown (AI)
- [x] Interactive idea refinement agent
- [x] Feature status workflow
- [x] PostgreSQL persistence

### Next (v0.2)
- [ ] Feedback ingestion & insight extraction
- [ ] Request volume tracking integration
- [ ] RICE-inspired prioritization engine
- [ ] Export formats for Claude Code handoff

### Future
- [ ] Codebase analysis & pattern detection
- [ ] Claude Code SDK integration
- [ ] PRD generation from current state
- [ ] Voice input support
- [ ] Drift detection (PRD vs. implementation)
- [ ] Team collaboration features

---

## License

Private project.

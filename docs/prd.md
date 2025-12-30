# Foundry

**One-liner**: AI-powered development orchestration that turns ideas and user feedback into agent-executable work orders.

## Problem

Building products fast with AI coding agents creates a new bottleneck: the human coordination layer. You're juggling raw ideas, continuous user feedback, and a backlog of features—but there's no system that connects user signal → prioritized scope → agent-ready specs. Current tools (Linear, Notion, devplan.ai) don't close the loop between what users are asking for and what you're building next.

## Solution

Foundry is a forcing function for development. Every feature, every idea, every piece of feedback flows through it. It breaks down fuzzy inputs into discrete, agent-executable work orders (10-min tasks for Claude Code), tracks request volume from user feedback, and maintains a ranked priority list that evolves as new signal comes in.

## Core Mechanics

### 1. Idea → Features Breakdown

- **Input**: Free-form text dump (rambling thoughts, rough ideas, voice transcripts)
- **Process**: AI extracts structured problem/solution, then decomposes into features
- **Output**: Discrete features scoped for AI agent execution (~10 min each, 1-2 human days equivalent)
- **Relationships**: Features can have dependencies, parent/child hierarchy

### 2. Feedback → Work Orders

- **Input**: User interview transcripts (raw text)
- **Process**:
  - AI extracts insights, pain points, feature requests as structured objects
  - Presents queue for human triage (approve/reject/modify)
  - Auto-maps to existing features or creates new ones
- **Signal tracking**: Request volume per feature ("3 users asked for X")
- **Output**: Tagged features, new work orders, priority adjustments

### 3. Prioritization Engine

- **Inputs**: Your gut, AI recommendations, request volume, feature dependencies
- **Framework**: RICE-inspired but flexible (can evolve)
- **Output**: Ranked list across all projects
- **Mode**: Continuous—priority shifts as feedback flows in

## Differentiators

| Foundry                                      | Existing Tools                   |
| -------------------------------------------- | -------------------------------- |
| Features scoped for AI agents (10-min tasks) | Scoped for human sprints         |
| Continuous feedback → priority loop          | Feedback lives in separate tools |
| Request volume tracking baked in             | Manual tagging/counting          |
| Multi-project dashboard                      | Per-project silos                |
| Designed as forcing function                 | Optional layer on top            |

## MVP Scope (v0.1)

**In**:

- Multi-project dashboard
- Free-form idea input → feature breakdown
- Transcript ingestion → insight extraction → triage queue
- Request volume tracking
- Gut + AI prioritization → ranked list
- SQLite local storage

**Out (v0.2+)**:

- Codebase analysis & pattern detection
- Claude Code SDK integration (launch sessions, provide context)
- PRD generation from current state
- Voice input
- Drift detection (PRD vs. implementation)

## Architecture (MVP)

```
┌─────────────────────────────────────────────────────┐
│                   Next.js Web App                   │
│              (React, Tailwind, ShadCN)              │
├─────────────────────────────────────────────────────┤
│  Dashboard  │  Project View  │  Feedback Queue     │
│  (all proj) │  (features)    │  (triage)           │
├─────────────────────────────────────────────────────┤
│                   API Routes                        │
│  - /api/projects     - /api/features               │
│  - /api/feedback     - /api/prioritize             │
├─────────────────────────────────────────────────────┤
│              AI Processing Layer                    │
│  - Idea decomposition    - Transcript extraction   │
│  - Priority suggestions  - Feature matching        │
├─────────────────────────────────────────────────────┤
│                SQLite (local)                       │
│  projects | features | feedback | priorities       │
└─────────────────────────────────────────────────────┘
```

## Data Model (Draft)

```typescript
Project {
  id, name, description, stack, createdAt
}

Feature {
  id, projectId, title, description,
  status: 'idea' | 'scoped' | 'ready' | 'done',
  priority: number,
  requestCount: number,
  parentId?: string,
  dependencies: string[],
  agentSpec?: string  // future: Claude Code handoff
}

Feedback {
  id, projectId, source: 'interview' | 'idea',
  rawText: string,
  extractedInsights: Insight[],
  status: 'pending' | 'triaged',
  createdAt
}

Insight {
  id, feedbackId, type: 'pain_point' | 'feature_request' | 'praise',
  summary: string,
  linkedFeatureId?: string,
  approved: boolean
}
```

## Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 14+ (App Router)
- **UI**: React, Tailwind, ShadCN
- **DB**: SQLite via better-sqlite3 or Drizzle
- **AI**: Claude API (Sonnet for speed, Opus for complex breakdowns)
- **Future**: Claude Code SDK for agent orchestration

## Open Questions

1. **Prioritization framework**: Start with simple weighted scoring or build RICE properly from day one?
2. **Feature granularity**: How to ensure consistent scoping (10-min agent tasks)? AI guardrails? Human review?
3. **Multi-user**: Solo tool for now, but eventual team use? Affects data model.
4. **Export format**: What does "ready for Claude Code" look like before SDK integration? Markdown spec? Structured JSON?

## Success Metrics

- Time from idea → first working feature (target: <1 hour for simple features)
- % of feedback items that result in shipped features
- Backlog clarity (no orphaned ideas, everything prioritized)
- Dogfooding: Use Foundry to build Foundry + all 52 projects

---

_This is a living document. Generate updated version with: "Generate PRD based on current state."_

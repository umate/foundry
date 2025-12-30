# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev          # Start development server (localhost:3000)
bun run build    # Production build
bun run lint     # Run ESLint

# Database
bun db:generate --name=<migration_name>  # Generate migration from schema
bun db:migrate                           # Apply migrations to database
bun db:studio                            # Open Drizzle Studio (visual DB browser)
```

## Architecture

This is a Next.js 16 App Router project using React 19 with a custom ShadCN UI design system.

### Stack
- **Framework**: Next.js 16 with App Router (`src/app/`)
- **UI Components**: ShadCN UI with heavy customizations (`src/components/ui/`)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Icons**: Phosphor Icons (`@phosphor-icons/react`), NOT Lucide
- **Database**: PostgreSQL with Drizzle ORM
- **Runtime**: Bun

### Path Aliases
- `@/*` maps to `./src/*`

### Database Structure
- **Schema**: `src/db/schema.ts` (all table definitions)
- **Client**: `src/db/index.ts` (singleton database connection)
- **Repositories**: `src/db/repositories/` (data access layer)
- **Migrations**: `drizzle/migrations/` (SQL migration files)

## Design System

The UI follows a retro/industrial aesthetic that differs significantly from default ShadCN. See [docs/design-system.md](docs/design-system.md) for full details.

### Key Styling Rules
- **Fonts**: Space Mono (monospace) throughout; use `font-mono uppercase tracking-wider` for buttons/badges/tabs
- **Colors**: Sage/olive palette with black primary and orange (`#E85102`) secondary accent
- **Shapes**: Rectangular aesthetic - use `rounded-sm` or `rounded-md`, avoid `rounded-full`
- **Borders**: `border-2` on buttons, thin borders on inputs

### Component Conventions
- Buttons: uppercase, monospace, `border-2` matching bg color, hover uses opacity (`/80`)
- Badges: `rounded-sm` (not pill-shaped), uppercase monospace
- Toggle controls (checkbox, switch, radio): rectangular `rounded-sm` instead of rounded

### Icons
```tsx
import { User, Gear, Plus } from "@phosphor-icons/react";
<Button><Plus weight="bold" /> Create</Button>  // Use weight="bold" in buttons
```

## Adding ShadCN Components

```bash
npx shadcn@latest add <component>
```

After adding, customize to match the design system (rectangular shapes, monospace font, appropriate colors).

## Database (Drizzle ORM)

Run `/db` skill for full patterns. **CRITICAL: Always use repositories, never access db directly.**

- **Schema**: `src/db/schema.ts`
- **Repositories**: `src/db/repositories/*.repository.ts`
- **Migrations**: `bun db:generate --name=<action>_<table>` then `bun db:migrate`

## AI SDK v6

For AI features, use AI SDK v6 patterns. Run `/ai-sdk-v6` skill for full docs.

### Key v6 Changes
- `inputSchema` (not `parameters`) for tools
- `stopWhen: stepCountIs(10)` (not `maxSteps`)
- `toUIMessageStreamResponse()` (not `toAIStreamResponse()`)
- `convertToModelMessages(messages)` for UIMessage → ModelMessage

### Quick Examples

```typescript
// Tool definition
const myTool = tool({
  description: 'Tool description',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => ({ result: '...' }),
});

// Agent
const agent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-4.5',
  stopWhen: stepCountIs(10),
  tools: { myTool },
});

// API route
return createAgentUIStreamResponse({ agent, messages });
```

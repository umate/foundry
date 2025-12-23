# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start development server (localhost:3000)
bun run build    # Production build
bun run lint     # Run ESLint
```

## Architecture

This is a Next.js 16 App Router project using React 19 with a custom ShadCN UI design system.

### Stack
- **Framework**: Next.js 16 with App Router (`src/app/`)
- **UI Components**: ShadCN UI with heavy customizations (`src/components/ui/`)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Icons**: Phosphor Icons (`@phosphor-icons/react`), NOT Lucide

### Path Aliases
- `@/*` maps to `./src/*`

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

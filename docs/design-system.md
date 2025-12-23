# Design System

This project uses ShadCN UI with significant customizations for a retro, industrial aesthetic.

## Color Palette

| Token         | Light                | Dark                | Purpose                      |
| ------------- | -------------------- | ------------------- | ---------------------------- |
| `primary`     | Black `#000000`      | White `#FFFFFF`     | Primary buttons, badges      |
| `secondary`   | Orange `#E85102`     | Orange `#E85102`    | Accent actions, CTAs         |
| `background`  | Sage `#E0E3D6`       | Dark `#1A1B18`      | Page background              |
| `card`        | Light sage `#E8EBE0` | Dark sage `#222320` | Card surfaces                |
| `muted`       | `#CCCCC0`            | `#2A2B26`           | Disabled, subtle backgrounds |
| `destructive` | Dark red `#8B0000`   | Coral `#FF6B6B`     | Destructive actions          |

## Typography

- **Font**: Space Mono (monospace throughout)
- **Buttons/Badges/Tabs**: `uppercase tracking-wide` or `tracking-wider`

## Key Differences from Default ShadCN

### Buttons

| Property         | ShadCN Default | Our System                           |
| ---------------- | -------------- | ------------------------------------ |
| Font             | Sans-serif     | `font-mono uppercase tracking-wider` |
| Border           | None           | `border-2` (matches bg color)        |
| Primary color    | Blue/violet    | Black (light) / White (dark)         |
| Secondary color  | Gray           | Orange `#E85102`                     |
| Secondary border | Contrasting    | Same as background (seamless)        |
| Hover            | Darker shade   | Opacity reduction (`/80`)            |

### Badges

| Property | ShadCN Default        | Our System                          |
| -------- | --------------------- | ----------------------------------- |
| Shape    | `rounded-full` (pill) | `rounded-sm` (rectangular)          |
| Font     | Sans-serif            | `font-mono uppercase tracking-wide` |

### Form Controls (Input, Textarea)

| Property | ShadCN Default | Our System           |
| -------- | -------------- | -------------------- |
| Font     | Sans-serif     | `font-mono`          |
| Border   | `border`       | `border` (thin, 1px) |
| Padding  | `px-3`         | `px-4`               |

### Toggle Controls (Checkbox, Switch, Radio)

| Property       | ShadCN Default  | Our System                  |
| -------------- | --------------- | --------------------------- |
| Checkbox shape | `rounded-[4px]` | `rounded-sm`                |
| Switch track   | `rounded-full`  | `rounded-sm` (rectangular)  |
| Switch thumb   | `rounded-full`  | `rounded-full` (kept round) |
| Radio shape    | `rounded-full`  | `rounded-sm` (rectangular)  |

### Tabs

| Property | ShadCN Default | Our System                          |
| -------- | -------------- | ----------------------------------- |
| Font     | Sans-serif     | `font-mono uppercase tracking-wide` |

## Icons

Using **Phosphor Icons** (`@phosphor-icons/react`) instead of Lucide.

```tsx
import { User, Gear, Plus } from "@phosphor-icons/react";

// In buttons
<Button><Plus weight="bold" /> Create</Button>

// In dropdown menus
<DropdownMenuItem><User /> Profile</DropdownMenuItem>
```

Prefer `weight="bold"` for icons inside buttons.

## Design Principles

1. **Industrial/Retro**: Monospace font, rectangular shapes, muted earth tones
2. **High contrast**: Black primary on sage background
3. **Orange accent**: Use sparingly for CTAs and important actions
4. **Rectangular aesthetic**: Minimal rounding (`rounded-sm` or `rounded-md`)
5. **Consistent borders**: Thin borders on inputs, thicker on buttons

# Design

## Theme

Monochrome. Light mode default, dark mode supported. White background, near-black foreground, structure carried by 1px borders and spacing rhythm — no decorative shadows, no gradients. Infrastructure-grade fintech aesthetic: Stripe-precise, Linear-fast, zero crypto noise.

## Color

### Strategy

Restrained: zero-chroma neutrals for all surfaces, one functional accent (near-black) for primary actions. Status colors are functional-only. No decorative color.

### Tokens (OKLCH)

| Token | Light | Dark | Hex equiv (light) |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | #ffffff |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | #0a0a0a |
| `--card` | `oklch(0.988 0 0)` | `oklch(0.205 0 0)` | #fcfcfc |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | #0a0a0a |
| `--muted` | `oklch(0.961 0 0)` | `oklch(0.269 0 0)` | #f5f5f5 |
| `--muted-foreground` | `oklch(0.451 0 0)` | `oklch(0.708 0 0)` | #525252 |
| `--border` | `oklch(0.902 0 0)` | `oklch(1 0 0 / 10%)` | #e5e5e5 |
| `--border-strong` | `oklch(0.835 0 0)` | `oklch(1 0 0 / 18%)` | #d4d4d4 |
| `--primary` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | #0a0a0a |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | #ffffff |
| `--ring` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | #0a0a0a |
| `--destructive` | `oklch(0.404 0.155 25)` | `oklch(0.637 0.191 22)` | #b91c1c |
| `--success` | `oklch(0.364 0.117 145)` | `oklch(0.56 0.15 145)` | #15803d |
| `--warning` | `oklch(0.502 0.12 72)` | `oklch(0.72 0.16 72)` | #a16207 |

### Neutral scale

`--neutral-50` #fafafa → `--neutral-100` #f5f5f5 → `--neutral-200` #e5e5e5 → `--neutral-300` #d4d4d4 → `--neutral-400` #a3a3a3 → `--neutral-500` #737373 → `--neutral-600` #525252 → `--neutral-700` #404040 → `--neutral-800` #262626 → `--neutral-900` #0a0a0a

### Rules

- No color-only status indicators. Every status badge pairs dot + text label.
- Status colors (success/warning/destructive) used only for functional meaning — never decoration.
- Gray text on tinted backgrounds: darken toward the background's own hue, never apply generic muted gray.

## Typography

### Fonts

- **UI / body**: Inter (system-fallback: `ui-sans-serif, system-ui, sans-serif`)
- **Code / addresses / amounts**: JetBrains Mono (system-fallback: `ui-monospace, monospace`)

### Scale

| Role | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| Display | 64px / 4rem | 600 | 1.1 | Hero numbers, large payment amounts |
| H1 | 40px / 2.5rem | 600 | 1.2 | Page titles |
| H2 | 32px / 2rem | 600 | 1.25 | Section headings |
| H3 | 24px / 1.5rem | 600 | 1.3 | Card headers |
| H4 | 20px / 1.25rem | 600 | 1.4 | Sub-section labels |
| Body | 16px / 1rem | 400 | 1.6 | Paragraph text |
| Small | 14px / 0.875rem | 400 | 1.5 | Secondary info, captions |
| Mono | 14–16px | 400–500 | 1.4 | Wallet addresses, tx hashes, amounts |

### Rules

- Sentence case for all UI text. No ALL CAPS labels.
- Actions: verb + noun format ("Confirm payment", "View receipt")
- Emphasis via weight (600→400 contrast), never color alone
- `text-wrap: balance` on h1–h3; `text-wrap: pretty` on body prose
- Body line-length capped at 65–75ch
- Letter-spacing: headings −0.02em, body 0, mono 0

## Spacing

4px base unit.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Icon gap, inline padding |
| `--space-2` | 8px | Within-group spacing |
| `--space-3` | 12px | Compact card padding |
| `--space-4` | 16px | Between-group spacing, standard card padding |
| `--space-6` | 24px | Card padding (default), section internal |
| `--space-8` | 32px | Between sections |
| `--space-12` | 48px | Large section gaps |
| `--space-16` | 64px | Page-level vertical rhythm |

**Rhythm rule**: 8px within groups → 16px between groups → 32–48px between sections.

## Layout

- Mobile-first. Max-width `xl` (480px) centered — single-column app shell.
- Desktop: same max-width, centered with side margins.
- 12-column grid where needed; 24px gutters.
- Container max-width: 1120–1200px for any full-width layouts.
- Table rows: 56px tall.

## Components

### Button

```
Primary: bg #0a0a0a, text #ffffff, height 40px, radius 6px, padding 0 16px
Secondary: bg transparent, border 1px #e5e5e5, text #0a0a0a
Ghost: no border/bg, text #0a0a0a, hover bg #f5f5f5
Destructive: bg #b91c1c, text #ffffff
Disabled: opacity 0.4, cursor not-allowed
```

No gradient fills. No shadow on buttons. Weight distinguishes primary from ghost.

### Input

```
Height: 40px
Background: #ffffff (light) / #0a0a0a (dark)
Border: 1px solid #e5e5e5
Border-radius: 6px
Focus: border-color #0a0a0a + ring: 0 0 0 2px #fff, 0 0 0 4px #0a0a0a
```

### Card

```
Background: #fcfcfc (light) / #1a1a1a (dark)
Border: 1px solid #e5e5e5
Border-radius: 12–16px
Padding: 24px (default) / 16px (compact) / 32px (hero)
```

No box-shadow. Border carries the structure.

### Focus ring

```
box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #0a0a0a
```

Applied to all interactive elements. Never outline: none without replacement.

### Status badge

```
Layout: flex, align-center, gap 6px
Indicator: 6px circular dot, solid fill (success/warning/destructive)
Text: 14px, muted-foreground
```

Always paired dot + label. Never dot-only.

### Amount display

```
Font: JetBrains Mono
Size: 24–40px depending on context
Weight: 500
Color: foreground (primary amount) / muted-foreground (secondary/equivalent)
```

## Motion

| Context | Duration | Easing |
|---|---|---|
| Hover state | 120ms | `cubic-bezier(0.2, 0, 0, 1)` |
| State change (active, focus) | 180ms | `cubic-bezier(0.2, 0, 0, 1)` |
| Layered / page transition | 260ms | `cubic-bezier(0.2, 0, 0, 1)` |

No bounce, no elastic, no spring. Ease-out only.

No box-shadow transitions on hover — shadow is structural, not interactive feedback.

```css
/* Reduced motion — required on all animations */
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

Reveal animations must enhance an already-visible default. Never gate content visibility on a class-triggered transition.

## Elevation

Single elevation level: floating menus and dropdowns only.

```
box-shadow: 0 4px 12px rgba(10, 10, 10, 0.06)
```

No shadow on cards, buttons, or inputs. All other depth comes from 1px borders.

## Iconography

Lucide React (already installed). Size 16px inline, 20px in buttons, 24px standalone. Stroke-width 1.5. Color inherits from text token.

## Voice

- Declarative and technical. Sentence case.
- Actions: verb + noun ("Confirm payment", "Copy address", "View receipt")
- Status: factual ("Payment confirmed", "Transfer pending", "Insufficient balance")
- No emoji in UI. No marketing language. No exclamation points.
- Error messages: state what happened + what to do ("Payment failed. Check your USDC balance and try again.")

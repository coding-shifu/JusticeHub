# JusticeHub — Brand & Design System

This file is the single source of truth for all UI decisions.
Reference it in every build step. Do not deviate from these tokens without explicit instruction.

---

## Color tokens

```css
/* Primary */
--color-primary:        #1A47CC;  /* Royal Blue — buttons, active nav, links */
--color-primary-hover:  #1540B8;  /* Darker on hover */
--color-primary-light:  #EFF6FF;  /* Tint bg for active nav, badges */
--color-primary-dark:   #0F2C6E;  /* Sidebar bg, logo dark lockup */

/* Semantic */
--color-success:        #1DB584;
--color-success-light:  #D1FAE5;
--color-warning:        #F59E0B;
--color-warning-light:  #FEF3C7;
--color-danger:         #EF4444;
--color-danger-light:   #FEE2E2;
--color-court:          #8B5CF6;  /* Court/pro accent */
--color-court-light:    #EDE9FE;

/* Neutrals */
--color-page-bg:        #F8FAFC;
--color-surface:        #F1F5F9;
--color-white:          #FFFFFF;
--color-border:         #E2E8F0;
--color-border-strong:  #CBD5E1;
--color-text-primary:   #0F172A;
--color-text-secondary: #475569;
--color-text-muted:     #94A3B8;
```

### Tailwind config extension

```js
colors: {
  primary: {
    50:  '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    DEFAULT: '#1A47CC',
    700: '#1540B8',
    dark: '#0F2C6E',
  },
  success:  { DEFAULT: '#1DB584', light: '#D1FAE5' },
  warning:  { DEFAULT: '#F59E0B', light: '#FEF3C7' },
  danger:   { DEFAULT: '#EF4444', light: '#FEE2E2' },
  court:    { DEFAULT: '#8B5CF6', light: '#EDE9FE' },
  slate: { ... } // keep Tailwind's default slate scale for neutrals
}
```

---

## Typography

Font family: **Inter** (Google Fonts). Fallback: `system-ui, -apple-system, sans-serif`.

| Token       | Size  | Weight | Usage                          |
|-------------|-------|--------|--------------------------------|
| display     | 36px  | 700    | Hero/marketing headings        |
| h1          | 24px  | 700    | Page titles                    |
| h2          | 18px  | 600    | Section headings, case names   |
| h3          | 15px  | 600    | Card titles, sub-sections      |
| body        | 14px  | 400    | All body copy                  |
| caption     | 12px  | 400    | Timestamps, metadata, hints    |
| label       | 11px  | 600    | Uppercase form labels, nav     |

Rules:
- Letter-spacing: -0.4px on h1+, 0 on body, +0.8px on uppercase labels
- Line-height: 1 on headings, 1.6 on body
- Never use font-weight 300 or 800 in the app UI

---

## Spacing system (strict 8-point grid)

```
--space-1:   4px   /* micro — icon-to-label gap only */
--space-2:   8px   /* tight — inline element gaps */
--space-3:   16px  /* base — padding inside components */
--space-4:   24px  /* medium — section padding, card padding */
--space-5:   32px  /* large — between sections */
--space-6:   40px  /* xl — page top padding */
--space-7:   48px  /* 2xl — hero spacing */
--space-8:   64px  /* 3xl — major layout gaps */
```

Tailwind config:
```js
spacing: {
  '1': '4px',
  '2': '8px',
  '3': '16px',
  '4': '24px',
  '5': '32px',
  '6': '40px',
  '7': '48px',
  '8': '64px',
}
```

Use **only** these values. Do not use Tailwind's default spacing scale (p-3, p-5 etc.) — use the custom tokens above.

---

## Border radius

```
--radius-sm:   6px   /* inputs, small badges */
--radius-md:   8px   /* buttons, dropdowns */
--radius-lg:  12px   /* cards, modals */
--radius-xl:  16px   /* large panels */
--radius-full: 9999px /* pill badges, avatars */
```

---

## Shadows

No decorative shadows. Use borders for elevation, not drop shadows.
Exception: modal overlay uses `box-shadow: 0 8px 32px rgba(15,44,110,0.12)`.

---

## Component specs

### Buttons

```
Primary:   bg-primary text-white border-none h-9 px-4 rounded-md font-medium text-sm
Secondary: bg-white text-primary border-1.5 border-primary h-9 px-4 rounded-md font-medium text-sm
Ghost:     bg-white text-secondary border-0.5 border-border h-9 px-4 rounded-md text-sm
Disabled:  bg-surface text-muted border-0.5 border-border h-9 px-4 rounded-md text-sm cursor-not-allowed
```

One primary button per page view maximum.

### Cards

```
background: white
border: 0.5px solid var(--color-border)
border-radius: 12px
padding: 18px
hover: border-color → #93C5FD (primary-200)
```

### Sidebar

```
width: 220px
background: white
border-right: 0.5px solid var(--color-border)
padding: 20px 12px

Nav item:         h-9 px-2.5 rounded-lg text-sm text-secondary icon-17px gap-2.5
Nav item active:  bg-primary-50 text-primary font-medium
Nav item hover:   bg-surface text-text-primary
```

### Status badges

| Status        | Background         | Text       |
|---------------|--------------------|------------|
| Active        | `#DBEAFE`          | `#1E40AF`  |
| Intake        | `#FEF3C7`          | `#92400E`  |
| Awaiting court| `#EDE9FE`          | `#5B21B6`  |
| Closed        | `#F1F5F9`          | `#475569`  |
| Urgent        | `#FEE2E2`          | `#991B1B`  |

Badge specs: `font-size: 11px, font-weight: 500, padding: 4px 10px, border-radius: 20px`

### Inputs

```
Default: border-0.5 border-border rounded-md h-9 px-3.5 text-sm text-primary bg-white
Focus:   border-1.5 border-primary ring-3 ring-primary/12
Error:   border-1.5 border-danger ring-3 ring-danger/12
Label:   text-xs font-medium text-secondary mb-1.5
Hint:    text-xs text-muted mt-1
```

### Avatars

```
Large:  48px — bg-primary text-white font-bold text-base
Medium: 36px — bg-primary-100 text-primary-dark font-bold text-xs
Small:  28px — bg-primary-50 text-primary font-bold text-xs
```

---

## Layout grid

```
Sidebar:      220px fixed left
Main content: flex: 1, padding: 24px
Card grids:   3-column for case cards, 4-column for stat cards
Gap:          12px between cards
```

---

## Iconography

Library: **Tabler Icons** (outline only, never filled variant in app chrome).
- Navigation icons: 20px
- Inline/button icons: 16px
- Empty state icons: 40px, color: var(--color-primary-light)

Do not use any other icon library. Do not use emoji in the UI.

---

## Logo

The logo uses an SVG mark — an angular A-shape (two rising lines + crossbar) with a blue accent dot at the apex.

```
Wordmark color on light bg: #0F172A
Wordmark color on dark bg:  #FFFFFF
Brand mark fill:            #1A47CC (primary)
Brand mark accent dot:      #60A5FA (blue-400)
Minimum clear space:        16px on all sides
Minimum display size:       24px height
```

Never stretch, recolor, or add effects to the logo.

---

## Voice & copy

- Sentence case everywhere. No Title Case, no ALL CAPS in UI.
- Active voice, verb first on all CTAs: "New case", "Upload document", "Invite client"
- No "successfully" — the action toast IS the confirmation
- No "please" — UI is not asking a favour
- Error messages: say what happened, then what to do. One sentence, no "Error:" prefix.
- Empty states: name the space + invite action. Not "Nothing here yet."

---

## Motion

All transitions: `ease-out` curve only.

| Token          | Duration | Use                                     |
|----------------|----------|-----------------------------------------|
| fast           | 100ms    | Hover tints, badge color changes        |
| base           | 150ms    | Button press, input focus ring          |
| enter          | 200ms    | Dropdown open, toast slide-in           |
| modal          | 250ms    | Slide-over panel, modal open            |

No decorative animation. Motion confirms interaction only.

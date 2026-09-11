# Zuhause — Smart Home Dashboard Design System

Extracted from **Family Dashboard.dc.html**, an interactive German-language smart-home control dashboard (energy, lights, shutters, sockets, appliances, climate, calendar, tasks, shopping, media, cameras, waste pickup). No external codebase, Figma file, or brand guideline was provided — this system codifies the visual language already built in that one component so it can be reused consistently across new screens.

**Source:** `Family Dashboard.dc.html` (project root) — the live, fully-interactive reference implementation and the closest thing to a "UI kit" ground truth. Read it directly for exact interaction patterns (edit mode, shutter drag, ping test, scenes) that this system's static specimens don't reproduce.

## Index
- `styles.css` — root stylesheet, imports everything below
- `tokens/` — colors, typography, spacing, radii/shadows/motion
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Foundations)
- `components/buttons/` — `Button`, `Chip`
- `components/controls/` — `Controls` grouping: `ToggleSwitch`, `ProgressBar`, `StatusDot`
- `components/surfaces/` — `Surfaces` grouping: `Card`, `Tile`
- `ui_kits/zuhause-app/` — static recreation of the dashboard home screen composed from the tokens above
- `Family Dashboard.dc.html` — the original interactive prototype (desktop / mobile / iPad / Android tablet frames via the `device` tweak)

## Components
- **Button** — pill button (primary / ghost / tab / danger)
- **Chip** — pill toggle chip (scenes, shopping list, room filters)
- **Controls** — `ToggleSwitch`, `ProgressBar`, `StatusDot`
- **Surfaces** — `Card`, `Tile`

## Content fundamentals
- **Language:** German throughout (labels, dates, days, months, statuses). Keep new copy in German, same register.
- **Tone:** plain, functional, warm-neutral — no jokes, no marketing voice. Labels are nouns ("Energie", "Räume & Licht", "Müllabholung"), not sentences.
- **Casing:** section eyebrows are Title Case German nouns in uppercase display (`text-transform:uppercase`), not ALL-CAPS in source.
- **Numbers:** German decimal comma (`2,4 kW`, not `2.4`). Currency is `€` suffixed, not prefixed.
- **Emoji:** none. Status/edit affordances use plain glyphs (✎, ✓, ✕, ▲▼■) and simple unicode arrows — never decorative emoji.
- **Icons:** no icon font or SVG icon set — the whole system avoids icons in favor of color, typography and simple unicode glyphs (see Iconography below).

## Visual foundations
- **Palette:** near-black surfaces (`#0a0c10` → `#191c23`) with one switchable accent (amber / emerald / azure) used sparingly — for live values, active states, progress fills, and glow. Text runs light-gray to white in four steps (primary → muted), never pure gray-on-gray.
- **Type:** two families. **Space Grotesk** for anything numeric or a big display value (clocks, kW, temperatures, dialog titles). **Hanken Grotesk** for everything else — labels, body, buttons. Section headers are a small uppercase eyebrow (13px, 600 weight, `.1em`–`.14em` tracking, muted color) — this is the system's signature heading treatment, used instead of a large section title.
- **Cards:** one shape for every panel — `22px` radius, `1px` `rgba(255,255,255,.07)` border, dual shadow (`inset 0 1px 0 rgba(255,255,255,.04)` + `0 10px 34px rgba(0,0,0,.4)`), `24px` padding. Tiles inside cards are `15–16px` radius, flat (no inset highlight).
- **Buttons/chips:** pill-shaped almost everywhere (`99px` radius) for actions, tabs and chips; `10–12px` radius only for compact utility controls (edit toggle, dialog inputs). Every control has a `44px` minimum tap target.
- **Backgrounds:** a single soft radial gradient behind the whole app (`#14181f` → `#0a0c10`), never full-bleed imagery, no textures or grain.
- **Motion:** near-absent. Only two intentional animations — a slow opacity pulse (`fdpulse`, 2s) on "live/attention" dots, and a one-shot slide-in (`truckIn`) for the pickup-day illustration. Everything else (hover, active, toggles) is a flat `0.2s ease` on background/border/color — no scale, no bounce.
- **Hover/press:** no dedicated hover states in source; interactive elements rely on the `0.2s ease` transition plus state-driven color/background changes (on vs. off, selected vs. not) rather than a separate `:hover` treatment.
- **Depth/blur:** no glassmorphism or backdrop-blur; depth comes only from the card shadow and inset highlight.
- **Corners:** three tiers — control (10–12px), tile/card (15–22px), pill (99px). Never sharp corners, never a single "brand" super-round radius on everything.
- **Live device frames:** the dashboard reflows into four responsive presets — Desktop app (macOS window chrome), Mobile (iPhone-style status bar + Dynamic Island), iPad (portrait tablet, camera dot), Android tablet (landscape, camera dot) — see the `device` tweak on `Family Dashboard.dc.html`.

## Iconography
No icon system. The design deliberately uses: plain unicode glyphs for the handful of actions that need one (✎ edit, ✓ done, ✕ close, ▲▼■ shutter controls, ⏮ ⏭ ❚❚ ► media transport, 🔈 volume). Everything else is communicated with color, a status dot, or a text badge (e.g. "Läuft", "Fertig", "Heute"). If a future screen needs a broader icon set, pick a single-weight line-icon set (e.g. Lucide) at 16–20px in `--text-tertiary` — don't introduce filled icons or multi-color icon styles.

## Logo / brand mark
No logo was provided. Wherever a mark would go, the system uses the plain word "Zuhause" in the eyebrow type style — do not invent a logo.

## Intentional additions
`ToggleSwitch`, `ProgressBar`, and `StatusDot` were split out as named primitives (they repeat 6+ times each across the dashboard: sockets, appliances, battery, media scrub, rooms, presence, cameras) even though the source has no separate "component" concept — it's one large hand-built screen. `Button`/`Chip`/`Card`/`Tile` were named similarly by grouping the source's repeated inline patterns.

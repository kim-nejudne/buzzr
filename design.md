# Design: Buzzr

The locked system. Every Hallmark run reads this first, and every screen shares it. Change it on purpose: this file is the rule. It replaces the 2026-11-16 Overprint look (M32) with Hum (M34, `docs/ux/11-hum-redesign.md`). The approved mocks are `.hallmark/mocks/hum/index.html` (Landing, Screen lobby, phone buzzer), `.hallmark/mocks/hum/buzzers.html` (the coral Lit dome in every state) and `.hallmark/mocks/hum/garden.html` (the scoreboard garden).

## System

- Genre: playful
- Shape: app screens. Landing is the one page, and the Screen is a stage (see Variants)
- Theme: Hum (by request, Kim 2026-11-24), cream paper everywhere, the Screen included
- Axes: light/rounded-sans/chromatic-yellow · posture: full-palette. Grained cream paper, torn sheets lit from the top left, card-stock controls that press down, blue-black ink, Chillax throughout. Three accents that never blend: pear for the action, blue for links and focus, coral for the one loud moment (the buzzer). Mint is growth
- Kim's exceptions: the phone buzzer stays the M32 Lit dome (round, a bulb under the cap, only the cap moves), recast in coral with the paper grain. It is the only shaded gradient. The scoreboard and final results are a garden of Chillax glyphs (Controls, The garden)

## Tokens

`client/src/tokens.css` is the source of truth. F163 maps these roles onto the Tailwind `@theme` names the code already uses (`bg` to paper, `surface` to paper-2, `bg-deep` to paper-3, `edge` to rule, `accent` to pear, `card` to card). Hum's own card-stock edge colour is `--color-stock-edge`, because `edge` is taken.

```css
:root {
  --color-paper: oklch(97% 0.012 95);
  --color-paper-2: oklch(94.5% 0.018 95);
  --color-paper-3: oklch(91% 0.022 95);
  --color-ink: oklch(20% 0.014 255);
  --color-ink-2: oklch(29% 0.014 255);
  --color-muted: oklch(47% 0.014 255);
  --color-rule: oklch(87% 0.016 95);
  --color-accent: oklch(87% 0.175 96); /* pear: the primary, the leader's tag */
  --color-accent-deep: oklch(72% 0.16 92); /* the pear primary's edge; warn */
  --color-accent-hi: oklch(95% 0.1 96); /* the pear primary's top highlight */
  --color-accent-ink: oklch(20% 0.014 255);
  --color-accent-2: oklch(50% 0.17 250); /* blue: links */
  --color-accent-3: oklch(70% 0.2 22); /* coral: the buzzer and buzz */
  --color-mint: oklch(82% 0.15 152); /* growth: grass, win */
  --color-mint-deep: oklch(48% 0.12 155); /* stems */
  --color-focus: oklch(50% 0.17 250);
  --color-card: oklch(98.8% 0.007 95);
  --color-stock-edge: oklch(83% 0.04 88);
  --color-fringe: oklch(99.2% 0.006 95);
  --color-kraft: oklch(63% 0.085 62);
  --color-sand: oklch(77% 0.1 76);
  --color-sugar: oklch(89% 0.035 236);
  --color-hill-1: oklch(94.5% 0.03 118);
  --color-hill-2: oklch(91.5% 0.045 135);
  --color-leaf: oklch(64% 0.15 150);
  /* The buzzer's coral dome (Kim, 2026-11-24) */
  --color-buzz: oklch(70% 0.2 22);
  --color-buzz-hi: oklch(88% 0.09 35);
  --color-buzz-deep: oklch(56% 0.19 22);
  --color-buzz-wall: oklch(46% 0.16 22);
  --buzz-glow: oklch(97% 0.05 80 / 0.95);
  --buzz-glow-0: oklch(97% 0.05 80 / 0);
  --buzz-drop: oklch(20% 0.014 255 / 0.28);
  --font-display: 'Chillax', ui-rounded, ui-sans-serif, sans-serif;
  --font-body: var(--font-display);
  --font-outlier: var(
    --font-display
  ); /* kept so LABEL and FIELD_LABEL keep their name; Hum has no third face here */
  --display-weight: 600;
  --tracking-display: -0.03em;
  --radius-card: 24px; /* 28 to 32px on the phone frame */
  --radius-control: 16px; /* card stock */
  --radius-input: 14px;
  --radius-pill: 999px;
  --rule-hair: 1px;
  --shadow-card:
    0 1px 2px oklch(20% 0.014 255 / 0.06), 0 12px 28px -14px oklch(20% 0.014 255 / 0.22);
  --shadow-paper: drop-shadow(0 0 0.6px oklch(20% 0.014 255 / 0.32))
    drop-shadow(1.5px 2.5px 1.5px oklch(20% 0.014 255 / 0.1))
    drop-shadow(6px 14px 16px oklch(20% 0.014 255 / 0.13));
  --drop-soft: 2px 9px 10px -4px oklch(20% 0.014 255 / 0.25);
  --drop-hard: 2px 9px 10px -3px oklch(20% 0.014 255 / 0.32);
  --texture-opacity: 0.08; /* page grain */
  --texture-plate: 0.14; /* grain on a card, a control, a sheet */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-snap: cubic-bezier(0.22, 1, 0.36, 1);
}
```

`--grain` (a speck `feTurbulence`, baseFrequency 0.85) and `--fibre` (a long turbulence, baseFrequency `0.004 0.06`) are data-URI tokens; copy them from `.hallmark/mocks/hum/hum.css`. The scaffold owns the spacing scale, the easings and the durations. The app keeps Tailwind's own xs-3xl text steps (DECISIONS F132). Chillax 500 and 600 are self-hosted woff2 files in `client/public/fonts/`, served as `/fonts/Chillax-Medium.woff2` and `/fonts/Chillax-Semibold.woff2` (F163b), because a LAN game night makes no third-party request. They are gitignored: the ITF Free Font License allows self-hosting for our own app (§01) but not redistribution through a public repository (§02), and the portfolio is public. `scripts/fetch-fonts.sh` copies them unchanged from the official Fontshare kit, locally once and in the deploy workflow before `docker build`. Never commit them, subset them or convert them.

## Rules

- Chillax everywhere: heads and figures 600 at `--tracking-display`, line-height 1.02 to 1.05, sentence case; body 500 at 17px or more; labels, captions and table heads 500 a step smaller in `--color-muted`, sentence case, untracked. Figures (room codes, scores, points, the timer) take `tabular-nums`. No capitals except the room code, which is capitals by nature.
- Paper: `--grain` and `--fibre` sit under every paper, card, control and accent fill (a `::before` at `z-index: -1` in an isolated box), never over the type. Page grain at `--texture-opacity`, a plate at `--texture-plate`. Never animated.
- Torn sheets: a band, a mat or a strip ends in a `clip-path` polygon from seeded value noise, its `--color-fringe` twin standing 1.5px proud beneath, under `--shadow-paper`. The seed is fixed per element so an edge never changes between renders. Before the polygon is computed: a rounded sheet. Mats are sugar (blue), strips kraft or sand, grounds hill-1, hill-2, mint, leaf and kraft.
- Light comes from the top left: shadows fall down and right. A card may lift one corner (the page curl).
- Round everywhere: 24px cards, 16px card stock, 14px fields, pills; no square corner. Never a serif, never pure white.
- Each accent owns a job: pear the primary and the leader's tag; blue links and the focus ring; coral the buzzer and the buzz state; mint growth and the win state. Never a gradient between two accents, never a rainbow ground.
- Game states each come with their word ("Correct", "Wrong", "Too early") and are never decoration: **buzz** is coral (first to buzz, wrong), **win** is mint (correct), **warn** is pear-deep (too early, reconnecting).
- Player colours (`PLAYER_PALETTE`) are content: a round swatch in a 2px card gap and a 1.5px ink ring, and the flower on the player's plant.
- Category and avatar emoji stay as content the players pick (M31, M32). Hum's "never emoji" covers icons, not this.

## Controls

- **Card stock** (every button): 54px in app UI and on phones, `--radius-control`, the fill grained, an inset 1px highlight on top and a solid edge below: 5px at rest, 7px and 2px up on hover, 1px and 4px down on press. Secondary: `--color-card` on a `--color-stock-edge` edge with a 1px rule inset. **Primary**: pear on a `--color-accent-deep` edge, ink type, the only control on `--ease-spring`. One primary per screen. Chosen (a picked pill, language, preset): ink with paper type, `aria-pressed`. Disabled: paper-3, muted type, pressed to a 2px edge. Danger: coral outline, filled coral once confirmed.
- Links: blue, 600, a 2px underline at 35% that goes solid on hover.
- Fields: 52px, `--radius-input`, a 1px `--color-muted` border, the blue focus ring.
- Focus: a 3px `--color-focus` ring, 4px offset, on everything.
- The room code: four card-stock letter tiles. On Landing they are the join field; on the Screen they sit on a torn sand strip.
- **The buzzer** (the coral Lit dome): a round card-stock base on a 14px `--color-stock-edge` edge, a `--color-buzz-wall` wall, and a coral dome cap shaded from `--color-buzz-hi` at the top left to `--color-buzz-deep`, grained at 0.18. The base never moves; only the cap translates (`--dur-micro`, `--ease-snap`), 14px up at rest, 11px on hover, 2px on press. A bulb under the cap breathes (opacity 0.3 to 0.85, 1.1s alternate) while it takes a buzz and flares to 1 on the press. BUZZ is Chillax 600 in ink on the coral (paper on coral fails contrast). Per state, see `11` § The buzzer.
- **The garden** (Screen scoreboard and final results; a static strip on Landing): one plant per player or team. The stem is a column of Chillax `l` glyphs in `--color-mint-deep`, bracket leaves (`(` and `)`) in `--color-leaf` on every second segment, the flower the player's or team's initial in its own colour. Height is the score's share of the leader's, 1 to 9 segments; a score of 0 or less is a kraft seed. The plants stand on torn grass, leaf and kraft. Under each plant a card-stock tag holds the name with its swatch and the points; the leader's tag is pear. The plants are `aria-hidden`; the tags carry the meaning.

## Motion

- `--ease-spring` on the primary only; everything else `--ease-snap`, `transform` and `opacity` only, never `scale()` on a control. Card stock presses; a link's underline fills.
- State loops waived on the record: the buzzer's bulb and the generation shimmer.
- The garden grows: when the scoreboard shows, each stem slides up out of the soil (`translate`) from its last height to its new one, in place of M32's climb; the tags reorder as now.
- Under reduced motion everything ends at once, the bulb holds at 0.6, and the garden shows its end state.

## Variants

- **Screen (stage):** cream paper (Kim, 2026-11-24). Keeps its viewport-unit sizing and the `--screen-min-*` text floors (F100). The room code is four card-stock tiles on a torn sand strip; the QR is on a card with a page curl over a sugar mat; players are card-stock chips. Scoreboard and final results are the garden.
- **Landing (page):** page scope: Buzzr at statement size, one sentence, the join card on a sugar mat (the code tiles and the pear Join), Host a game and Question sets under it, and a static garden strip at the foot (flowers spelling B, U, Z, Z, R among asterisks and o's).
- **Answer sheet (print):** ink on white paper, no grain, no sheets, no shadows.

## Exports

`client/src/tokens.css` and `client/src/base.css` in this project, mapped into Tailwind v4 `@theme static` by F163 (`export-formats.md`, Tailwind v4).

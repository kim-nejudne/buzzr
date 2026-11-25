# Design: Buzzr

The locked system. Every Hallmark run reads this file first, and every screen shares it. Change it on purpose: this file is the rule.

It replaces Overprint (M32), the look the app wears today, with **Marquee** (M35, `docs/ux/12-marquee-redesign.md`). Hum (M34) was planned and then scrapped before it was built.

- **Source of truth:** the Figma file "Buzzr — Arcade directions" (`aTbiy97Iu6rpuTcveQ7Vpr`, https://www.figma.com/design/aTbiy97Iu6rpuTcveQ7Vpr). Kim chose direction B, Marquee board, on 2026-11-25.
- **Static exports:** `.hallmark/mocks/marquee/*.png`, the visual targets for each feature. `12` § Mocks lists them.

## System

- **Genre:** playful.
- **Shape:** app screens. Landing is the one page, and the Screen is a stage (see Variants).
- **Theme:** Marquee, a custom sibling of Hallmark's Arcade. It is not a catalog theme.
  - What it keeps from Arcade: two loud inks that take turns, hard press physics, figures in their own face, and one texture.
  - Everything else is Buzzr's own: the palette, the faces and the components.
- **Idea:** the game-show set, not the arcade cabinet.
  - Bulb borders run round the boards and the buzzer.
  - Every figure (scores, timers, the room code) is in an LED dot matrix.
  - Sodium amber leads. Electric blue answers.
  - Names are set in condensed capitals, so the longest name fits the banner whole.
- **Axes:** dark / display-condensed / chromatic-amber. Posture: two inks.
- **Exceptions (Kim):**
  - Buttons and display lines are set in condensed capitals (Antonio, untracked). This is the material: a marquee sign. Waive Hallmark's label gate on the record for buttons only. Labels, captions and table heads stay sentence case in the body face.
  - The buzzer's bulb ring is the one looping animation (Motion).

## Tokens

`client/src/tokens.css` is the source of truth. F174 maps these roles onto the names the code already uses, so components change as little as possible:

| Code name (today) | Marquee role     |
| ----------------- | ---------------- |
| `paper`           | ground           |
| `paper-2`         | well             |
| `paper-3`         | well-2           |
| `accent`          | lead (amber)     |
| `accent-2`        | answer (blue)    |
| `buzz`            | the amber buzzer |
| `win`             | answer           |
| `warn`            | stop             |

New names: `--color-lead-deep`, `--color-bulb-off`, `--color-shade`, `--color-stop`, `--color-stop-ink`.

```css
:root {
  color-scheme: dark;
  --color-paper: oklch(14% 0.018 60); /* ground: warm black */
  --color-paper-2: oklch(19% 0.022 60); /* well: boards, panels, the top bar */
  --color-paper-3: oklch(25% 0.025 60); /* well-2: tiles, idle button, fields */
  --color-shade: oklch(8% 0.01 60); /* code tiles, the deepest wells */
  --color-ink: oklch(95% 0.02 85);
  --color-ink-2: oklch(87% 0.02 85);
  --color-muted: oklch(74% 0.03 75);
  --color-rule: oklch(36% 0.03 60); /* hairlines and panel edges (decorative, 1.8:1) */
  --color-accent: oklch(82% 0.165 78); /* lead: sodium amber. Primary, the buzz, lit bulbs */
  --color-accent-ink: oklch(14% 0.018 60); /* ground on amber, 11.2:1 */
  --color-lead-deep: oklch(56% 0.12 65); /* the key edge under amber */
  --color-accent-2: oklch(
    68% 0.16 255
  ); /* answer: electric blue. Correct, cursor row, links, focus */
  --color-accent-2-ink: oklch(14% 0.018 60); /* ground on blue, 6.88:1 */
  --color-focus: oklch(68% 0.16 255);
  --color-bulb-off: oklch(31% 0.04 65);
  --color-stop: oklch(64% 0.2 28); /* wrong, too early, locked, danger. Always with its word */
  --color-stop-ink: oklch(14% 0.018 60); /* ground on red, 5.40:1 */
  --color-card: oklch(19% 0.022 60);
  --color-card-ink: oklch(95% 0.02 85);
  --color-buzz: oklch(82% 0.165 78);
  --color-buzz-deep: oklch(56% 0.12 65);
  --color-buzz-ink: oklch(14% 0.018 60);
  --color-win: oklch(68% 0.16 255);
  --color-win-ink: oklch(14% 0.018 60);
  --color-warn: oklch(64% 0.2 28);
  --font-display: 'Antonio', 'Arial Narrow', sans-serif; /* 700, uppercase */
  --font-body: 'Sofia Sans Variable', 'Sofia Sans', ui-sans-serif, sans-serif; /* 500 to 800 */
  --font-outlier: 'DotGothic16', ui-monospace, monospace; /* figures only, 40px and up */
  --display-weight: 700;
  --tracking-display: 0;
  --radius-card: 2px;
  --radius-control: 2px;
  --radius-pill: 999px;
  --rule-hair: 1px;
  --rule-bar: 2px;
  --edge-key: 6px; /* the hard drop under a pressable */
  --edge-press: 1px;
  --bulb: 10px;
  --bulb-pitch: 24px;
  --shadow-card: none;
}
```

**Contrast** (WCAG 2.x, sRGB-clipped; the Figma token sheet repeats them):

| Pair            | Ratio |
| --------------- | ----- |
| ink on ground   | 17.22 |
| ink on well     | 16.00 |
| ink on well-2   | 13.89 |
| muted on ground | 8.62  |
| muted on well-2 | 6.95  |
| amber on ground | 11.20 |
| blue on ground  | 6.88  |
| stop on ground  | 5.40  |
| ground on amber | 11.20 |
| ground on blue  | 6.88  |
| ground on stop  | 5.40  |

Never put light type on stop red: it is 3.38:1.

**Fonts.** Each face is SIL OFL 1.1, from Fontsource, as npm packages that are committed. There are no gitignored files and no fetch step.

| Role    | Face                 | Package                           |
| ------- | -------------------- | --------------------------------- |
| Display | Antonio 700          | `@fontsource/antonio`             |
| Body    | Sofia Sans, variable | `@fontsource-variable/sofia-sans` |
| Figures | DotGothic16 400      | `@fontsource/dotgothic16`         |

- **Sizes:** the app keeps Tailwind's own xs to 3xl text steps (DECISIONS F132). The Figma text styles are the reference:
  - Display: hero 280, tv 112, l 72, m 44, s 28, xs 20
  - Body: tv 68, xl 30, l 22, m 18, s 16, label 14
  - Figures: xl 110, l 64, m 48, s 40

## Rules

- **Three faces, three jobs.** Antonio capitals for the wordmark, display lines, names on the TV, board and section heads, and buttons. Sofia Sans for everything you read: questions, body, labels and fields. DotGothic16 for figures only: room codes, scores, points, timers and the question count. Never DotGothic below 40px (it smears); a smaller figure is Sofia Sans 800 with `tabular-nums`.
- **Sentence case, untracked:**
  - Labels, captions and table heads are Sofia Sans, a step smaller, in `--color-muted`.
  - No capitals in body text.
  - A player's name is content, so it keeps its own case everywhere except Antonio lines.
- **Two inks that take turns.**
  - Amber leads: the primary, the buzz, lit bulbs, the leader's row, figures.
  - Blue answers: correct, the cursor row (the one row a list wants chosen, such as the player buzzing in the rail), links and focus.
  - Never a gradient between them, never a third ink for decoration.
- **Game states come with their word** and are never decoration:
  - **buzz** is amber ("First to buzz", "Buzzers open")
  - **win** is blue ("Correct!")
  - **stop** is red ("Wrong", "Too early!", "Locked out this round", danger)
- **Depth is a key edge.** A pressable has a hard drop straight down (`--edge-key`, zero blur) in `--color-lead-deep` under amber, or `--color-rule` under a secondary.
  - Hover lifts it 2px.
  - Pressing slams it to `--edge-press`.
  - Never a blur, never a glow, never a soft shadow.
- **Bulbs are the only texture.**
  - A bulb border (10px dots at a 24px pitch, about two of every three lit) runs round the marquee sign, the room board, the title card, the buzz banner, the first podium step and the buzzer ring.
  - Never under running text.
  - Static, except on the buzzer (Motion).
- **Shapes:**
  - 2px radius on boards, wells, buttons, tiles and fields.
  - Round only for the buzzer, avatars, level pills, switches and pills.
  - 2px bars on anything pressable.
  - 1px hairlines between rows.
- **Content stays content:** `PLAYER_PALETTE` (a round swatch with a 2px ink ring), avatar and category emoji, and the A–D choice colours.

## Controls

- **Button.** 54px minimum height, `--radius-control`, Antonio 700 capitals.
  - Sizes:
    - **m:** 28px type, 32px padding. App UI and the Screen.
    - **s:** 20px type, 16px padding, still 54px tall. Phones.
  - Kinds:
    - **Primary:** amber with ground type and the lead-deep key edge. One per screen.
    - **Secondary:** well fill, 2px amber outline, amber type, rule key edge.
    - **Chosen** (a picked preset, language or mode): blue with ground type, `aria-pressed`.
    - **Disabled:** well-2 with muted type and no edge.
    - **Danger:** 2px stop outline with stop type. Once confirmed it fills stop with ground type.
- **Link:** Sofia Sans 700 in ink, with a 2px blue underline at 60% that goes solid on hover.
- **Field:** 56px, well-2, a 1px muted border, the blue focus ring. Errors take a 2px stop border and a stop message in words.
- **Focus:** a 3px `--color-focus` ring with a 4px offset, on everything. It appears instantly.
- **Room code:** four tiles, each shade fill, 2px rule edge, DotGothic16 amber letters.
  - The tile still to fill has a 3px blue edge.
  - On Landing they are the join field. On the Screen they sit on the bulb-bordered room board beside the QR.
- **QR:** ground modules on an ink card, so it scans dark-on-light.
- **The buzzer** (`Play.tsx`, `BUZZER_LOOK` by `BuzzerKind`, per `12` § The buzzer):
  - A ring of 22 bulbs round a round button. The button is amber with a lead-deep key edge, and BUZZ is Antonio in ground colour.
  - Only the button's `translate` and the bulbs' `opacity` animate.
  - The button sits 4px up at rest and slams down 6px on press. The base never moves.
- **Player chip, standings row, scoreboard row:** a swatch avatar, the full name, and points in DotGothic16.
  - The row buzzing in the rail is the blue cursor row.
  - The leader's scoreboard row is amber.
  - A row that climbed shows "▲ 2" in blue.
- **Board tile:**
  - Open: well with an amber figure.
  - Picked: amber with a key edge.
  - Used: shade fill with no number.
  - Host cursor: a double blue ring.
- **Level pill:** round. Easy, Medium or Hard, or E/M/H when narrow. A chosen level is blue.
- **Host bar** (Screen): a well strip with a 4px rule on top. Primary on the left, Skip next to it, and More / Shortcuts / Hide on the right. Key hints sit inside the label ("Open buzzers Space").

## Motion

- **Easing:** press physics on `--dur-micro` with `--ease-out`, using `transform` and `opacity` only. Never `scale()` on a control.
- **Lit row:** a lit row changes on `steps(1)`, with no fade.
- **The buzzer's bulbs** (the one loop, waived on the record):
  - While live, alternate bulbs chase at 0.5s, `steps(1)`.
  - When pressed or won, they all light.
  - Off, they show `--color-bulb-off`.
- **Scoreboard:** opens in the previous order, then slides into the new one, as now.
- **Reduced motion:** everything ends at once, and the live chase holds the alternate pattern still.

## Variants

- **Screen (stage):** keeps its viewport-unit and `cqw`/`cqh` sizing and the `--screen-min-*` floors from F100: labels 14px, body 18px, names 24px. At 1280×720, names stay at 24px or more and figures at 40px or more; everything else scales with the stage.
- **Landing (page):** BUZZR at hero size on the bulb-bordered marquee sign, then one sentence, then the join card (code tiles and the primary Join). Host a game and Question sets sit beside or under it. Everything is on the first screen at 1280×800.
- **Answer sheet (print):** ground ink on white paper. No bulbs, no edges, no dark fills.

## Exports

`client/src/tokens.css` and `client/src/base.css`, mapped into Tailwind v4 `@theme static` by F174 (`export-formats.md`, Tailwind v4).

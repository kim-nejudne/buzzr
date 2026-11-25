# 12 — Marquee redesign (M35)

The fourth full redesign, designed 2026-11-25 in Figma rather than as HTML mocks. It replaces Overprint (M32), the look the app wears today. Hum (M34, `11`) was planned and then scrapped before it was built.

**How it was chosen.**
- Kim pointed at Hallmark's Arcade theme as inspiration, not a copy.
- Three directions were drawn: Night cabinet, Marquee board and Daylight cabinet. Kim picked **B, Marquee board**.
- Every surface was then built in Figma from shared components and variables. Kim had the host settings revised on the phone.

**How to read it.** The locked system is `design.md` at the project root; read it first. This file holds the read, the picks, the buzzer's states, the mocks and what each feature changes. Every rule in `00-foundations.md` still holds except its look: the breakpoints, the variants, the floors and the device matrix.

## The mocks

- **Figma** (the source of truth): https://www.figma.com/design/aTbiy97Iu6rpuTcveQ7Vpr, one page per surface. Components and variables live on page 1.
- **Static exports** in `.hallmark/mocks/marquee/`. Read these in a session; never call Figma from an unattended run.

| File | Shows | Target for |
|---|---|---|
| `components-primitives.png` | Bulb, Button (kinds × rest/pressed × m/s), Code tile, Field, Avatar, Level pill, Tab, Link | F174 |
| `components-player.png` | The buzzer in 8 states, Choice tile, Answer card | F176 |
| `components-game.png` | Top bar, Player chip, Standings row, Buzz banner (buzzed, correct, wrong), Board tile, Scoreboard row, Set card, Category row, Admin figure | F176–F183 |
| `components-screen.png` | QR card, Screen header, Host bar in 6 phases | F177, F178 |
| `landing.png` | Landing at 1440×900, 1280×800, 375×812 | F175 |
| `player.png` | 16 phone frames: join, lobby, idle, live, pressed, won, early, lost, out, choice, choice sent, typed, correct, wrong, final, menu | F176 |
| `screen-lobby-{2,5,20}-{1080,720}.png` | Lobby with 2, 5 and 20 players at 1920×1080 and 1280×720 | F177 |
| `screen-title-card-1080.png`, `screen-board-1080.png`, `screen-question-open-{1080,720}.png`, `screen-buzz-banner-{1080,720}.png`, `screen-buzz-wrong-1080.png`, `screen-choice-1080.png`, `screen-reveal-1080.png` | Screen game | F178 |
| `screen-scoreboard-1080.png`, `screen-final-{1080,720}.png` | Scoreboard and final results | F179 |
| `host.png` | Host phone: pairing, lobby, question, judging, board, players, settings. Plus the `lg` dashboard while judging | F180 |
| `sets-pickers-editor.png` | Host picker (1440 and 375), Room created, Build a game, /sets, set editor, answer sheet | F181, F182 |
| `admin.png` | Sign-in, overview, category, generate, history, level review | F183 |

Mock content is real: built-in set titles, copy from `lib/copy.ts`, names up to the 16-character limit, room code FJRM. Emoji don't render in the exports; the app shows them as now.

## The read (before)

- **Today:** Overprint (M32 + M33). Grey newsprint, Anybody wide capitals over Archivo, teal and orange passes printing moss, the red Lit dome.
- **Works and stays:**
  - every route, handler, test hook and string
  - M33's name fitting and lobby fit
  - the single-button start gate
  - a buzzer that never moves between states
  - the Screen's floors
- **Why change:** Kim's call. Overprint never felt right, and Hum was abandoned.

## Picks

- **Redesign:** full, the same routes as M32: `/`, `/play`, `/screen`, `/host`, `/sets`, `/sets/:id`, `/sets/:id/print`, `/admin` and its sub-routes, `/admin/sets/:id`.
- **Keeps:**
  - every route, link, field, handler and `data-testid`
  - every string
  - the Screen's text floors and stage variants
  - `PLAYER_PALETTE`
  - the game logic (none of it moves)
  - category and avatar emoji
  - `BUZZER_LOOK`'s data attributes and their values (`data-cap`, `data-bulb`, `data-tone`, `data-mark`); only the CSS that draws them changes
- **Theme:** Marquee, a custom sibling of Arcade (`design.md` System).
- **Signatures:**
  - the bulb-bordered marquee sign on Landing
  - the room board with DotGothic code tiles on the Screen
  - the amber buzzer in its bulb ring on the phone
  - the full-width buzz banner with a bulb border
- **Chrome:** the app's own shells are kept: PageShell, AdminLayout, ScreenChrome.
- **Files:**
  - Edit:
    - `client/src/tokens.css`, `client/src/base.css`, `client/src/index.css` (the stamp, `@theme`, `.lit-buzzer`)
    - `client/src/lib/ui.ts`, `client/src/main.tsx` (font imports)
    - `client/index.html` (`theme-color`), `client/public/favicon.svg`
    - `client/src/lib/resultsCard.ts` (its copied colours and faces), `client/src/lib/nameFit.ts` (letter widths for Antonio)
    - the components and pages each feature names
  - Create: none required. A `BulbBorder` component is allowed if two or more surfaces share it.
  - Delete: none.

## The buzzer (the amber bulb ring)

The structure stays the same as today: `Play.tsx` renders `BUZZER_LOOK` by `BuzzerKind`.

- A ring of 22 bulbs surrounds a round amber button.
- The button has a `--color-lead-deep` key edge, with BUZZ in Antonio and ground-coloured type.
- **Mapping from the existing attributes:**
  - `data-cap`: `up` sits the button 4px raised; `down` slams it onto its edge.
  - `data-bulb`: `off` shows every bulb in `--color-bulb-off`; `breathe` becomes the chase (alternate bulbs, 0.5s, `steps(1)`); `on` lights every bulb amber.
  - `data-tone`: `red` is the amber button; `drained` is well-2 with muted BUZZ; `dim` is amber at 40%.
  - `data-mark`: `warn` is a 6px stop ring round the button; `x` is a 6px ink X over the button's face.

| Kind | Button | Bulbs | Else |
|---|---|---|---|
| `practice` (lobby test) | up, amber | off; each test press lights them all once | "Tap to test your buzzer" |
| `idle` (Get ready…) | down, drained | off | A false-start press is still taken while `live` |
| `live` (Buzzers open!) | up, amber | chase | Optional "N seconds to buzz" in DotGothic under it |
| `pressed` (Buzzed…) | down, amber | all on | |
| `won` (You’re first! Answer now) | down, amber | all on | The status block turns amber with ground type; the answer countdown sits under the buzzer in DotGothic 110 |
| `early` (Too early!) | down, drained | off | Status block in stop red with ground type; 6px stop ring |
| `lost` (… buzzed first) | up, dim | off | Muted status |
| `out` (Locked out this round) | down, drained | off | 6px ink X; muted status |
| `choice`, `typed` | none | none | Choice tiles or the text box replace it, as now (`player.png`) |
| `revealed`, `final` | none | none | The answer card, or the final rank in DotGothic, as now |

Under reduced motion the button snaps, and the live chase holds the alternate pattern still. Haptics are unchanged.

## How each M35 feature runs

1. **Read first.**
   - `design.md`, then this file's section for the feature, then the mock PNG it names.
   - From the hallmark skill (`~/.claude/skills/hallmark`):
     - `references/redesign.md` § Build and § After
     - `references/flow.md` § App screens (or the page flow for F175)
     - `references/direction.md` § What still binds
   - Marquee is a custom theme, so there is no theme file.
2. **Recompose inside the existing shell.**
   - No logic moves.
   - No prop, `name`, `id`, `key`, `href` or `data-testid` that code or a test reads is renamed.
   - A state the screen has no logic for goes to Backlog, never into code.
   - In the files a feature touches, comments that name Overprint's faces or passes are updated.
3. **Lint before commit.**
   - With `npm run dev` running (and `GENERATE_FAKE=1` for admin), run `node ~/.claude/skills/hallmark/scripts/sloplint.mjs <changed files> --genre playful --scope app --render --kept --url http://localhost:5173/<route>`.
   - Fix every FAIL.
   - Fix or waive every REFLEX in the `index.css` stamp, one waiver per gate. Antonio capitals on buttons and the buzzer's chase loop are waived by `design.md` System; cite it.
   - The render tier needs `puppeteer-core` at `~/.cache/hallmark/pptr`, exported as `HALLMARK_PUPPETEER=~/.cache/hallmark/pptr/node_modules/puppeteer-core`. Never add it to `package.json`. If the variable is unset, run the static tier and say so in PROGRESS.
4. **Verify.** `buzzer:verify` green, then `/playtest` at the `docs/ux/README.md` device matrix. Phones are never worse than before.
5. **Record.** Copy that a gate rewrites goes in the PROGRESS entry, before and after.

## Surfaces

| Feature | Surface | Target |
|---|---|---|
| F174 | System and fonts | See the F174 detail below. Looks reskinned, layouts unchanged. |
| F175 | Landing, join | `landing.png`. See the F175 detail below. |
| F176 | Player phone | `player.png`, `components-player.png`. See the F176 detail below. |
| F177 | Screen lobby and chrome | `screen-lobby-*.png`, `components-screen.png`. See the F177 detail below. |
| F178 | Screen game | `screen-*` game frames. See the F178 detail below. |
| F179 | Scoreboard, final results | `screen-scoreboard-1080.png`, `screen-final-*.png`. See the F179 detail below. |
| F180 | Host remote | `host.png`. See the F180 detail below. |
| F181 | Set library and pickers | `sets-pickers-editor.png` (Host picker 1440 and 375, Room created, Build a game, Question sets). See the F181 detail below. |
| F182 | Set editor, answer sheet | `sets-pickers-editor.png` (Set editor, Answer sheet). The editor's toolbar, outline (the current row blue), question cards, paste and preview. The answer sheet prints ground ink on white. |
| F183 | Admin | `admin.png`. The shell, category list (status dots: live blue, draft ink, needs review amber, generating muted, failed stop), overview figures (DotGothic, their own numbers only), category page, generate, history, level review. |
| F184 | Sweep and handoff | `--kept` on every route, `compare.html`, the finish review, `00-foundations.md` naming Marquee, the log entry. |

**F174 System and fonts**
- `sloplint --before` record of every route.
- Marquee tokens on the existing names (`design.md` Tokens).
- `lib/ui.ts` classes rebuilt per `design.md` Controls: the key edge, Antonio capitals, Size m and s.
- Font imports: `@fontsource/antonio/700.css`, `@fontsource-variable/sofia-sans/wght.css`, `@fontsource/dotgothic16/400.css`. The Anybody and Archivo imports are dropped.
- `nameFit.ts` letter widths for Antonio 700.
- `resultsCard.ts` colours and faces.
- `theme-color`, favicon (an amber B on ground with a bulb ring).

**F175 Landing, join**
- The marquee sign: BUZZR at hero size in amber, the sentence beside it on desktop and under it on phones.
- The join card: Room code tiles and the primary JOIN.
- Host a game (secondary) and Question sets (link).
- At 375 everything stacks and JOIN goes full width.
- The host picker and the created room keep their slot.

**F176 Player phone**
- The buzzer and every state in § The buzzer.
- Join form: the name field, and avatar tiles 6 across where the chosen one has an ink ring.
- Top bar: the avatar with its swatch, the name, Room, the score in amber, the "⋯" menu.
- The status block with its 4px ink rule.
- Who's here: chips, absent players at 40%.
- Choice tiles in A–D colours, the typed answer, the answer card, final.
- Buttons Size s.

**F177 Screen lobby and chrome**
- The set title in Antonio.
- The room board: a bulb border, "Room code", four DotGothic tiles, "Join at …" and the QR card.
- The players panel: "N players" in amber, chips up to 4 columns × 3 rows, then "+N more".
- The host bar in its lobby phase (Start game, Settings ▾, Pair host phone).
- ScreenChrome header: BUZZR, the question pill, Join at, Room.
- The start overlay.

**F178 Screen game**
- Title card on a bulb-bordered board.
- Board: Antonio column heads on a 4px amber rule; tiles open, picked or used, with the host cursor as a double blue ring.
- Question: Sofia Sans; "Buzzers open" on amber with seconds and a draining bar, or "Buzzers locked".
- Buzz banner:
  - Full width, amber, with a bulb border.
  - "First to buzz", the name in Antonio, the countdown in DotGothic, "also buzzed" chips.
  - Wrong: stop red, the name struck through, the word "Wrong".
- Choice question in a 2×2 grid.
- Reveal: an answer card with an amber top bar, and a blue scorer chip with "+200".
- Flash: blue for correct, stop for wrong.
- Standings rail, with the buzzing player as the blue cursor row.
- The host bar in every phase.

**F179 Scoreboard, final results**
- Scoreboard: rows with rank, avatar, name and points in DotGothic. The leader is amber; a climber shows "▲ N" in blue.
- Final results: a 3-step podium where 1st is amber with a bulb border and 2nd and 3rd are well. Then "Full ranking" and "Tonight".
- Names read in full at 1280×720 and 1920×1080 (M33).

**F180 Host remote**
- Phone:
  - Header: HOST, room and players, the Q pill, Read aloud.
  - Tabs on a 4px rule, the active one amber.
  - Question card with an answer box.
  - The primary bar.
  - The judging card: amber, ✓ Correct (blue), ½ Half, ✕ Wrong (stop).
  - Players rows with −/+ and Custom.
  - Settings, stacked: switch rows keep the switch beside the text. Stepper rows put the label and description over a full-width "− value +". Language is two choice buttons (English chosen).
  - Pairing PIN in code tiles.
- `lg`: the dashboard grid.
- Buttons Size s on phones.

**F181 Set library and pickers**
- Category rows (emoji, name, E/M/H pills, the chosen level blue) and set cards.
- The ticket: an amber outline with a key edge.
- RoomCreated: 4 option cards, the first amber.
- GameBuilder: chosen mode blue, ticked categories blue-edged with "Column N".
- At 375 the rows hug their height and the pills show E/M/H.

## Open (Kim, before or after launching M35)

1. **Old font packages.** Anybody and Archivo stay in `package.json` until F174 drops their imports. npm is ask-only in the unattended run, so after the run Kim runs `npm uninstall @fontsource-variable/anybody @fontsource/archivo @fontsource/archivo-narrow`.
2. **Antonio has no ▾.** "More ▾" and "Settings ▾" keep the ▾ in the body face (a `<span>` in Sofia Sans), or drop it. **Default:** keep it, in Sofia Sans.
3. **Host bar on a 1280×720 laptop.** **Default:** the bar keeps M33's `cqw` sizes and only takes the Marquee look.

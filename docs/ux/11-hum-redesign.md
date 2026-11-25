# 11 — Hum redesign (M34)

A third full Hallmark redesign, planned 2026-11-24 with `/hallmark redesign buzzer/client`. It replaces M32's Overprint with Hum. **Kim's calls:** no deal: Kim named Hum from Hallmark's gallery. Mock Landing, the Screen lobby and the phone buzzer, then approve (approved 2026-11-24). The phone buzzer stays the Lit dome, recast in Hum's coral. The Screen is cream paper like everything else. The scoreboard and final results become a garden of glyph plants that grow with the scores. The locked system is `design.md` at the project root: read it first. This file holds the read, the picks, the buzzer's states, the garden and what each feature changes. Every rule in `00-foundations.md` still holds except its look: the breakpoints, the variants, the floors and the device matrix.

## The mocks

Static HTML in `.hallmark/mocks/hum/`, sharing `hum.css` (the system, the card stock, the dome, the garden) and `hum.js` (torn edges from seeded value noise, plants grown from a score). Rebuild with `.hallmark/mocks/build.sh`, which inlines the real join QR into `index.src.html`. Serve the folder over HTTP to view (`python3 -m http.server -d .hallmark/mocks`): Chrome's extension can't open `file://`. The mocks load Chillax from Fontshare; the app self-hosts it (F163b).

- `hum/index.html`: the approved Landing, Screen lobby and phone buzzer (buzzers open). Visual targets for F164, F166 and F165.
- `hum/buzzers.html`: the coral Lit dome in all eight states. Target for F165.
- `hum/garden.html`: the scoreboard (four players, one on 0) and final results (three teams). Target for F168.
- `hum.css` and `hum.js` are reference code, not a dependency: port what a feature needs into `tokens.css`, `base.css`, `lib/ui.ts` and the components.

## The read (before)

The app as M32 and M33 left it: Overprint, grey newsprint, Anybody wide capitals over Archivo, teal and orange passes printing moss, square and flat, the red Lit dome. M33's sweep ended at 0 FAIL. F163 records it afresh with `sloplint --before` so `--kept` has a current record of the wiring.

- **For:** running a quiz night on a TV, with phones as buzzers. The one action is to join (a player) or to host (the laptop).
- **Works and stays:** the room code as four tiles on Landing; the Screen's statement-size code and QR; the single-button start gate; a buzzer that never moves between states; every route, handler and test hook; M33's name fitting and lobby fit.
- **Why change:** Kim's call. Kim did not like Overprint and picked Hum: cheerful, tactile, with buttons that press like keys.

## Picks

- **Redesign** · full · the same 11 routes as M32 (/, /play, /screen, /host, /sets, /sets/:id, /sets/:id/print, /admin and 4 sub-routes, /admin/sets/:id)
- **Keeps** · every route, link, field, handler and `data-testid` · every string except the copy-gate lines each feature lists · the Screen's text floors and stage variants · `PLAYER_PALETTE` · the game logic (none of it moves) · category and avatar emoji, which are content · the status line in two lines (M32)
- **Theme** · Hum, by request (cream paper with grain and fibre, torn sheets lit from the top left, card stock that presses, blue-black ink, Chillax 500/600; pear action, blue links, coral the buzzer, mint growth)
- **Signature** · the room code as card-stock tiles on a torn sand strip · the coral Lit dome on the phone · the scoreboard garden
- **Chrome** · the app's own shells are kept (PageShell, AdminLayout, ScreenChrome)
- **Material** · real: the built-in sets with their categories and emoji, room codes, player names, avatars and colours, scores · pictures: none (Hum's Range carries it: the product as card stock, growth set in type) · absent: logos, quotes, metrics
- **Files** · edit: `client/src/tokens.css`, `client/src/base.css`, `client/src/index.css` (stamp and `@theme`), `client/src/lib/ui.ts`, `client/src/main.tsx` (font imports), `client/index.html` (`theme-color`), `client/public/favicon.svg`, `client/src/lib/resultsCard.ts` (the share card's copied colours and faces), `client/src/lib/nameFit.ts` (letter widths for Chillax), and the components and pages each feature names · create: none for the fonts (`client/public/fonts/` is gitignored and filled by `scripts/fetch-fonts.sh`), `client/src/lib/torn.ts` (F163), `client/src/lib/garden.ts` and `client/src/components/GlyphGarden.tsx` (F168) · delete: none

## The buzzer (the coral Lit dome)

The M32 Lit dome, unchanged in structure (`Play.tsx`, `BUZZER_LOOK` by `BuzzerKind`): a round card-stock base, a coral wall, a coral dome cap and a bulb inside the cap. Only the cap translates and only the bulb's opacity animates. The label above it and the word for each state are unchanged (`lib/buzzerState.ts`, `lib/copy.ts`). BUZZ is ink on the coral.

| Kind | Cap | Bulb | Else |
|---|---|---|---|
| `practice` (lobby test) | up, presses | off; flares once on `fx practice` | coral |
| `idle` (Get ready…) | down | off | drained: grayscale 0.8. A false-start press is still taken when `live` |
| `live` (Buzzers open!) | up | breathes 0.3 to 0.85 | coral |
| `pressed` | down | 1 | coral |
| `won` (You're first!) | down | 1, steady | the answer countdown as a Chillax 600 figure under it |
| `early` (Too early!) | down | off | a 6px pear-deep ring (warn) around the base |
| `lost` (… buzzed first) | up | off | brightness 0.85 |
| `out` (Locked out) | down | off | drained, a 6px ink X over the cap's face |
| `choice`, `typed` | — | — | the choice tiles or text box replace it, as now |
| `revealed`, `final` | — | — | the answer on a card, as now |

Under reduced motion the cap snaps and the bulb holds at 0.6 while live. Haptics are unchanged.

## The garden

`design.md` Controls has the look. The rules for F168:

- A pure `lib/garden.ts`: `plantSegments(score, leaderScore, max = 9)` returns 0 for a score of 0 or less (a seed), otherwise `max(1, round(score / leader × max))`; leaves on every second segment, alternating sides; the flower is the first letter of the name (`Array.from(name)[0]`, uppercased), the team's colour word's initial for a team. Unit tests cover 0, negative scores, a tie at the top, a leader of 0, one player, and a name that starts with an emoji or a combining mark.
- `GlyphGarden` renders the plants (`aria-hidden`), the torn ground and a card-stock tag per entry (name with swatch, points via `pointsText`), the leader's tag pear. The tags are the list: an `<ol>` in rank order, so a screen reader reads the standings as before.
- **Scoreboard** (`Scoreboard` in `components/ScreenResults.tsx`): the garden in place of the ranked list for up to 10 entries. Past 10, the garden holds the top 10 and the existing ranking carries the rest ("+N more"). The M32 climb becomes the growth: each stem translates up from the height `lastOrder` last showed to its new one, then the tags reorder after `REORDER_DELAY_MS` as now.
- **Final results** (`FinalResults`): the garden replaces the podium's three steps (top three, or every team); "Full ranking", "This game" and "Tonight" stay below as they are. M33's full-name rule holds on the tags (no truncation at 1280×720 and 1920×1080).
- **Landing**: a static strip (`GlyphGarden` with fixed decorative entries and no tags), flowers spelling B, U, Z, Z, R among asterisks and o's, as the mock.
- The share card (`lib/resultsCard.ts`) keeps its podium layout in Hum's colours and Chillax; it does not draw the garden.

## How each M34 feature runs

1. Read `design.md`, then this file's section for the feature, then the mock it names. From the hallmark skill (`~/.claude/skills/hallmark`), read `references/redesign.md` § Build and § After, plus `references/flow.md` § App screens (or the page flow for F164) and `references/themes/hum.md`.
2. Recompose inside the shell the screen already has. No logic moves. No prop, `name`, `id`, `key`, `href` or `data-testid` that code or a test reads is renamed. A state the screen has no logic for goes to Backlog, never into code. Comments that name Overprint's faces or passes are updated in the files the feature touches.
3. Before commit, with `npm run dev` running (and `GENERATE_FAKE=1` for admin), run `node ~/.claude/skills/hallmark/scripts/sloplint.mjs <changed files> --genre playful --scope app --render --kept --url http://localhost:5173/<route>`. Fix every FAIL. Fix or waive every REFLEX in the `index.css` stamp (one waiver per gate). The render tier needs `puppeteer-core` at `~/.cache/hallmark/pptr`, exported as `HALLMARK_PUPPETEER=~/.cache/hallmark/pptr/node_modules/puppeteer-core`. Never add it to `package.json`. If the variable is unset, run the static tier and say so in PROGRESS.
4. `buzzer:verify` green, then `/playtest` at the `docs/ux/README.md` device matrix. Phones are never worse than before.
5. Copy that a gate rewrites goes in the PROGRESS entry, before and after.

## Surfaces

| Feature | Surface | Target |
|---|---|---|
| F163 | System | `--before` record of every route. Hum tokens on the existing Tailwind names, plus `accent-deep`, `accent-hi`, `accent-3`, `mint`, `mint-deep`, `stock-edge`, `fringe`, `kraft`, `sand`, `sugar`, `hill-1`, `hill-2`, `leaf`, `--grain`, `--fibre`. `win` mint, `warn` pear-deep, `buzz` coral set. `lib/ui.ts` classes rebuilt as card stock per `design.md` Controls. `lib/torn.ts`: seeded torn `clip-path` polygons (port `hum.js`) with unit tests, and a `TornSheet` wrapper. `theme-color`, favicon. `resultsCard.ts` colours. Looks reskinned, layouts unchanged |
| F163b | Fonts | `@font-face` for Chillax 500/600 from `/fonts/` (`client/public/fonts/`, gitignored, filled by `scripts/fetch-fonts.sh`) with `font-display: swap`; Anybody and Archivo imports removed; `nameFit.ts` letter widths and `resultsCard.ts` faces for Chillax |
| F164 | Landing, join | As the mock: Buzzr at statement size, the sentence, the join card with the page curl on a sugar mat (the four code tiles and the pear Join), Host a game and Question sets under it, the static garden strip at the foot. The host picker and its created room stay in their slot |
| F165 | Player phone | The join form (name field, avatar tiles as card stock, the chosen one ink). The coral Lit dome and every state in § The buzzer. Top bar as the mock: round avatar with its swatch, name, Room code, score as a card-stock figure, Menu. Choice and typed answers as card stock, reveal and final on a card |
| F166 | Screen lobby | As the mock: the set title, the code tiles on a torn sand strip, the QR on a curled card over a sugar mat, the players as card-stock chips, host controls bottom left with the pear Start game. The start gate. ScreenChrome |
| F167 | Screen game | Question card, board (tiles as card stock, a used tile pressed flat to paper-3), buzz banner (coral with its word), flash (win mint, buzz coral), reveal on a card, standings rail as tags, host bar |
| F168 | Garden | § The garden: `lib/garden.ts`, `GlyphGarden`, the scoreboard, final results, the Landing strip |
| F169 | Host remote | Phone and dashboard: pairing PIN as card-stock tiles, the pear primary and a secondary row, players as card rows, settings with chosen pills in ink, typed marking, read-aloud, board picker |
| F170 | Set library | /sets as cards on paper: category rows with their E/M/H level pills (a chosen level is ink). Pickers (CategoryPicker, GameBuilder, NewGamePicker, RoomCreated, HostGame) share it |
| F171 | Set editor, print | Editor toolbar, outline, question cards, paste and preview. The answer sheet prints ink on white |
| F172 | Admin | Shell, list, overview figures (Chillax 600, their own numbers only), category page, level review, generate, history |
| F173 | Sweep and handoff | `--kept` on every route, `compare.html`, the finish review, `00-foundations.md` updated, the log entry |

## Open (Kim, before launching M34)

1. **Chillax files (settled 2026-11-24).** The ITF Free Font License 2.0 allows self-hosting for our own app (§01) and forbids redistribution through a public repository (§02); the portfolio repository is public. So the woff2 files are gitignored in `client/public/fonts/`, and `scripts/fetch-fonts.sh` copies them unchanged from the Fontshare kit: run locally on 2026-11-24, and by `deploy-buzzer.yml` before `docker build`. A missing file falls back to the system rounded sans; it never fails the build.
2. **Package removals.** Gabarito and Manrope were uninstalled on 2026-11-24. Anybody and Archivo stay until F163b drops their imports, because removing them sooner breaks the build. npm is ask-only for the unattended run, so after the run Kim runs `npm uninstall @fontsource-variable/anybody @fontsource/archivo @fontsource/archivo-narrow`.
3. **Card stock on the Screen's host bar.** 54px card stock in cqw is large on a 1280×720 laptop. **Default:** the host bar keeps its M33 sizes in cqw and only takes the card-stock look.

import { useEffect, useRef, useState } from 'react';
import type { RankedPlayer, SessionView, TeamView } from '../../../shared/types.js';
import { useCopy } from '../lib/copy.js';
import { ColourDot } from './ColourDot.js';
import { PlayerAvatar } from './PlayerAvatar.js';
import { climbs, ordinal, podiumSteps, replayOrder, type PodiumStep } from '../lib/results.js';
import { teamsByRank } from '../lib/teams.js';
import { prefersReducedMotion, useFlip } from '../lib/useFlip.js';
import { useShrinkToFit } from '../lib/useShrinkToFit.js';
import { PODIUM_NAME, nameFitSize } from '../lib/nameFit.js';

/**
 * A ranking's column on the paper: its rows are the tiles, so it is no card (design.md: no card in
 * a card). Every size here is capped by height for ultrawide displays and has a floor for small
 * ones (F100).
 */
const SCREEN_COLUMN = 'pt-[min(2vw,3.5vh)]';

/** A column's label: Full ranking, Tonight. Sofia Sans, sentence case, muted (design.md Rules). */
const CARD_HEADING =
  'shrink-0 font-sans text-[max(var(--screen-min-body),min(1.6vw,2.9vh))] font-semibold text-muted';

/** A figure of 40px and up: DotGothic16, which smears below that (design.md Rules). */
const DOT_FIGURE = 'font-outlier leading-none';
/** A smaller figure: Sofia Sans 800 in tabular figures (design.md Rules). */
const SMALL_FIGURE = 'font-sans font-extrabold tabular-nums';

/** How long the scoreboard shows the previous standings before it reorders. */
export const REORDER_DELAY_MS = 800;

interface ScoreboardProps {
  players: RankedPlayer[];
  /** Player ids in the order the scoreboard last showed them; empty the first time. */
  lastOrder: string[];
  /** Called with the order on screen once it is the current ranking. */
  onShown: (order: string[]) => void;
  /** With teams on, the teams in index order: they are ranked above the players (F82). */
  teams?: TeamView[] | null;
}

/**
 * The scoreboard overlay (UI spec, Screen view: Scoreboard): the head in amber Antonio, then a
 * scoreboard row per player, the leader's amber and a climber's figures blue with "▲ N"
 * (`screen-scoreboard-1080.png`, F179). It opens in the order it last showed, then slides into the
 * current ranking, so the audience sees who climbed. Later score changes slide too. With reduced
 * motion it opens in the current ranking.
 */
export function Scoreboard({ players, lastOrder, onShown, teams = null }: ScoreboardProps) {
  const [replaying, setReplaying] = useState(() => lastOrder.length > 0 && !prefersReducedMotion());
  const shown = replaying ? replayOrder(lastOrder, players) : players;
  // The order it opened from: `lastOrder` becomes the current order once it is shown.
  const [opened] = useState(lastOrder);
  const climbed = replaying ? undefined : climbs(opened, shown);
  const t = useCopy();

  useEffect(() => {
    if (!replaying) return;
    const timer = setTimeout(() => setReplaying(false), REORDER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [replaying]);

  const order = shown.map((p) => p.id).join(',');
  useEffect(() => {
    if (!replaying) onShown(order.split(','));
  }, [replaying, order, onShown]);

  return (
    <section
      aria-label="Scoreboard"
      className="absolute inset-0 flex flex-col bg-bg px-[min(3.75vw,6.67vh)] pt-[1vh] pb-[max(3vh,var(--hint-reserve,0px))]"
    >
      <div className={`${SCREEN_COLUMN} flex min-h-0 flex-1 flex-col gap-[3vh]`}>
        <h2 className="shrink-0 font-display text-[max(var(--screen-min-name),min(4.4vw,8vh))] leading-none text-accent uppercase">
          {t('scoreboard')}
        </h2>
        {teams && <TeamStandings teams={teams} />}
        {/* The host can show it in the lobby, or after kicking everyone. */}
        {shown.length === 0 ? (
          <p className="text-[max(var(--screen-min-body),min(3vw,5.5vh))] text-muted">
            {t('noPlayersYet')}
          </p>
        ) : (
          // Under the teams, the players take the smaller text, so both fit the card.
          <RankingList rows={shown} dense={teams !== null} board climbs={climbed} />
        )}
      </div>
    </section>
  );
}

/**
 * The Final screen: a top-3 podium, then everyone's rank and score (UI spec, Screen view: Final).
 * From game 2, a Tonight card beside the ranking lists the night's totals (F77). With teams on,
 * the podium is the teams' and the full ranking stays the players' (F82).
 */
export function FinalResults({
  players,
  session = null,
  teams = null,
}: {
  players: RankedPlayer[];
  session?: SessionView | null;
  teams?: TeamView[] | null;
}) {
  const t = useCopy();
  if (players.length === 0 && !session?.totals.length) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <h1 className="font-display text-[max(var(--screen-min-name),min(5vw,8.9vh))] text-muted uppercase">
          {t('gameOver')}
        </h1>
      </div>
    );
  }
  const tonight = session && session.totals.length > 0 ? session.totals : null;
  // Beside the Tonight card, a long ranking keeps the width its columns need (F77).
  const rankingFlex = tonight && players.length > 10 ? 'flex-[3]' : 'flex-[2]';
  const podium: PodiumEntry[] = teams ? teamsByRank(teams).map(teamEntry) : players;
  // A 4th team has no step; it is named under the podium, so every team is ranked.
  const offPodium = teams ? podium.filter((team) => team.rank > 3) : [];
  return (
    // Portrait: the podium, then the ranking, then Tonight, each across the full width (F100).
    <div className="flex min-h-0 flex-1 gap-[min(3vw,5.34vh)] px-[min(3.75vw,6.67vh)] pt-[1vh] pb-[max(3vh,var(--hint-reserve,0px))] stage-portrait:flex-col">
      <section
        aria-label={teams ? 'Team podium' : 'Podium'}
        className={`flex min-w-0 flex-col gap-[3vh] ${tonight ? 'flex-[2]' : 'flex-[3]'}`}
      >
        <h1 className="shrink-0 font-display text-[max(var(--screen-min-name),min(4.4vw,9vh))] leading-none text-accent uppercase">
          {t('finalResults')}
        </h1>
        <ol className="flex min-h-0 flex-1 items-end justify-center gap-[min(1.5vw,2.67vh)]">
          {podiumSteps(podium).map((step) => (
            <Step key={step.rank} step={step} />
          ))}
        </ol>
        {offPodium.length > 0 && (
          // Spaced apart rather than joined with dots (F160).
          <p className="flex shrink-0 flex-wrap justify-center gap-x-[2vw] text-[max(var(--screen-min-body),min(2vw,3.6vh))] font-semibold text-muted tabular-nums">
            {offPodium.map((team) => (
              <span key={team.id}>{`${ordinal(team.rank)} ${team.name} ${team.score}`}</span>
            ))}
          </p>
        )}
      </section>
      <section
        aria-label="Full ranking"
        className={`${SCREEN_COLUMN} flex min-w-0 ${rankingFlex} flex-col gap-[2vh]`}
      >
        <h2 className={CARD_HEADING}>{t('fullRanking')}</h2>
        {/* Beside the podium the column is narrow, so up to 10 keep one column, as beside the
            Tonight card; two columns wrapped names mid-word at 1080 and shrank them to 14px at
            720 (F179 playtest). */}
        <RankingList rows={players} dense />
      </section>
      {tonight && (
        // The night's totals in a well on a 2px rule edge (`screen-final-*.png`).
        <section
          aria-label="Tonight"
          className="flex min-h-0 min-w-0 flex-[2] flex-col gap-[2vh] self-start border-2 border-edge bg-surface p-[min(1.5vw,2.67vh)]"
        >
          <h2 className={CARD_HEADING}>{t('tonight')}</h2>
          <RankingList rows={tonightRows(tonight.slice(0, TONIGHT_ROWS), players)} dense />
          {tonight.length > TONIGHT_ROWS && (
            <p className="shrink-0 text-[max(var(--screen-min-label),min(1.6vw,2.9vh))] text-muted">
              {t('andMore', { n: tonight.length - TONIGHT_ROWS })}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/** The Tonight card lists the night's top 10: one column, legible beside the game's ranking. */
export const TONIGHT_ROWS = 10;

/** A row of a ranking list: a player's game score, or their night total. */
interface RankingRow {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  score: number;
  rank: number;
  /** Dimmed when false: disconnected, or gone from the room for a night total. */
  connected: boolean;
}

/** The night's totals as ranking rows. A player who left keeps a dimmed row, as a disconnected one does. */
function tonightRows(totals: SessionView['totals'], players: RankedPlayer[]): RankingRow[] {
  const here = new Map(players.map((p) => [p.id, p.connected]));
  return totals.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    ...(t.avatar !== undefined && { avatar: t.avatar }),
    score: t.total,
    rank: t.rank,
    connected: here.get(t.id) ?? false,
  }));
}

/** One name on a podium step: a player, or a team with teams on. */
type PodiumEntry = Omit<RankingRow, 'connected'>;

/** A team as a podium entry or ranking row: its name in its colour, with its summed score. */
function teamEntry(team: TeamView): RankingRow {
  return {
    id: `team:${team.index}`,
    name: team.name,
    color: team.color,
    score: team.score,
    rank: team.rank,
    connected: true,
  };
}

/**
 * Step heights, top step first, as minimums: a short step grows to hold its rank and score (F153).
 * Lower in portrait, where the podium shares the height with the ranking (F100). Full class
 * strings, so Tailwind can see them.
 */
const STEP_HEIGHT = [
  'min-h-[30vh] stage-portrait:min-h-[16vh]',
  'min-h-[21vh] stage-portrait:min-h-[11vh]',
  'min-h-[14vh] stage-portrait:min-h-[7.5vh]',
] as const;

function Step({ step }: { step: PodiumStep<PodiumEntry> }) {
  const names =
    step.players.length > 3
      ? 'text-[max(var(--screen-min-body),min(1.6vw,3vh))]'
      : 'text-[max(var(--screen-min-name),min(2.6vw,5vh))]';
  // The winners' step is amber in a bulb border, ground type on it; the others are the well on a
  // 2px rule edge, the place in amber (design.md Rules, Bulbs).
  const top = step.rank === 1;
  const shared = step.players.length > 1;
  return (
    <li
      aria-label={`${ordinal(step.rank)} place`}
      // Portrait gives each step up to a third of the width (F100).
      className="flex min-h-0 max-w-[min(16vw,28.45vh)] min-w-0 flex-1 flex-col items-stretch justify-end gap-[1vh] stage-portrait:max-w-[30vw]"
    >
      {/* Each name steps down from the step's size until its longest word fits the step, and
          wraps at a space rather than truncating (F153). */}
      <ul className={`@container flex min-h-0 flex-col gap-[2vh] overflow-hidden pt-1 ${names}`}>
        {step.players.map((player) => (
          <li
            key={player.id}
            style={{ fontSize: nameFitSize(player.name, PODIUM_NAME, player.avatar !== undefined) }}
            // The swatch over the name in Antonio capitals (`screen-final-*.png`). Tied names take a
            // small swatch, so a shared step's stack stays under the heading at 720.
            className={`flex items-center justify-center gap-[0.2em] text-center font-display leading-[1.1] text-ink uppercase [overflow-wrap:anywhere] ${shared ? 'flex-wrap' : 'flex-col'}`}
          >
            <ColourDot
              color={player.color}
              className={`${shared ? 'size-[0.7em]' : 'size-[1.6em]'} border-[0.06em] border-paper ring-2 ring-ink`}
            />
            <PlayerAvatar avatar={player.avatar} />
            {player.name}
          </li>
        ))}
      </ul>
      <div
        data-winner={top || undefined}
        className={`flex shrink-0 flex-col items-center justify-start gap-[1vh] ${STEP_HEIGHT[step.height]} ${
          top
            ? // Its bulbs are the ground's colour on the amber, as on the buzz banner (F178); the
              // padding keeps the figures clear of the band.
              'bulbs bg-accent p-[2.25rem] text-accent-ink [--bulb-dim:color-mix(in_oklab,var(--color-paper)_40%,transparent)] [--bulb-lit:var(--color-paper)]'
            : 'border-2 border-edge bg-surface pt-[2vh] text-accent'
        }`}
      >
        <span className={`text-[max(var(--screen-min-figure),min(5.7vw,10vh))] ${DOT_FIGURE}`}>
          {ordinal(step.rank)}
        </span>
        <span
          className={`text-[max(var(--screen-min-figure),min(2.2vw,4vh))] ${DOT_FIGURE} ${top ? '' : 'text-ink'}`}
        >
          {step.players[0]!.score}
        </span>
      </div>
    </li>
  );
}

/**
 * The teams on the scoreboard, best first: one scoreboard row each, side by side: rank, the
 * team's colour as a ringed swatch, its name in Antonio and the summed score (F82, F179). Rows
 * slide when the order changes.
 */
const TEAM_FIGURE = `${DOT_FIGURE} text-[max(var(--screen-min-figure),1.2em)]`;

function TeamStandings({ teams }: { teams: TeamView[] }) {
  const list = useRef<HTMLOListElement>(null);
  const ranked = teamsByRank(teams);
  useFlip(list, ranked.map((team) => team.index).join(','));
  return (
    <ol
      ref={list}
      aria-label="Teams"
      className="grid shrink-0 auto-cols-fr grid-flow-col gap-[min(1.5vw,2.67vh)] text-[max(var(--screen-min-name),min(2.6vw,4.6vh))]"
    >
      {ranked.map((team) => (
        <li
          key={team.index}
          data-flip-key={team.index}
          className="flex min-w-0 items-center gap-[0.5em] border-2 border-edge bg-bg px-[0.6em] py-[0.25em]"
        >
          <span className={`shrink-0 text-accent ${TEAM_FIGURE}`}>{team.rank}</span>
          <ColourDot data-team-color color={team.color} />
          <span className="min-w-0 flex-1 font-display uppercase [overflow-wrap:anywhere]">
            {team.name}
          </span>
          <span className={`shrink-0 text-accent ${TEAM_FIGURE}`}>{team.score}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Ranking text sizes, largest first: the most each step gets. Full class strings, so Tailwind can
 * see them.
 */
const RANKING_TEXT = [
  'text-[max(var(--screen-min-body),min(3vw,5.5vh))]',
  'text-[max(var(--screen-min-body),min(2vw,3.6vh))]',
  'text-[max(var(--screen-min-body),min(1.4vw,2.4vh))]',
] as const;

/** A ranking shrinks to fit its card, but not below the Screen's 14px floor (F100). */
const RANKING_MIN_PX = 14;

/**
 * Columns for a ranking with the card to itself: few enough rows that 24 players stay at 24px or
 * more at 1080p, above the host bar (SCR-04). Beside the Tonight card (`dense`) the card is
 * narrower, so it keeps one column up to 10.
 */
export function rankingColumns(count: number): number {
  return count <= 6 ? 1 : count <= 16 ? 2 : count <= 30 ? 3 : 4;
}

/**
 * Ranked rows of rank, name and score, filling down each column, in `rankingColumns` columns
 * (F100), and the text shrinks to keep 50 on screen. `dense` never uses the largest text, and
 * keeps one column up to 10, for a list in a narrower card: the Final's, beside the podium (F179) and the Tonight card (F77).
 * The list takes the card's remaining height, and its text shrinks below the step when the rows
 * would not fit it, so no row is ever cut off (SCR-04).
 *
 * `board` sets the scoreboard's rows: each a box on a 2px rule edge with the name in Antonio
 * capitals, the leader's amber, a climber's figures blue after its "▲ N" (design.md Controls,
 * F179). Otherwise rows are plain: the rank amber, the name in Sofia Sans, the score in ink. A
 * scoreboard at the largest text sets figures in DotGothic, at 40px or more; elsewhere they are
 * Sofia Sans 800 (design.md Rules).
 */
function RankingList({
  rows: players,
  dense = false,
  board = false,
  climbs,
}: {
  rows: RankingRow[];
  dense?: boolean;
  board?: boolean;
  /** Places risen since the scoreboard last showed, by player id. */
  climbs?: ReadonlyMap<string, number> | undefined;
}) {
  const list = useRef<HTMLOListElement>(null);
  useFlip(list, players.map((p) => p.id).join(','));
  useShrinkToFit(
    list,
    'css',
    RANKING_MIN_PX,
    players.map((p) => `${p.avatar ?? ''}${p.name}${p.score}`).join('\n'),
  );
  const size = players.length <= 10 ? 0 : players.length <= 24 ? 1 : 2;
  const columns = dense ? size + 1 : rankingColumns(players.length);
  const rows = Math.max(Math.ceil(players.length / columns), 1);
  const text = RANKING_TEXT[dense ? Math.max(size, 1) : size];
  // DotGothic only on the scoreboard's largest rows, which have the width for 40px figures; a
  // narrower column of them would shrink the names to fit (F179 playtest).
  const figure =
    board && !dense && size === 0
      ? `${DOT_FIGURE} text-[max(var(--screen-min-figure),1.25em)]`
      : SMALL_FIGURE;
  return (
    <ol
      ref={list}
      // Columns that may shrink below their content, so a long name wraps instead of pushing the
      // score past the card's edge (F75, F153). Rows keep their content's
      // height, so the list's overflow is what the fit measures.
      style={{
        gridTemplateRows: `repeat(${rows}, auto)`,
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
      className={`grid min-h-0 flex-1 grid-flow-col content-start gap-x-[min(1.5vw,2.67vh)] overflow-hidden ${
        board ? 'gap-y-[min(0.8vw,1.4vh)]' : ''
      } ${text}`}
    >
      {players.map((player) => {
        // Rank 1 with points: a scoreboard of noughts has no leader.
        const lead = board && player.rank === 1 && player.score > 0;
        const rise = climbs?.get(player.id);
        // The leader's row is ground on amber throughout; a climber's figures are blue.
        const tone = lead ? '' : rise ? 'text-accent-2' : 'text-accent';
        return (
          <li
            key={player.id}
            data-flip-key={player.id}
            data-leader={lead || undefined}
            // As on the standings rail, a name never truncates (F153): when it and the score do not
            // share a line, the score drops under it, on the right, and a name wider still wraps.
            // A board row is opaque, so rows sliding past each other never mix their text (F154).
            className={`flex flex-wrap items-baseline gap-x-[0.6em] leading-tight ${
              board
                ? `border-2 px-[0.6em] py-[0.25em] ${lead ? 'border-accent bg-accent text-accent-ink' : 'border-edge bg-bg'}`
                : 'py-[0.3em]'
            } ${player.connected ? '' : 'opacity-40'}`}
          >
            <span className="flex min-w-0 flex-auto items-baseline gap-[0.6em]">
              {/* Two wide digits fit 1.6em, as on the standings rail; the room it frees goes to the name. */}
              <span className={`w-[1.6em] shrink-0 text-right ${figure} ${tone}`}>
                {player.rank}
              </span>
              <ColourDot
                color={player.color}
                className="size-[0.6em] self-center border-[0.1em] border-paper ring-2 ring-ink"
              />
              {/* The avatar sits inside the name, not in a column of its own, so it costs no extra gap. */}
              <span
                className={`min-w-0 [overflow-wrap:anywhere] ${board ? 'font-display uppercase' : 'font-semibold'}`}
              >
                <PlayerAvatar
                  avatar={player.avatar}
                  className="mr-[0.3em] text-[max(var(--screen-min-label),0.85em)]"
                />
                {player.name}
              </span>
            </span>
            <span className="ml-auto flex shrink-0 items-baseline gap-[0.5em]">
              {rise !== undefined && (
                <span
                  className={`font-sans text-[max(var(--screen-min-label),0.6em)] font-extrabold ${tone}`}
                >
                  ▲ {rise}
                </span>
              )}
              <span className={`${figure} ${board ? tone : 'text-ink'}`}>{player.score}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

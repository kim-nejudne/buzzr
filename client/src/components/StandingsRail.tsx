import { useRef } from 'react';
import type { Phase, RankedPlayer, TeamView } from '../../../shared/types.js';
import { teamsByRank } from '../lib/teams.js';
import { useFlip } from '../lib/useFlip.js';
import { ColourDot } from './ColourDot.js';
import { PlayerAvatar } from './PlayerAvatar.js';
import { FLASH_MS } from './ScreenFlash.js';
import { useCopy } from '../lib/copy.js';

/** How many players the rail lists. */
export const STANDINGS_TOP = 5;
/** With teams on, the teams come first and fewer players fit above the host bar at 1080p (F82). */
export const STANDINGS_TOP_WITH_TEAMS = 3;
/** The slim rail's players, below 1280×720 (SCR-15). */
export const STANDINGS_TOP_SLIM = 3;

/**
 * Where the rail cannot show at all: portrait, or under 1024px wide (SCR-15). The rail itself
 * follows the same rule in CSS; Game setup reads it to say so beside the setting.
 */
export const RAIL_HIDDEN_QUERY = '(max-width: 63.99rem), (orientation: portrait)';

/** Rows and avatars that only the full rail shows, from 1280×720. */
const FULL_ONLY = 'hidden [@media(min-width:1280px)_and_(min-height:720px)]:flex';

/**
 * A standings row (design.md Controls): swatch, full name and points. Its fill is the panel's own
 * well, so while rows slide past each other the riser covers the row it passes instead of their
 * text overlapping (F154). The cursor row swaps it for blue.
 */
const ROW = 'items-center gap-x-[0.6em] px-[min(1.6vw,2.85vh)] py-[0.45em]';
/** Points: DotGothic in amber, never under 40px (design.md Rules). */
const FIGURE =
  'shrink-0 font-outlier text-[max(var(--screen-min-figure),min(2.6vw,4.6vh))] leading-none tabular-nums';
/** A swatch the size of the name, in its ink ring. */
const DOT = 'size-[1em] border-[0.1em] border-paper ring-2 ring-ink';
/** The rail's heads: Sofia Sans 600 (design.md Rules). */
const HEAD =
  'shrink-0 px-[min(1.6vw,2.85vh)] font-sans text-[max(var(--screen-min-label),min(1.4vw,2.5vh))] font-semibold text-muted';

/** The question phases that show the rail; the lobby, the scoreboard and the Final screen rank everyone. */
const STANDINGS_PHASES: readonly Phase[] = ['QUESTION', 'OPEN', 'COLLECTING', 'BUZZED', 'REVEAL'];

interface StandingsRailProps {
  phase: Phase;
  /** Ranked, best first, as the Screen view sends them. */
  players: RankedPlayer[];
  /** `RoomSettings.showStandings`. */
  show: boolean;
  /** With teams on, every team in index order: listed by rank above the players (F82). */
  teams?: TeamView[] | null;
  /** The player buzzing in: the blue cursor row (design.md Controls). */
  cursorId?: string;
}

/**
 * The top 5 along the Screen's right edge during a question (UI spec, Screen view: Question); with
 * teams on, every team by rank, then the top 3 players (F82). It
 * takes its own column beside the question, so it never covers the card. From 1280×720 it is full;
 * on a smaller landscape display (a 1366×768 laptop under its browser bar, a 1024×768 tablet) a
 * slim rail shows the top 3 players without avatars, narrower; in portrait or under 1024px wide
 * there is no room beside the card and it hides (SCR-15). Rows slide when the order changes. The
 * well on a 2px rule edge, points in DotGothic amber; the rank is the order (`screen-*.png`, F178).
 */
export function StandingsRail({
  phase,
  players,
  show,
  teams = null,
  cursorId,
}: StandingsRailProps) {
  const list = useRef<HTMLOListElement>(null);
  const teamList = useRef<HTMLOListElement>(null);
  const top = players.slice(0, teams ? STANDINGS_TOP_WITH_TEAMS : STANDINGS_TOP);
  const ranked = teams ? teamsByRank(teams) : [];
  // A judgement reorders the rail as the Screen flashes: the rows wait for the flash (F154).
  useFlip(list, top.map((p) => p.id).join(','), FLASH_MS);
  useFlip(teamList, ranked.map((team) => team.index).join(','), FLASH_MS);
  const t = useCopy();
  if (!show || top.length === 0 || !STANDINGS_PHASES.includes(phase)) return null;

  return (
    <aside
      aria-label="Standings"
      // Capped by height too, so an ultrawide display does not stretch it (F100). It takes the
      // column's height; the panel inside hugs its rows and shrinks when the banner squeezes it.
      className="hidden w-[min(22vw,39vh)] shrink-0 flex-col [@media(min-width:1024px)_and_(orientation:landscape)]:flex [@media(min-width:1280px)_and_(min-height:720px)]:w-[min(26vw,46vh)]"
    >
      <div
        data-rail-panel
        className="flex min-h-0 flex-col gap-[1vh] overflow-hidden border-2 border-edge bg-surface py-[1.6vh]"
      >
        <p className={HEAD}>{t('standings')}</p>
        {teams && (
          <>
            <ol
              ref={teamList}
              aria-label="Teams"
              className="flex shrink-0 flex-col text-[max(var(--screen-min-name),min(1.6vw,2.8vh))]"
            >
              {ranked.map((team) => (
                <li
                  key={team.index}
                  data-flip-key={team.index}
                  className={`flex bg-surface ${ROW}`}
                >
                  <span className="sr-only">{team.rank}</span>
                  <ColourDot data-team-color color={team.color} className={DOT} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{team.name}</span>
                  <span className={`text-accent ${FIGURE}`}>{team.score}</span>
                </li>
              ))}
            </ol>
            <p className={`mt-[0.6vh] ${HEAD}`}>{t('players')}</p>
          </>
        )}
        <ol
          ref={list}
          aria-label={teams ? 'Players' : undefined}
          // Rows that do not fit wrap into a second column, out of sight: a squeezed rail shows
          // whole rows only, never half of one under the banner (F178).
          className="flex min-h-0 flex-col flex-wrap overflow-hidden text-[max(var(--screen-min-name),min(1.6vw,2.8vh))]"
        >
          {top.map((player, i) => {
            const cursor = player.id === cursorId;
            return (
              <li
                key={player.id}
                data-flip-key={player.id}
                aria-current={cursor || undefined}
                // A name never truncates (F153): when it and the score do not share a line, the score
                // drops under it, on the right, and a name wider than the rail wraps.
                className={`${i < STANDINGS_TOP_SLIM ? 'flex' : FULL_ONLY} w-full flex-wrap ${ROW} ${
                  cursor ? 'bg-accent-2 text-accent-2-ink' : 'bg-surface'
                } ${player.connected ? '' : 'opacity-40'}`}
              >
                <span className="flex min-w-0 flex-auto items-center gap-[0.6em]">
                  {/* The order is the rank; a screen reader still hears it. */}
                  <span className="sr-only">{player.rank}</span>
                  <ColourDot data-player-color color={player.color} className={DOT} />
                  <PlayerAvatar avatar={player.avatar} className={FULL_ONLY} />
                  <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">
                    {player.name}
                  </span>
                </span>
                <span className={`ml-auto ${cursor ? '' : 'text-accent'} ${FIGURE}`}>
                  {player.score}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

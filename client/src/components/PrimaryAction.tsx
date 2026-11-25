import type { HostView } from '../../../shared/types.js';
import { primaryFor } from '../lib/hostControls.js';
import { formatGap } from '../lib/screenQuestion.js';
import { BUTTON_PRIMARY, LABEL } from '../lib/ui.js';
import {
  useAnswerCountdown,
  useBuzzCountdown,
  useAnsweringCountdown,
  type AnswerCountdown,
} from '../lib/useAnswerCountdown.js';
import type { HostCommand } from '../lib/useHostCommand.js';
import { ColourDot } from './ColourDot.js';
import { Icon } from './Icon.js';

interface PrimaryActionProps {
  view: HostView;
  command: HostCommand;
  /** The read-aloud layout (F69): the winner's name larger, for a host calling it out. */
  bigWinner?: boolean;
}

// The phone's game control (design.md Controls): the 54px block at Size s, across the bar.
const CONTROL = 'flex w-full items-center justify-center gap-3';

// The icon before the label, in one line: three across leave ~109px each at 375px, so the padding
// is tighter than Size s, and under 360px the type steps down (`host.png`).
const JUDGE = `flex min-h-[54px] items-center justify-center gap-1 rounded-control px-1 font-display text-xl leading-none uppercase max-[359px]:text-base transition-[translate] duration-(--dur-micro) ease-(--ease-out) not-disabled:hover:-translate-y-0.5 not-disabled:active:translate-y-px disabled:opacity-40`;

/**
 * The remote's full-width primary action (UI spec, Host remote). Its label and event follow the
 * phase; after a buzz it becomes the red judging panel: who buzzed first, then the answer countdown
 * right above Correct / Wrong when an answer time is set. The remote keeps it in a bar stuck to the
 * bottom of the Game tab, and the other buzzes (`AlsoBuzzed`) in the content above (F98). While
 * the buzzers are open with a buzz time, or a choice question takes answers, the seconds left sit
 * beside it. The server decides whether it is allowed.
 */
export function PrimaryAction({ view, command, bigWinner = false }: PrimaryActionProps) {
  const { busy, run } = command;
  const countdown = useAnswerCountdown(view);
  const buzzCountdown = useBuzzCountdown(view);
  const answeringCountdown = useAnsweringCountdown(view);

  if (view.phase === 'BUZZED') {
    // After a wrong answer the room waits in BUZZED before the buzzers reopen (DECISIONS #5).
    if (!view.canJudge) {
      return (
        <button
          type="button"
          disabled
          className={`${CONTROL} min-h-[54px] rounded-control bg-bg-deep font-display text-xl text-muted uppercase`}
        >
          Reopening buzzers…
        </button>
      );
    }
    const winner = view.players.find((p) => p.id === view.winnerId);
    return (
      <section
        aria-label="Judging"
        className="flex flex-col gap-3 rounded-card bg-buzz p-4 text-buzz-ink"
      >
        <p className={`${LABEL} text-buzz-ink!`}>Buzzed first</p>
        {winner && (
          <p
            // Antonio capitals at its normal width: set wide, a name would truncate at four letters.
            // Over 10 characters it steps down, so an 11-letter word ("Bartholomew") fits 375px whole (F157).
            className={`flex min-w-0 items-center gap-3 font-display uppercase ${bigWinner ? 'text-[56px]' : winner.name.length > 10 ? 'text-[30px]' : 'text-[44px]'} leading-none`}
          >
            <ColourDot color={winner.color} className="size-4 ring-2 ring-buzz-ink" />
            {/* A long name wraps instead of being cut, so the host judges (and calls out) the whole name (F157). */}
            <span className="min-w-0 pb-1 [overflow-wrap:anywhere]">{winner.name}</span>
          </p>
        )}
        {countdown && <JudgeCountdown countdown={countdown} />}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => run('host:judge', { result: 'correct' })}
            disabled={busy}
            // The win state: blue with ground type (design.md Rules).
            className={`${JUDGE} bg-win text-win-ink`}
          >
            <Icon name="check" className="size-5" />
            Correct
          </button>
          <button
            type="button"
            onClick={() => run('host:judge', { result: 'half' })}
            disabled={busy}
            className={`${JUDGE} bg-buzz-ink text-ink`}
          >
            <Icon name="half" className="size-5" />
            Half
          </button>
          <button
            type="button"
            onClick={() => run('host:judge', { result: 'wrong' })}
            disabled={busy}
            // Stop: its outline and type on the ground, always with its word (design.md Rules).
            className={`${JUDGE} border-2 border-stop bg-buzz-ink text-stop`}
          >
            <Icon name="x" className="size-5" />
            Wrong
          </button>
        </div>
      </section>
    );
  }

  const action = primaryFor(view);
  if (!action) return null;
  const button = (
    <button
      type="button"
      onClick={() => run(action.event, {})}
      disabled={busy}
      // The amber primary at Size s (design.md Controls): the one primary on the remote.
      className={`${BUTTON_PRIMARY} ${CONTROL}`}
    >
      {action.label}
    </button>
  );
  const side = buzzCountdown
    ? { countdown: buzzCountdown, label: 'Buzz time' }
    : answeringCountdown && { countdown: answeringCountdown, label: 'Time to answer' };
  if (!side) return button;
  return (
    <div className="flex items-stretch gap-3">
      {button}
      <SideCountdown {...side} />
    </div>
  );
}

/**
 * The buzz time left beside Reveal answer, or the answer time beside Close answers; at 0 the
 * server reveals by itself (DECISIONS, F63 and F85).
 */
function SideCountdown({ countdown, label }: { countdown: AnswerCountdown; label: string }) {
  return (
    <div
      role="timer"
      aria-label={label}
      // The well on a rule edge with the seconds in amber DotGothic (design.md Rules, figures).
      className="flex min-w-[76px] shrink-0 flex-col items-center justify-center rounded-control border-2 border-edge bg-surface px-3"
    >
      <span className="font-outlier text-[40px] leading-none text-accent">
        {countdown.secondsLeft}
      </span>
      <span className="font-sans text-sm font-semibold text-muted">sec</span>
    </div>
  );
}

/** The other buzzes of this opening, slowest last, with their gap to the winner. */
export function AlsoBuzzed({ view }: { view: HostView }) {
  const others = view.alsoBuzzed.flatMap((gap) => {
    const player = view.players.find((p) => p.id === gap.playerId);
    return player ? [{ player, gapMs: gap.gapMs }] : [];
  });
  if (others.length === 0) return null;
  return (
    <section aria-labelledby="also-buzzed" className="flex flex-col gap-2">
      <h2 id="also-buzzed" className={LABEL}>
        also buzzed
      </h2>
      {/* Rows split by hairlines (design.md Rules). */}
      <ol className="flex flex-col">
        {others.map(({ player, gapMs }) => (
          <li
            key={player.id}
            className="flex items-center gap-3 border-b border-edge px-3.5 py-2.5"
          >
            <ColourDot color={player.color} className="size-3 ring-2 ring-ink" />
            <span className="min-w-0 flex-1 truncate font-semibold">{player.name}</span>
            <span className="text-muted tabular-nums">{formatGap(gapMs)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The winner's seconds left, then a "Time's up" badge. Time up judges nothing: the host still
 * taps Correct or Wrong (DECISIONS, F35).
 */
function JudgeCountdown({ countdown }: { countdown: AnswerCountdown }) {
  return (
    <div
      role="timer"
      aria-label="Answer time"
      className="flex items-center justify-between px-1 pt-1.5"
    >
      <span className="font-sans font-semibold text-buzz-ink">Answer time</span>
      {countdown.up ? (
        <span className="bg-buzz-ink px-3 py-1 font-display text-xl text-ink uppercase">
          Time’s up
        </span>
      ) : (
        <span className="font-outlier text-5xl leading-none text-buzz-ink">
          {countdown.secondsLeft}
        </span>
      )}
    </div>
  );
}

import type { HostView } from '../../../shared/types.js';
import { canGoBack, inGame, UNREVEALED } from '../lib/hostControls.js';
import { HOVER } from '../lib/hover.js';
import type { HostCommand } from '../lib/useHostCommand.js';
import { BUTTON_SMALL, DANGER } from '../lib/ui.js';
import { ConfirmButton } from './ConfirmButton.js';

interface SecondaryActionsProps {
  view: HostView;
  command: HostCommand;
}

/**
 * A secondary action: the secondary at Size s, its label in Antonio capitals (design.md Controls).
 * Each tile starts at its label's width and grows to fill its line, so the row wraps where it must
 * and no gap is left at its end: at 375px Skip, Undo and Previous share a line and Scoreboard
 * takes the next (`host.png`, HST-03). Chosen, Scoreboard turns blue (`aria-pressed`).
 */
const small = `${BUTTON_SMALL} min-w-0 flex-auto`;

/**
 * End game's own row: full width, under the tiles, so arming it moves nothing above. Danger is a 2px
 * stop outline with stop type; armed, Confirm end fills stop with ground type (design.md Controls).
 */
const END = `flex min-h-[54px] w-full items-center justify-center gap-2 rounded-control border-2 px-4 py-2 font-display text-xl uppercase not-disabled:active:translate-y-px disabled:opacity-40`;

/**
 * The remote's secondary actions (UI spec, Host remote): Skip question, Show/hide scoreboard,
 * Undo last judgement, Previous question and End game. The server decides whether each is allowed;
 * Undo reads `canUndo` from the view rather than working the rule out here.
 *
 * The tiles show a short label (Skip, Undo, Previous, Scoreboard) and keep the full one as their
 * accessible name. End game is apart, in a red row of its own below them (HST-03, FND-07).
 */
export function SecondaryActions({ view, command }: SecondaryActionsProps) {
  const { busy, run } = command;
  const playing = inGame(view);

  return (
    <section aria-label="More actions" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {UNREVEALED.includes(view.phase) && (
          // SPEC-QUESTION: Skip question is `host:reveal`; see DECISIONS (F22).
          <button
            type="button"
            onClick={() => run('host:reveal', {})}
            disabled={busy}
            aria-label="Skip question"
            className={small}
          >
            Skip
          </button>
        )}
        {playing && (
          <button
            type="button"
            onClick={() => run('host:undo', {})}
            disabled={busy || !view.canUndo}
            aria-label="Undo last judgement"
            className={small}
          >
            Undo
          </button>
        )}
        {/* On the board there is nothing to go back to; from any tile, Previous returns to it (F89). */}
        {playing && view.phase !== 'BOARD' && (
          <button
            type="button"
            onClick={() => run('host:prev', {})}
            disabled={busy || !canGoBack(view)}
            aria-label="Previous question"
            className={small}
          >
            Previous
          </button>
        )}
        <button
          type="button"
          aria-pressed={view.showScoreboard}
          aria-label={view.showScoreboard ? 'Hide scoreboard' : 'Show scoreboard'}
          onClick={() => run('host:scoreboard', { show: !view.showScoreboard })}
          disabled={busy}
          className={small}
        >
          Scoreboard
        </button>
      </div>
      {view.phase !== 'FINAL' && (
        <ConfirmButton
          // A new phase or question disarms it, so a stale Confirm end can't be tapped later.
          key={`${view.phase}-${view.questionIndex}`}
          label="End game"
          confirmLabel="Confirm end"
          onConfirm={() => run('host:end', {})}
          disabled={busy}
          // Red before it is armed, so it doesn't pass for a safe tile (FND-07). Stop type on the
          // ground is 5.40:1 (design.md Contrast).
          className={`${END} border-stop ${DANGER}`}
          cancelClassName={`${END} border-accent text-accent ${HOVER}`}
          armedClassName="grid grid-cols-2 gap-2"
        />
      )}
    </section>
  );
}

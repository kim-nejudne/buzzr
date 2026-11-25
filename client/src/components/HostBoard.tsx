import { Fragment } from 'react';
import type { BoardView } from '../../../shared/types.js';
import { boardDone } from '../lib/boardCursor.js';
import type { HostCommand } from '../lib/useHostCommand.js';

interface HostBoardProps {
  board: BoardView;
  command: HostCommand;
}

/**
 * The category board on the remote in BOARD (F90): the Screen's grid on its side, a row per
 * category with its title, then its tiles from Easy to Hard, each open tile a button that picks it.
 * Six columns across a phone would leave a title 48 px to wrap in. Open tiles are the well with
 * amber figures (Sofia Sans 800: under 40px, so not DotGothic); a played tile stays in place,
 * disabled, as shade with its points for a screen reader only, as on the Screen (design.md Board
 * tile, F178). The server refuses it anyway.
 */
export function HostBoard({ board, command }: HostBoardProps) {
  const done = boardDone(board);
  const rows = Math.max(0, ...board.columns.map((column) => column.tiles.length));
  return (
    <section aria-label="Category board" className="flex flex-col gap-3">
      {/* A section head in Antonio capitals (design.md Rules). */}
      <p className="font-display text-[28px] leading-none text-ink uppercase">
        {done ? 'Board finished' : 'Pick a tile'}
      </p>
      <div
        style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${rows}, 4rem)` }}
        className="grid items-stretch gap-1.5"
      >
        {board.columns.map((column, c) => (
          <Fragment key={c}>
            {/* A row head in Sofia Sans 700 (design.md Rules: labels and table heads). */}
            <h3 className="flex min-w-0 items-center font-sans text-base leading-tight font-bold break-words text-ink">
              {column.title}
            </h3>
            {column.tiles.map((tile, r) => (
              <button
                key={r}
                type="button"
                onClick={() => command.run('host:pick', { questionIndex: tile.questionIndex })}
                disabled={tile.used || command.busy}
                className={`min-h-12 rounded-control font-sans text-2xl font-extrabold tabular-nums inset-ring-2 inset-ring-edge not-disabled:hover:inset-ring-accent not-disabled:active:translate-y-px ${
                  tile.used ? 'bg-shade' : 'bg-surface text-accent'
                }`}
              >
                <span className="sr-only">{column.title},</span>{' '}
                {tile.used ? <span className="sr-only">{tile.points}, played</span> : tile.points}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
      {done && (
        // After a Previous from the last tile nothing is left to pick (DECISIONS F89).
        <p role="note" className="text-ink-2">
          Every tile has been played. End the game to show the final results.
        </p>
      )}
    </section>
  );
}

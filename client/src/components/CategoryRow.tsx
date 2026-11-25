import type { MouseEventHandler, ReactNode } from 'react';
import { LEVEL_PILL } from '../lib/ui.js';

// The set library's row and level cells (F139, F149), shared by `/sets` Built-in (SetBrowser's
// catalogue) and the pickers (CategoryPicker): one row per category of a ruled listing (`RULED`,
// hairlines between rows), each row on the well with a round level pill per level (F181).

interface CategoryRowProps {
  /** The id of the row's name, which labels the row. */
  headingId: string;
  /** The element the name is: a heading on `/sets`, plain text in a picker's radio group. */
  nameAs?: 'h2' | 'h3' | 'span';
  emoji: string;
  name: string;
  /** The line under the name: the question total. */
  meta: ReactNode;
  /** The level tiles. */
  children: ReactNode;
  /** What the chosen level offers (Host, Preview, `⋯` on `/sets`). */
  actions?: ReactNode;
  /** A click on the row outside its tiles: the picker's shortcut to a level. */
  onClick?: MouseEventHandler<HTMLDivElement>;
  /** The picker's one chosen row turns well-2, the cursor row of its list (`12` F181). */
  markChosen?: boolean;
}

/**
 * A category: its emoji, name and question total, its level cells, then any actions. In a narrow
 * container the name and the cells (E, M, H) share one line when the name's longest word fits beside
 * them, else the cells drop under it; the actions take the next line. From 42rem of container all
 * three are one line and the cells name their level.
 */
export function CategoryRow({
  headingId,
  nameAs: Name = 'span',
  emoji,
  name,
  meta,
  children,
  actions,
  onClick,
  markChosen = false,
}: CategoryRowProps) {
  return (
    // A pointer shortcut only: the cells' radios are the keyboard's way in.
    <div
      role="group"
      aria-labelledby={headingId}
      onClick={onClick}
      // It hugs its content: no minimum height. Narrow, a wrapping flex row: the name never breaks
      // inside a word, so when its longest word and the pills can't share the line, the pills drop
      // under it (F181). From 42rem, the grid.
      className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 bg-surface px-3 py-2.5 @2xl:grid ${
        markChosen ? 'has-checked:bg-bg-deep' : ''
      } ${
        // From 64rem the name column fits the longest built-in name on one line (F152).
        actions
          ? '@2xl:grid-cols-[13rem_minmax(0,1fr)_auto] @5xl:grid-cols-[16rem_minmax(0,1fr)_auto]'
          : '@2xl:grid-cols-[13rem_minmax(0,1fr)] @5xl:grid-cols-[16rem_minmax(0,1fr)]'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Narrow, it grows from nothing but never below its longest word (`min-w-min`). */}
      <div className="flex min-w-min grow basis-0 items-center gap-2 @2xl:min-w-0 @2xl:gap-2.5">
        <span
          aria-hidden="true"
          className="w-6 shrink-0 text-center text-xl leading-none @2xl:w-8 @2xl:text-2xl"
        >
          {emoji}
        </span>
        <span className="flex min-w-0 flex-col">
          {/* Data in a ruled table, so Sofia Sans, not the display face (design.md Rules). */}
          <Name
            id={headingId}
            className="font-sans text-base leading-tight font-semibold tracking-normal break-words font-stretch-normal @2xl:text-lg"
          >
            {name}
          </Name>
          <span className="font-sans text-sm font-semibold text-muted">{meta}</span>
        </span>
      </div>
      {children}
      {actions && (
        <div className="col-span-2 flex min-w-0 basis-full flex-wrap items-center gap-2 @2xl:col-span-1 @2xl:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
}

interface LevelTileProps {
  /** The radio group's name: one per row on `/sets`, one for the whole picker. */
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  /** The radio's name: the set's title, so each level is told apart by what it hosts. */
  title: string;
  /** "Easy", "Medium", "Hard" or "None". */
  level: string;
  /** The level's question count and any Draft note: read with the radio, not drawn in the pill. */
  sub?: ReactNode;
  className?: string;
}

/**
 * A level's word: in a narrow container only its initial shows, drawn from `data-initial`, so the
 * text (and every reader of it) stays "Easy"; from 42rem, the word itself. Sofia Sans 700 both ways.
 */
export const LEVEL_WORD =
  'font-sans text-[0px] leading-tight font-bold before:text-base before:leading-none before:content-[attr(data-initial)] @2xl:text-base @2xl:before:content-none';

/** One level of a category as a round pill around a native radio: its initial in a narrow container, its name from 42rem. */
export function LevelTile({
  name,
  value,
  checked,
  onChange,
  title,
  level,
  sub,
  className = '',
}: LevelTileProps) {
  return (
    <label
      className={`${LEVEL_PILL} flex size-11 items-center justify-center @2xl:h-11 @2xl:w-auto @2xl:px-4 ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        aria-label={title}
        className="sr-only"
      />
      <span data-initial={level[0]} className={LEVEL_WORD}>
        {level}
      </span>
      {/* The pill draws the level alone (`sets-pickers-editor.png`); the chosen level's line sits by its actions. */}
      {sub && <span className="sr-only">{sub}</span>}
    </label>
  );
}

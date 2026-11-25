import { HOVER } from './hover.js';

// Class strings for the Marquee building blocks (design.md Controls), shared by every surface. Full
// strings, so Tailwind can see them. Sizes are for the phone and desktop pages; the Screen adds its
// own. Buttons are Antonio 700 capitals (font-display) on a 54px block with a hard key edge;
// labels and fields are Sofia Sans (font-sans); DotGothic16 (font-outlier) is for figures of 40px
// and up. Radii are 2px; pills are round.

/** A tile: the well, no border and no shadow. */
export const CARD = 'rounded-card bg-surface p-6';

/**
 * A tile or level cell you choose, around a sr-only radio or checkbox: a 2px rule outline inside the
 * box on the well-2, and once chosen it turns the blue answer with ground type (design.md Controls,
 * Chosen). Hover tints at once; nothing tweens. Level cells, picker tiles, board categories.
 */
export const CHOICE_TILE =
  'cursor-pointer rounded-control bg-bg-deep inset-ring-2 inset-ring-edge text-ink not-has-checked:not-has-disabled:hover:hover-tint has-checked:bg-accent-2 has-checked:text-accent-2-ink has-checked:inset-ring-accent-2 has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-focus has-disabled:cursor-default has-disabled:opacity-40';

/** A ruled listing: a 4px ink bar over it and a hairline under each row. /sets and the pickers (F149); F181 restyles it. */
export const RULED =
  'flex flex-col border-t-4 border-ink divide-y divide-edge border-b border-b-edge';

/** A small label ("First to buzz", "Also buzzed", a category line): Sofia Sans, sentence case, untracked, muted. 14px: the floor (F92). */
export const LABEL = 'font-sans text-sm font-semibold text-muted';

/** A field's label ("Question", "Mode", "Choices"): Sofia Sans in ink, sentence case (F150). */
export const FIELD_LABEL = 'font-sans font-semibold text-ink';

/** A status badge in a row ("Needs review", "Live", "Added"): a round well-2 pill with no border; the caller adds its state colour (F141). */
export const BADGE =
  'shrink-0 rounded-pill bg-bg-deep px-2 font-sans text-sm font-semibold whitespace-nowrap';

/** An admin figure (a count, a dollar sum): the display face in tabular figures, so columns of them line up (F141). F183 sets them in DotGothic16. */
export const FIGURE = 'font-display font-black font-stretch-150% tabular-nums';

/** A chip: the well and a 2px rule border, round. */
export const PILL = 'rounded-pill border-2 border-edge bg-surface';

/** A text link or link-styled button, 44px tall to tap: Back to start, Cancel (FND-05). Sofia Sans 700 in ink, a 2px blue underline at 60% that goes solid on hover. */
export const LINK =
  'inline-flex min-h-11 items-center font-bold text-ink underline decoration-accent-2/60 decoration-2 underline-offset-4 not-disabled:hover:decoration-accent-2 disabled:opacity-40';

/** The text input of the join and name forms: 56px, well-2, a 1px muted border; an error takes a 2px stop border. */
export const INPUT =
  'min-h-14 w-full rounded-control border border-muted bg-bg-deep px-4 py-3 font-sans text-ink aria-invalid:border-2 aria-invalid:border-stop';

/** Antonio 700 in capitals, untracked, 54px tall: the type and height of every button (design.md Controls). */
const CONTROL = 'min-h-[54px] rounded-control font-display leading-none uppercase';
/** Size s (phones, row buttons): 20px type, 16px padding. */
const SIZE_S = 'px-4 text-xl';
/** Size s on a phone, Size m (28px type, 32px padding) from the tablet up. */
const SIZE_SM = 'px-4 text-xl md:px-8 md:text-[28px]';

/**
 * The key edge (design.md Rules, Depth): a hard drop straight down, no blur. Hover lifts the block
 * 2px and pressing slams it onto a 1px edge; only `translate` tweens. Disabled, it goes well-2 with
 * muted type and no edge.
 */
const PRESS =
  'transition-[translate] duration-(--dur-micro) ease-(--ease-out) not-disabled:hover:-translate-y-0.5 not-disabled:active:translate-y-[5px] disabled:translate-y-0 disabled:border-transparent disabled:bg-bg-deep disabled:text-muted disabled:shadow-none';
const PRIMARY_EDGE =
  'shadow-[0_var(--edge-key)_0_var(--color-lead-deep)] not-disabled:hover:shadow-[0_calc(var(--edge-key)+2px)_0_var(--color-lead-deep)] not-disabled:active:shadow-[0_var(--edge-press)_0_var(--color-lead-deep)]';
const SECONDARY_EDGE =
  'shadow-[0_var(--edge-key)_0_var(--color-rule)] not-disabled:hover:shadow-[0_calc(var(--edge-key)+2px)_0_var(--color-rule)] not-disabled:active:shadow-[0_var(--edge-press)_0_var(--color-rule)]';
/** Primary: amber with ground type on the lead-deep edge. One per screen. */
const PRIMARY_TONE = `bg-accent text-accent-ink ${PRIMARY_EDGE} ${PRESS}`;
const PRIMARY = `${CONTROL} ${PRIMARY_TONE}`;
/** Secondary: the well, a 2px amber outline, amber type, the rule edge; chosen (`aria-pressed`), it turns blue with ground type. */
const SECONDARY_TONE = `border-2 border-accent bg-surface text-accent ${SECONDARY_EDGE} aria-pressed:border-accent-2 aria-pressed:bg-accent-2 aria-pressed:text-accent-2-ink ${PRESS}`;
const SECONDARY = `${CONTROL} ${SECONDARY_TONE}`;

/** The primary: Join, Host a game, Start game, Next question. */
export const BUTTON_PRIMARY = `${PRIMARY} ${SIZE_SM} py-3`;

/**
 * Landing's two actions, Join and Host a game: one column class, so neither outweighs the other
 * (F134). F175 recomposes Landing on the marquee sign.
 */
export const LANDING_ACTION = 'flex flex-col gap-4';
/** Join: the primary. */
export const LANDING_BUTTON = `${PRIMARY} ${SIZE_SM} py-3`;
/** Host a game: the secondary at Join's size (design.md Controls). */
export const LANDING_BUTTON_LINE = `${SECONDARY} ${SIZE_SM} py-3`;

/** `BUTTON_PRIMARY` at Size s, for the set pages' rows: a set card's Host (LIB-02). */
export const BUTTON_PRIMARY_SMALL = `${PRIMARY} ${SIZE_S} py-2`;

/** The secondary at the primary's size: Save to My sets. */
export const BUTTON_OUTLINE = `${SECONDARY} ${SIZE_SM} py-3`;

/** The primary and the secondary without their size: the Screen sizes its own in cqw for the sofa (F146). */
export const SCREEN_BUTTON_PRIMARY = PRIMARY;
export const SCREEN_BUTTON_OUTLINE = SECONDARY;
/**
 * The primary's and the secondary's colours, edge and press without the 54px block: the Screen's
 * host bar keeps M33's sizes and takes only the look (`12` § Open 3, F177).
 */
export const SCREEN_BAR_PRIMARY = `border-2 border-accent ${PRIMARY_TONE}`;
export const SCREEN_BAR_OUTLINE = SECONDARY_TONE;

/** The set pages' row buttons, the secondary at Size s: Edit, Duplicate, Preview, Export JSON. */
export const BUTTON_SMALL = `${SECONDARY} ${SIZE_S} py-2`;

/** A 44×44 square holding one `Icon`: a drag grip, a `⋯` trigger, a Remove ×. Name it with `aria-label`. */
export const BUTTON_ICON = `flex min-h-11 min-w-11 items-center justify-center rounded-control border-2 border-edge bg-surface text-ink not-disabled:active:bg-bg-deep disabled:opacity-40 ${HOVER}`;

/**
 * The look of an action that can't be taken back, before it is armed: stop-red type, and a stop
 * border under the pointer. For a button shape of its own; never together with `HOVER`, whose ink
 * border would fight the red one.
 */
export const DANGER = 'text-stop not-disabled:hover:border-stop not-disabled:hover:hover-tint';

/** A small destructive button: Delete, Kick, in a 2px stop outline (design.md Controls, Danger). Keep its `ConfirmButton` and put it last in its row. */
export const BUTTON_DANGER = `${CONTROL} ${SIZE_S} py-2 border-2 border-stop bg-transparent ${DANGER} disabled:opacity-40`;

/** A text field or select on the set pages and the game builder: 56px, well-2, a 1px muted border; an error takes a 2px stop border. */
export const FIELD =
  'min-h-14 w-full rounded-control border border-muted bg-bg-deep px-3 py-2 font-sans text-lg text-ink disabled:opacity-40 aria-invalid:border-2 aria-invalid:border-stop';

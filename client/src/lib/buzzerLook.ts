import type { BuzzerKind } from './buzzerState.js';

/**
 * How the amber buzzer in its bulb ring draws one state (`docs/ux/12` § The buzzer). Play.tsx writes
 * these onto the button as `data-cap`, `data-bulb`, `data-tone` and `data-mark`, and `.lit-buzzer`
 * in index.css draws them: only the button's translate and the bulbs' opacity ever animate.
 */
export interface BuzzerLook {
  /** Raised on its lead-deep key edge and pressable, or slammed down onto it. */
  cap: 'up' | 'down';
  /** The ring of 22 bulbs: all dark, chasing (alternate bulbs) while it takes a buzz, or all lit. */
  bulb: 'off' | 'breathe' | 'on';
  /** The amber button (`red`, the name kept from Lit), drained to well-2, or amber at 40%. */
  tone: 'red' | 'drained' | 'dim';
  /** A 6px stop ring round the button (too early), or a 6px ink X over its face (locked out). */
  mark: 'none' | 'warn' | 'x';
}

const look = (
  cap: BuzzerLook['cap'],
  bulb: BuzzerLook['bulb'],
  tone: BuzzerLook['tone'] = 'red',
  mark: BuzzerLook['mark'] = 'none',
): BuzzerLook => ({ cap, bulb, tone, mark });

/**
 * Every kind's look. `null`: the buzzer is not drawn, as the choice tiles, the text box, the
 * answer card or the final result take its place.
 */
export const BUZZER_LOOK: Record<BuzzerKind, BuzzerLook | null> = {
  // The lobby's test buzzer: up and pressable, the ring dark; each press lights it once (Play.tsx).
  practice: look('up', 'off'),
  // A false-start press is still taken while `live`; it then turns `early`.
  idle: look('down', 'off', 'drained'),
  live: look('up', 'breathe'),
  pressed: look('down', 'on'),
  // The answer countdown sits under it as a figure (Play.tsx).
  won: look('down', 'on'),
  early: look('down', 'off', 'drained', 'warn'),
  lost: look('up', 'off', 'dim'),
  out: look('down', 'off', 'drained', 'x'),
  // The answer card stands alone at reveal (`12` § The buzzer; F159).
  revealed: null,
  choice: null,
  typed: null,
  final: null,
};

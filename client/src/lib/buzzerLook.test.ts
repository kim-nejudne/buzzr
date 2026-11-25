import { describe, expect, it } from 'vitest';
import css from '../index.css?raw';
import { contrast } from '../test/oklch.js';
import { BUZZER_LOOK } from './buzzerLook.js';
import type { BuzzerKind } from './buzzerState.js';

const KINDS: BuzzerKind[] = [
  'idle',
  'choice',
  'typed',
  'practice',
  'early',
  'live',
  'pressed',
  'won',
  'lost',
  'out',
  'revealed',
  'final',
];

describe('BUZZER_LOOK', () => {
  it('has an entry for every kind, and no others', () => {
    expect(Object.keys(BUZZER_LOOK).sort()).toEqual([...KINDS].sort());
  });

  // docs/ux/12 § The buzzer, row by row.
  it.each([
    ['practice', 'up', 'off', 'red', 'none'],
    ['idle', 'down', 'off', 'drained', 'none'],
    ['live', 'up', 'breathe', 'red', 'none'],
    ['pressed', 'down', 'on', 'red', 'none'],
    ['won', 'down', 'on', 'red', 'none'],
    ['early', 'down', 'off', 'drained', 'warn'],
    ['lost', 'up', 'off', 'dim', 'none'],
    ['out', 'down', 'off', 'drained', 'x'],
  ] as const)('%s: cap %s, bulb %s, %s, mark %s', (kind, cap, bulb, tone, mark) => {
    expect(BUZZER_LOOK[kind]).toEqual({ cap, bulb, tone, mark });
  });

  it('draws no buzzer where the choices, the text box, the answer card or the final result replace it', () => {
    expect(BUZZER_LOOK.revealed).toBeNull();
    expect(BUZZER_LOOK.choice).toBeNull();
    expect(BUZZER_LOOK.typed).toBeNull();
    expect(BUZZER_LOOK.final).toBeNull();
  });

  it('only the open buzzer breathes, and only a pressed or winning one is lit', () => {
    const with_ = (bulb: string) => KINDS.filter((kind) => BUZZER_LOOK[kind]?.bulb === bulb).sort();
    expect(with_('breathe')).toEqual(['live']);
    expect(with_('on')).toEqual(['pressed', 'won']);
  });
});

/** The body of the first rule in index.css whose selector is exactly `selector`. */
function rule(selector: string, from = css): string {
  const at = from.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no rule ${selector}`);
  return from.slice(at, from.indexOf('}', at));
}

describe('the amber buzzer in its bulb ring (index.css, 12 § The buzzer)', () => {
  const buzzer = css.slice(css.indexOf('  .lit-buzzer {'));

  it('prints BUZZ in ground type on the amber button, 11:1 or better', () => {
    expect(rule('.lit-buzzer')).toContain('color: var(--color-accent-ink)');
    expect(rule('.lit-buzzer')).toContain('--cap: var(--color-accent)');
    expect(rule('.lit-buzzer-cap')).toContain('background: var(--cap)');
    expect(contrast('accent-ink', 'accent')).toBeGreaterThanOrEqual(11);
  });

  it('animates only the button’s translate and the bulbs’ opacity', () => {
    const transitions = [...buzzer.matchAll(/transition(?:-property)?:\s*([^;]+);/g)].map(
      (match) => match[1]!.trim().split(/\s+/)[0],
    );
    expect(transitions).toEqual(['translate', 'none']);
    const chase = rule('@keyframes bulb-chase');
    expect(chase.match(/[a-z-]+(?=:)/g)!.every((property) => property === 'opacity')).toBe(true);
    expect(rule("  .lit-buzzer[data-bulb='breathe'] .lit-buzzer-bulb::after")).toContain(
      'animation: bulb-chase 1s steps(1) infinite',
    );
    // Alternate bulbs: the odd ones half a period out.
    expect(
      rule(".lit-buzzer[data-bulb='breathe'] .lit-buzzer-bulb:nth-child(odd)::after"),
    ).toContain('animation-delay: -0.5s');
  });

  it('holds the chase still, in its alternate pattern, under reduced motion', () => {
    const reduced = buzzer.slice(buzzer.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(rule(".lit-buzzer[data-bulb='breathe'] .lit-buzzer-bulb::after", reduced)).toContain(
      'animation: none',
    );
    expect(
      rule(".lit-buzzer[data-bulb='breathe'] .lit-buzzer-bulb:nth-child(odd)::after", reduced),
    ).toContain('opacity: 1');
    expect(rule('.lit-buzzer-cap', reduced)).toContain('transition: none');
  });

  it('draws each tone, mark and lit state from the data attributes', () => {
    expect(rule(".lit-buzzer[data-tone='drained']")).toContain('--cap: var(--color-paper-3)');
    expect(rule(".lit-buzzer[data-tone='drained']")).toContain('color: var(--color-muted)');
    expect(rule(".lit-buzzer[data-tone='dim']")).toContain('var(--color-accent) 40%');
    expect(rule(".lit-buzzer[data-mark='warn'] .lit-buzzer-cap")).toContain(
      '0 0 0 10px var(--color-stop)',
    );
    expect(rule(".lit-buzzer[data-mark='x'] .lit-buzzer-cap::after")).toContain('var(--color-ink)');
    expect(css).toMatch(
      /\.lit-buzzer\[data-bulb='on'\] \.lit-buzzer-bulb::after,[^{]*\{\s*opacity: 1/,
    );
    expect(rule(".lit-buzzer[data-cap='up'] .lit-buzzer-cap")).toContain('translate: 0 -4px');
  });
});

import { describe, expect, it } from 'vitest';
import tokensCss from './tokens.css?raw';
import { contrast, tokenHex } from './test/oklch.js';

describe('Marquee tokens (design.md)', () => {
  // design.md Tokens, Contrast: the pairs the app paints.
  it.each([
    ['ink', 'paper', 4.5],
    ['ink', 'paper-2', 4.5],
    ['ink', 'paper-3', 4.5],
    ['muted', 'paper', 4.5],
    ['muted', 'paper-3', 4.5],
    ['accent', 'paper', 4.5],
    ['accent-2', 'paper', 4.5],
    ['stop', 'paper', 4.5],
    ['accent-ink', 'accent', 4.5],
    ['accent-2-ink', 'accent-2', 4.5],
    ['stop-ink', 'stop', 4.5],
    ['buzz-ink', 'buzz', 4.5],
    ['win-ink', 'win', 4.5],
    ['card-ink', 'card', 4.5],
    ['focus', 'paper', 3],
  ])('%s on %s clears %s:1', (fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it('never puts light type on stop red', () => {
    expect(contrast('ink', 'stop')).toBeLessThan(4.5);
  });

  it('converts oklch to the hex a browser paints (warm-black ground, cream ink, amber, blue, stop)', () => {
    expect(tokenHex('paper')).toBe('#0f0703');
    expect(tokenHex('ink')).toBe('#f5eee0');
    expect(tokenHex('accent')).toBe('#feb41f');
    expect(tokenHex('accent-2')).toBe('#4c99f8');
    expect(tokenHex('stop')).toBe('#ed4b40');
  });

  it('maps the game states onto the two inks and stop: buzz is amber, win blue, warn stop', () => {
    expect(tokenHex('buzz')).toBe(tokenHex('accent'));
    expect(tokenHex('buzz-deep')).toBe(tokenHex('lead-deep'));
    expect(tokenHex('win')).toBe(tokenHex('accent-2'));
    expect(tokenHex('focus')).toBe(tokenHex('accent-2'));
    expect(tokenHex('warn')).toBe(tokenHex('stop'));
  });

  it('carries the new roles', () => {
    for (const name of ['lead-deep', 'bulb-off', 'shade', 'stop', 'stop-ink'])
      expect(() => tokenHex(name)).not.toThrow();
  });

  it('is dark, flat, 2px square with round pills, and blends nothing', () => {
    for (const radius of ['card', 'control'])
      expect(tokensCss).toContain(`--radius-${radius}: 2px;`);
    expect(tokensCss).toContain('--radius-pill: 999px;');
    expect(tokensCss).toContain('--shadow-card: none;');
    expect(tokensCss).toContain('color-scheme: dark;');
    expect(tokensCss).toContain('--blend: normal;');
  });

  it('names the three Fontsource faces', () => {
    expect(tokensCss).toContain("--font-display: 'Antonio'");
    expect(tokensCss).toContain("--font-body: 'Sofia Sans Variable'");
    expect(tokensCss).toContain("--font-outlier: 'DotGothic16'");
  });
});

import { describe, expect, it } from 'vitest';
import html from '../index.html?raw';
import svgSource from '../public/favicon.svg?raw';
import { tokenHex } from './test/oklch.js';

describe('Favicon', () => {
  const svg = svgSource.toLowerCase();

  it('index.html links the SVG icon, so browsers do not ask for /favicon.ico', () => {
    const link = /<link\b[^>]*\brel="icon"[^>]*>/.exec(html)?.[0];
    expect(link).toContain('href="/favicon.svg"');
    expect(link).toContain('type="image/svg+xml"');
  });

  it('is an amber B in a ring of bulbs on the ground, in the theme colours', () => {
    expect(svg).toContain(`<rect width="64" height="64" rx="2" fill="${tokenHex('paper')}"`);
    expect(svg.match(new RegExp(`<circle [^>]*fill="${tokenHex('accent')}"`, 'g'))).toHaveLength(8);
    expect(svg.match(new RegExp(`<circle [^>]*fill="${tokenHex('bulb-off')}"`, 'g'))).toHaveLength(
      4,
    );
    expect(svg).toMatch(new RegExp(`<path [^>]*fill="${tokenHex('accent')}"`));
  });

  it('colours the browser chrome with the ground', () => {
    expect(html).toContain(`<meta name="theme-color" content="${tokenHex('paper')}" />`);
  });
});

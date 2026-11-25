import { HOVER } from '../lib/hover.js';
import { DANGER } from '../lib/ui.js';

/**
 * The labels of buttons under `root` with no hover style at all (FND-06): the Host remote and the
 * Player, whose buttons use `HOVER`, `DANGER`, a primary or outline button's own hover, or a tint.
 * The buzzer is left out: it is pressed, never hovered. Throws on a page with no button.
 */
export function buttonsWithNoHover(root: ParentNode = document.body): string[] {
  const buttons = [...root.querySelectorAll<HTMLElement>('button')].filter(
    (el) => el.textContent !== 'BUZZ',
  );
  if (buttons.length === 0) throw new Error('no buttons to check');
  return buttons
    .filter((el) => !/(^|\s)(not-disabled:)?hover:/.test(el.className))
    .map((el) => el.getAttribute('aria-label') ?? el.textContent ?? '');
}

/**
 * The labels of buttons under `root` without the F44 hover style. Text-link buttons keep their own
 * `hover:text-ink` (a set card's title, `hover:underline`), `LINK` its blue underline, destructive ones the stop `DANGER` hover (F92), and the primary and
 * secondary buttons their key-edge lift (F174). Throws when there is no button at all, so a test cannot pass on an empty page.
 */
export function buttonsWithoutHover(root: ParentNode = document.body): string[] {
  const buttons = [...root.querySelectorAll<HTMLElement>('button, a[href]')].filter(
    (el) => el.tagName === 'BUTTON' || el.className.includes('border-2'),
  );
  if (buttons.length === 0) throw new Error('no buttons to check');
  return buttons
    .filter(
      (el) =>
        !el.className.includes(HOVER) &&
        !el.className.includes(DANGER) &&
        !el.className.includes('hover:text-ink') &&
        !el.className.includes('hover:underline') &&
        !el.className.includes('hover:decoration-accent-2') &&
        // The primary and secondary buttons lift off their key edge (design.md Rules, F174).
        !el.className.includes('not-disabled:hover:-translate-y-0.5') &&
        // Surfaces not yet recomposed keep the gold primary's hover (F94).
        !/not-disabled:hover:(bg|border)-accent-hover/.test(el.className),
    )
    .map((el) => el.getAttribute('aria-label') ?? el.textContent ?? '');
}

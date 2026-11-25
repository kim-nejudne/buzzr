import { usePointerCoarse } from '../lib/usePointerFine.js';

/**
 * The Screen's first-load overlay (UI spec, Screen view). Browsers only start audio and
 * fullscreen from a user gesture, so one click (or Enter/Space) does both.
 */
export function StartOverlay({ onStart }: { onStart: () => void }) {
  // A laptop on a TV clicks; a tablet used as the Screen taps (FND-08).
  const start = usePointerCoarse() ? 'Tap to start' : 'Click to start';
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={start}
      className="fixed inset-0 z-50"
      // Keys pressed here start the Screen; they must not also reach the host shortcuts behind it.
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        autoFocus
        onClick={onStart}
        // The start gate: the word in Antonio capitals on amber, on its lead-deep key edge, the
        // small print under the 4px rule. Hover turns the block blue at once. The focus frame sits
        // inside the block (outside, the window's edges clip it), and the gate itself goes to the well.
        className="group flex size-full flex-col items-center justify-center gap-[4vh] bg-bg px-4 text-center focus-visible:bg-surface focus-visible:outline-none"
      >
        <span className="rounded-control bg-accent px-[0.4em] py-[0.25em] font-display text-[clamp(3rem,8vw,16vh)] leading-none text-accent-ink uppercase shadow-[0_var(--edge-key)_0_var(--color-lead-deep)] group-hover:bg-accent-2 group-hover:shadow-[0_var(--edge-key)_0_var(--color-rule)] group-focus-visible:outline-4 group-focus-visible:-outline-offset-[0.12em] group-focus-visible:outline-accent-ink">
          {start}
        </span>
        <span className="border-t-4 border-edge pt-[1.5vh] font-sans text-[clamp(1rem,2.2vw,4.4vh)] font-semibold text-muted">
          Turns on sound and fullscreen
        </span>
      </button>
    </div>
  );
}

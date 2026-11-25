import { useState } from 'react';
import { useNavigate } from 'react-router';
import { HEADING } from '../lib/ui.js';
import { JoinAddress } from './JoinAddress.js';
import { usePointerFine } from '../lib/usePointerFine.js';

type Option = 'screen' | 'elsewhere' | 'remote' | 'phoneOnly';

const OPTIONS: Record<Option, { title: string; hint: string }> = {
  screen: { title: 'This is the Screen', hint: 'Show questions on this device' },
  elsewhere: { title: 'Screen elsewhere', hint: 'Open the Screen on a TV or laptop' },
  remote: { title: 'Host remote', hint: 'Control the game from this phone' },
  phoneOnly: { title: 'Phone only', hint: 'No TV: run everything from here' },
};

/** A laptop is most likely the Screen; a phone, the remote (LND-05). The first is the amber card. */
const MOUSE_ORDER: readonly Option[] = ['screen', 'elsewhere', 'remote', 'phoneOnly'];
const TOUCH_ORDER: readonly Option[] = ['remote', 'phoneOnly', 'screen', 'elsewhere'];

// Option cards (`sets-pickers-editor.png`, F181): the first amber with ground type, the others the
// well on a 2px rule edge. Hover tints at once and a press sinks; nothing tweens (design.md Motion).
const OPTION_CARD =
  'flex min-h-11 flex-col rounded-control p-4 text-left not-disabled:hover:hover-tint';

/** Creating and joining a room, step 2: once the room exists, ask where the Screen is. */
export function RoomCreated({ code }: { code: string }) {
  const navigate = useNavigate();
  const pointerFine = usePointerFine();
  const [showScreenUrl, setShowScreenUrl] = useState(false);
  const screenUrl = `${window.location.origin}/screen/${code}`;

  const actions: Record<Option, () => void> = {
    screen: () => void navigate(`/screen/${code}`),
    elsewhere: () => setShowScreenUrl((shown) => !shown),
    // hostSet already kept the hostToken (saveHostToken), so the remote joins without a pairing hash.
    remote: () => void navigate(`/host/${code}`),
    // The remote stores the read-aloud choice for this tab and drops `?read=1` (F69).
    phoneOnly: () => void navigate(`/host/${code}?read=1`),
  };
  const order = pointerFine ? MOUSE_ORDER : TOUCH_ORDER;

  return (
    <section
      aria-labelledby="host-heading"
      // On the paper, not a tile: its options are the tiles (F139).
      className="@container/room flex flex-col gap-4"
    >
      <h2 id="host-heading" className={HEADING}>
        Room created
      </h2>
      {/* The code in four DotGothic tiles (design.md Controls, Room code); read once, as a word. */}
      <p>
        <span className="sr-only">{code}</span>
        <span aria-hidden="true" className="grid w-full max-w-[22.25rem] grid-cols-4 gap-3">
          {[...code].map((letter, index) => (
            <span
              key={index}
              className="flex aspect-square items-center justify-center rounded-control border-2 border-edge bg-shade font-outlier text-5xl leading-none text-accent sm:text-6xl"
            >
              {letter}
            </span>
          ))}
        </span>
      </p>
      {/* Two to a row from the card's own width, four from 56rem: Landing and Sets give it different widths (B01). */}
      <div className="grid gap-3 @xl/room:grid-cols-2 @4xl/room:grid-cols-4">
        {order.map((option, index) => {
          const { title, hint } = OPTIONS[option];
          const primary = index === 0;
          return (
            <button
              key={option}
              type="button"
              onClick={actions[option]}
              aria-labelledby={`room-${option}`}
              aria-describedby={`room-${option}-hint`}
              aria-expanded={option === 'elsewhere' ? showScreenUrl : undefined}
              className={`${OPTION_CARD} ${
                primary
                  ? 'bg-accent text-accent-ink active:bg-lead-deep'
                  : 'border-2 border-edge bg-surface text-ink active:bg-bg-deep'
              }`}
            >
              <span id={`room-${option}`} className="font-display text-2xl leading-tight uppercase">
                {title}
              </span>
              <span
                id={`room-${option}-hint`}
                className={`text-base ${primary ? '' : 'text-muted'}`}
              >
                {hint}
              </span>
            </button>
          );
        })}
      </div>
      {showScreenUrl && (
        <p className="text-lg font-semibold text-muted">
          On the TV device, open{' '}
          <strong className="text-ink">
            <JoinAddress url={screenUrl} />
          </strong>
          <br />
          Room code{' '}
          <strong className="font-extrabold tracking-widest text-ink tabular-nums">{code}</strong>
        </p>
      )}
    </section>
  );
}

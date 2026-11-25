import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { PAIRING_PIN_LENGTH } from '../../../shared/constants.js';
import { pairWithPin } from '../lib/api.js';
import { BUTTON_PRIMARY, LABEL, LINK } from '../lib/ui.js';

interface HostPinEntryProps {
  code: string;
  /** The server traded the PIN for the room's hostToken. The page then joins as host with it. */
  onPaired: (hostToken: string) => void;
}

/**
 * `/host/:code` on a device with no token: type the PIN shown beside the pairing QR (Creating and
 * joining a room, step 3; F70). Nothing secret is on this page, and no socket opens until the server
 * hands back a token.
 */
const PIN_TILES = Array.from({ length: PAIRING_PIN_LENGTH }, (_, index) => index);

export function HostPinEntry({ code, onPaired }: HostPinEntryProps) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = pin.length === PAIRING_PIN_LENGTH && !busy;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    pairWithPin(code, pin).then(onPaired, (err: unknown) => {
      setBusy(false);
      setPin('');
      setError(err instanceof Error ? err.message : String(err));
    });
  }

  return (
    // Top-aligned on a phone, so an on-screen keyboard leaves Pair in view; centred from `md`. On a
    // short screen (a phone with the keyboard up, or sideways) the form tightens (HST-08). The form
    // sits on the ground, as the phone's join form does (F135).
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6 md:justify-center short:gap-3 short:py-3">
      <form
        onSubmit={submit}
        aria-labelledby="pin-heading"
        className="flex w-full flex-col gap-4 short:gap-3"
      >
        <h1 id="pin-heading" className="text-[44px] leading-none text-accent uppercase">
          Pair this phone
        </h1>
        <p className="text-lg text-ink-2">
          On the Screen, tap <strong className="text-ink">Pair host phone</strong>, then type the
          PIN shown beside the QR. Room {code}.
        </p>
        <label htmlFor="pairing-pin" className={LABEL}>
          Pairing PIN
        </label>
        {/* One input, drawn as six code tiles (design.md Controls, Room code), as Landing's join:
            shade with a rule edge and DotGothic amber figures, the tile still to fill in blue. */}
        <div className="relative grid grid-cols-6 gap-1.5 has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-focus">
          <input
            id="pairing-pin"
            value={pin}
            onChange={(event) =>
              setPin(event.target.value.replace(/\D/g, '').slice(0, PAIRING_PIN_LENGTH))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="go"
            maxLength={PAIRING_PIN_LENGTH}
            aria-invalid={error !== null}
            aria-describedby={error ? 'pin-error' : undefined}
            // 16px keeps iOS from zooming in on focus; the tiles show the figures.
            className="peer absolute inset-0 size-full cursor-text font-outlier text-base opacity-0"
          />
          {PIN_TILES.map((index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`flex h-16 items-center justify-center rounded-control bg-shade font-outlier text-[44px] leading-none text-accent ${
                index === pin.length
                  ? 'inset-ring-3 inset-ring-accent-2'
                  : error !== null
                    ? 'inset-ring-2 inset-ring-stop'
                    : 'inset-ring-2 inset-ring-edge'
              }`}
            >
              {pin[index]}
            </span>
          ))}
        </div>
        {error && (
          <p id="pin-error" role="alert" className="text-lg text-stop">
            {error}
          </p>
        )}
        <button type="submit" disabled={!ready} className={`${BUTTON_PRIMARY} w-full`}>
          {busy ? 'Pairing…' : 'Pair'}
        </button>
      </form>
      <Link to="/" className={`${LINK} self-start text-lg`}>
        Back to start
      </Link>
    </main>
  );
}

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { APP_NAME, ROOM_CODE_LENGTH } from '../../../shared/constants.js';
import { HostGame } from '../components/HostGame.js';
import { PageShell } from '../components/PageShell.js';
import { isCompleteRoomCode, normalizeRoomCode } from '../lib/roomCode.js';
import { LABEL, LANDING_ACTION, LANDING_BUTTON, LINK } from '../lib/ui.js';

const TILES = Array.from({ length: ROOM_CODE_LENGTH }, (_, index) => index);

export function Landing() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  // While Host a game's picker (or its created room) shows, it takes the Join form's place.
  const [hosting, setHosting] = useState(false);
  const ready = isCompleteRoomCode(code);

  function join(event: FormEvent) {
    event.preventDefault();
    if (ready) void navigate(`/play/${code}`);
  }

  return (
    <PageShell
      width="wide"
      // From the top, as the mock (F175): the open picker never moves its search box either.
      className={hosting ? '' : 'gap-10 short:gap-4 lg:pt-6'}
    >
      {/* The marquee sign (design.md Variants, Landing): BUZZR in amber on a bulb border, with the
          sentence beside it from lg. Under lg the bulbs frame the wordmark alone and the sentence
          sits under the sign. While hosting, the wordmark shrinks and the sign goes. */}
      <div
        className={
          hosting
            ? ''
            : 'flex flex-col gap-4 short:gap-2 lg:bulbs lg:flex-row lg:items-center lg:gap-12 lg:border lg:border-edge lg:px-12 lg:py-12'
        }
      >
        <h1
          className={`leading-none text-accent uppercase ${
            hosting
              ? 'text-4xl'
              : 'bulbs w-fit border border-edge px-7 py-8 text-[min(34vw,17.5rem)] lg:text-[min(22vw,17.5rem)] short:py-7 short:text-[min(15vw,18dvh)] lg:bulbs-none lg:border-0 lg:p-0'
          }`}
        >
          {APP_NAME}
        </h1>
        {!hosting && (
          <p className="max-w-[36ch] text-lg font-semibold text-ink lg:max-w-[23ch] lg:text-3xl">
            A game-show buzzer: questions on the TV, buzzers on your phones
          </p>
        )}
      </div>

      {/* The Join card, with Host a game and Question sets beside it from lg, under the sentence's
          column (F175). A landscape phone takes the same two columns, so Host a game sits at the
          fold (F158). The picker and the created room take this slot, across both columns. */}
      <div
        className={
          hosting
            ? 'grid gap-8 md:grid-cols-2'
            : 'grid items-start gap-6 lg:grid-cols-[13fr_7fr] [@media(orientation:landscape)_and_(max-height:500px)]:grid-cols-[13fr_7fr]'
        }
      >
        {!hosting && (
          <form
            onSubmit={join}
            aria-labelledby="join-heading"
            className={`${LANDING_ACTION} rounded-card border border-edge bg-surface p-4 sm:w-fit md:p-6`}
          >
            <h2 id="join-heading" className="sr-only">
              Join a game
            </h2>
            <label htmlFor="room-code" className={LABEL}>
              Room code
            </label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* The signature: one input, drawn as four code tiles (design.md Controls, Room code):
                  shade with a rule edge and DotGothic amber letters, the tile still to fill in blue. */}
              <div className="relative grid w-full max-w-[22.25rem] grid-cols-4 sm:w-[22.25rem] gap-3 has-focus-visible:outline-3 has-focus-visible:outline-offset-4 has-focus-visible:outline-focus">
                <input
                  id="room-code"
                  value={code}
                  onChange={(event) => setCode(normalizeRoomCode(event.target.value))}
                  placeholder="ABCD"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  maxLength={ROOM_CODE_LENGTH}
                  // 16px keeps iOS from zooming in on focus; the tiles show the letters.
                  className="peer absolute inset-0 size-full cursor-text text-base opacity-0"
                />
                {TILES.map((index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className={`flex aspect-square items-center justify-center rounded-control bg-shade font-outlier text-5xl leading-none text-accent sm:text-6xl ${
                      index === code.length
                        ? 'inset-ring-3 inset-ring-accent-2'
                        : 'inset-ring-2 inset-ring-edge'
                    }`}
                  >
                    {code[index]}
                  </span>
                ))}
              </div>
              <button
                type="submit"
                disabled={!ready}
                className={`${LANDING_BUTTON} w-full sm:w-auto sm:shrink-0`}
              >
                Join
              </button>
            </div>
          </form>
        )}

        <HostGame onOpenChange={setHosting}>
          <Link to="/sets" className={LINK}>
            Question sets
          </Link>
        </HostGame>
      </div>
    </PageShell>
  );
}

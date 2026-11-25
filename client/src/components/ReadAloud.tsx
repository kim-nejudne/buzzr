import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type { HostView } from '../../../shared/types.js';
import { imageUrl } from '../lib/api.js';
import { questionHeading } from '../lib/boardCursor.js';
import { displayUrl, isLoopbackHost, joinPageOrigin, joinUrl } from '../lib/joinUrl.js';
import { LABEL, LINK } from '../lib/ui.js';
import { useJoinOrigin } from '../lib/useJoinOrigin.js';
import { usePointerFine } from '../lib/usePointerFine.js';

// The remote's read-aloud layout (F69, UI spec Host remote): for a game run from one phone with no
// Screen, so the phone shows the join QR itself and the host reads each question out.

/** The lobby's join block: the address, its QR and the room code, for players to scan off the phone. */
export function ReadAloudJoin({ code }: { code: string }) {
  // The same origin rules as the Screen's lobby (DECISIONS F42).
  const joinOrigin = useJoinOrigin();
  const url = joinUrl(joinPageOrigin(joinOrigin ?? null, window.location), code);
  const unreachable = joinOrigin === null && isLoopbackHost(window.location.hostname);
  return (
    <section aria-label="Join" className="flex flex-col items-center gap-3 text-center">
      {/* The well on a rule edge, as the Screen's room board: the address, then the QR as ground
          modules on an ink card, so every phone camera reads it (design.md Controls, QR). */}
      <div className="flex flex-col items-center gap-3 rounded-card border-2 border-edge bg-card p-5 text-card-ink shadow-card">
        <p className={LABEL}>Join at</p>
        <p className="text-xl font-bold break-all">{displayUrl(url)}</p>
        <div className="bg-ink p-3 text-paper">
          <QRCodeSVG
            value={url}
            title={`Join at ${url}`}
            marginSize={0}
            bgColor="transparent"
            fgColor="currentColor"
            style={{ width: 'min(60vw, 16rem)', height: 'min(60vw, 16rem)', display: 'block' }}
          />
        </div>
      </div>
      <p className={LABEL}>Room code</p>
      {/* Four code tiles (design.md Controls, Room code); the text is still the code. They shrink
          with the phone, so they fit a 320px screen (HST-06). */}
      <p className="grid grid-cols-4 gap-2">
        <span className="sr-only">{code}</span>
        {[...code].map((letter, i) => (
          <span
            key={i}
            aria-hidden
            className="flex size-[clamp(3.5rem,18vw,4.5rem)] items-center justify-center rounded-control bg-shade font-outlier text-[clamp(2.5rem,13vw,3.25rem)] leading-none text-accent inset-ring-2 inset-ring-edge"
          >
            {letter}
          </span>
        ))}
      </p>
      {unreachable && (
        <p role="note" className="text-ink-2">
          Phones can’t open localhost. Open this page at this computer’s network address instead.
        </p>
      )}
    </section>
  );
}

/**
 * The current question in large type to read out, its image, and the answer under a cover the host
 * taps to lift. With no Screen to show it, the answer is uncovered once revealed, for reading out.
 */
export function ReadAloudQuestion({ view }: { view: HostView }) {
  const { question } = view;
  if (!question) return null;
  return (
    // The well on a rule edge, as the question card (`host.png`).
    <section
      aria-label="Question"
      className="flex flex-col gap-4 rounded-card border-2 border-edge bg-surface p-3"
    >
      <p className={`flex justify-between gap-2 ${LABEL}`}>
        <span>{questionHeading(view.board, view.questionIndex, view.questionCount)}</span>
        <span className="shrink-0 font-bold whitespace-nowrap text-accent">
          {question.points} pts
        </span>
      </p>
      {question.text && (
        <p className="text-[28px] leading-snug font-bold break-words">{question.text}</p>
      )}
      {question.imageId && (
        <img
          src={imageUrl(view.code, question.imageId)}
          alt={question.text ? 'Question image' : 'Picture question'}
          className="max-h-72 self-center object-contain"
        />
      )}
      {/* Keyed by question, so each new question starts covered. */}
      <AnswerCover
        key={view.questionIndex}
        answer={question.answer}
        hostNotes={question.hostNotes}
        revealed={view.phase === 'REVEAL'}
      />
    </section>
  );
}

interface AnswerCoverProps {
  answer: string;
  hostNotes?: string;
  revealed: boolean;
}

function AnswerCover({ answer, hostNotes, revealed }: AnswerCoverProps) {
  const [shown, setShown] = useState(false);
  const pointerFine = usePointerFine();
  if (!shown && !revealed) {
    // The answer is not in the page until the cover is lifted, so nobody reads it over a shoulder.
    return (
      <button
        type="button"
        onClick={() => setShown(true)}
        // A cover, not a field: shade with a dashed 2px muted edge, Sofia Sans 700 (design.md).
        className="min-h-14 rounded-control border-2 border-dashed border-muted bg-shade px-3.5 py-3 font-sans text-lg font-bold text-ink-2"
      >
        {pointerFine ? 'Click to show answer' : 'Tap to show answer'}
      </button>
    );
  }
  return (
    <div aria-label="Answer" className="flex flex-col gap-1.5 bg-shade px-3.5 py-3">
      <p className="flex flex-col">
        <span className={LABEL}>Answer</span>
        <span className="min-w-0 font-display text-4xl leading-tight break-words text-accent uppercase">
          {answer}
        </span>
      </p>
      {hostNotes && <p className="text-muted">{hostNotes}</p>}
      {!revealed && (
        <button type="button" onClick={() => setShown(false)} className={`${LINK} self-start`}>
          Hide answer
        </button>
      )}
    </div>
  );
}

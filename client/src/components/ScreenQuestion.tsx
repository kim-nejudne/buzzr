import { useRef, type CSSProperties } from 'react';
import { CHOICE_COLORS, CHOICE_LETTERS } from '../../../shared/constants.js';
import type {
  BuzzGap,
  ChoiceView,
  Phase,
  RankedPlayer,
  ScreenView,
  TypedView,
} from '../../../shared/types.js';
import { imageUrl } from '../lib/api.js';
import { useCopy } from '../lib/copy.js';
import { signedPoints } from '../lib/results.js';
import { buzzersOpen, formatGap, questionTextClass } from '../lib/screenQuestion.js';
import {
  countdownText,
  useAnswerCountdown,
  useBuzzCountdown,
  useAnsweringCountdown,
  type AnswerCountdown,
} from '../lib/useAnswerCountdown.js';
import { useFalseStartWait } from '../lib/useFalseStartWait.js';
import { useRecentFx } from '../lib/useRecentFx.js';
import { useShrinkToFit } from '../lib/useShrinkToFit.js';
import { ColourDot } from './ColourDot.js';
import { Icon } from './Icon.js';
import { StandingsRail } from './StandingsRail.js';
import { BANNER_NAME, nameFitSize } from '../lib/nameFit.js';

/** A player's chip on the Screen: their round swatch and full name; each use sets its fill (design.md Controls). */
const PLAYER_CHIP = 'flex items-center gap-[min(0.6cqw,1.07cqh)] font-semibold';

/** A chip's round swatch in its 2px ink ring (design.md Rules, Content stays content). */
const CHIP_DOT = 'size-[0.8em] border-[0.1em] border-paper ring-2 ring-ink';

/** The question text never shrinks below this, however squeezed the card (F52); the floor (F100). */
const QUESTION_MIN_PX = 14;

/**
 * A small sentence-case label on the Screen (13–16px at 1280 wide). Like every Screen size, it has a
 * floor for small displays (F100): `--screen-min-label`, `-body` or `-name`, 0 in the editor's preview.
 */
const SCREEN_LABEL =
  'font-sans text-[max(var(--screen-min-label),min(1.2cqw,2.1cqh))] font-semibold';

/** A figure on the Screen: DotGothic16, never under `--screen-min-figure` (40px, design.md Rules). */
const FIGURE = 'font-outlier font-normal tabular-nums';
/** A figure that may render under 40px: Sofia Sans 800 in tabular figures (design.md Rules). */
const SMALL_FIGURE = 'font-sans font-extrabold tabular-nums';

/**
 * The Screen during a question: its text and image in a card (the number is in the header), then
 * the buzzer status or, once
 * someone has won the buzz, their banner and the "also buzzed" gaps (UI spec, Screen view).
 * The answer shows only when the view carries it, which the server allows at REVEAL alone.
 * `imageSrc` replaces the room's image URL, for the set editor's preview of a stored blob.
 * Sizes are in `cqw`/`cqh`. On the Screen no size container wraps it, so they are the window's
 * (`svw`/`svh`); the editor's preview wraps it in a 16:9 stage, a small TV (EDT-08).
 */
export function ScreenQuestion({ view, imageSrc }: { view: ScreenView; imageSrc?: string }) {
  const { question } = view;
  const countdown = useAnswerCountdown(view);
  const buzzCountdown = useBuzzCountdown(view);
  const answeringCountdown = useAnsweringCountdown(view);
  const held = useFalseStartWait(view, view.settings.falseStartMs, view.falseStarts.length > 0);
  const rowRef = useRef<HTMLDivElement>(null);
  // The length step is the most the text gets; the answer and the banner squeeze the card, so it
  // shrinks further when its lines would not fit what is left (F52).
  useShrinkToFit(
    rowRef,
    'css',
    QUESTION_MIN_PX,
    question ? `${question.imageId ?? ''}\n${question.text}` : '',
  );
  if (!question) return null;
  const text = question.text.trim();
  const winner = view.players.find((p) => p.id === view.winnerId);
  // The buzz banner runs the stage's full width, under the question and the rail (`12` F178).
  const banner = !view.choice && !view.typed && view.phase === 'BUZZED' ? winner : undefined;
  const judgedWrong = banner !== undefined && view.lockedOut.includes(banner.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[3cqh] px-[min(3.75cqw,6.67cqh)] pt-[1cqh] pb-[max(3cqh,var(--hint-reserve,0px))]">
      <div className="flex min-h-0 flex-1 gap-[min(4cqw,7.12cqh)]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[4cqh]">
          <section
            aria-label="Question"
            // On the ground, no fill and no bar: the answer card is the one panel (`screen-*.png`).
            className="flex min-h-0 flex-1 flex-col gap-[2cqh] overflow-hidden pb-[min(1cqw,1.8cqh)]"
          >
            <p className={`shrink-0 truncate text-muted ${SCREEN_LABEL}`}>{view.title}</p>
            {/* Safe centring: text taller than a squeezed card, even at the smallest size, starts at
              the top and clips at the bottom, instead of spilling over the label. The row carries
              the text size, so the hook measures a box that its font size never changes. */}
            {/* On a portrait display the image goes under the text, across the card's width (F100). */}
            <div
              ref={rowRef}
              className={`flex min-h-0 flex-1 items-center-safe gap-[min(4cqw,7.12cqh)] overflow-hidden ${question.imageId ? 'stage-portrait:flex-col stage-portrait:items-stretch' : ''} ${questionTextClass(text, question.imageId !== undefined)}`}
            >
              {text && (
                <h1
                  // Reading text, so Sofia Sans 700 (design.md Rules).
                  className={`min-w-0 flex-1 font-sans leading-tight font-bold tracking-normal break-words ${question.imageId ? 'stage-portrait:flex-none' : ''}`}
                >
                  {text}
                </h1>
              )}
              {question.imageId && (
                <img
                  src={imageSrc ?? imageUrl(view.code, question.imageId)}
                  alt={text ? 'Question image' : `Question ${view.questionIndex + 1}`}
                  className="h-full min-h-0 min-w-0 flex-1 object-contain stage-portrait:h-auto stage-portrait:w-full"
                />
              )}
            </div>
          </section>
          {view.choice ? (
            // A choice question shows its tiles in place of the buzzer status, the lit tile in
            // place of the answer at REVEAL, and nobody's name: several players may be right (F86).
            <ChoiceBoard choice={view.choice} phase={view.phase} countdown={answeringCountdown} />
          ) : view.typed ? (
            // A typed question has no buzzers; at REVEAL every player marked right is named (F88).
            <TypedBoard
              typed={view.typed}
              phase={view.phase}
              countdown={answeringCountdown}
              answer={question.answer}
              points={question.points}
              players={view.players}
            />
          ) : view.phase === 'REVEAL' ? (
            <Reveal
              answer={question.answer}
              scorer={view.players.find((p) => p.id === view.scorerId)}
            />
          ) : banner ? null : (
            <>
              {buzzCountdown && view.buzzTimer ? (
                <BuzzTimeRing countdown={buzzCountdown} seconds={view.buzzTimer.seconds} />
              ) : (
                <BuzzerStatus open={buzzersOpen(view.phase)} />
              )}
              <LockedOut ids={view.lockedOut} players={view.players} />
              {(view.phase === 'QUESTION' || held) && (
                <FalseStarts ids={view.falseStarts} players={view.players} />
              )}
            </>
          )}
        </div>
        <StandingsRail
          phase={view.phase}
          players={view.players}
          show={view.settings.showStandings}
          teams={view.teams}
          // The player buzzing in is the rail's blue cursor row, until judged wrong (design.md Controls).
          cursorId={banner && !judgedWrong ? banner.id : undefined}
        />
      </div>
      {banner && (
        <BuzzResult
          winner={banner}
          judgedWrong={judgedWrong}
          countdown={countdown}
          alsoBuzzed={view.alsoBuzzed}
          players={view.players}
        />
      )}
    </div>
  );
}

function BuzzerStatus({ open }: { open: boolean }) {
  const t = useCopy();
  return (
    <p
      role="status"
      // Open is the amber block with ground type; locked sinks to well-2. Antonio capitals (F178).
      className={`shrink-0 self-start px-[min(1.8cqw,3.2cqh)] py-[1.4cqh] font-display text-[max(var(--screen-min-name),min(3cqw,5.4cqh))] leading-none uppercase ${
        open ? 'bg-accent text-accent-ink' : 'bg-bg-deep text-muted'
      }`}
    >
      {open ? t('buzzersOpen') : t('buzzersLocked')}
    </p>
  );
}

/**
 * "Buzzers OPEN" with a buzz time (UI spec, Screen view: Question): the amber block with the seconds
 * in DotGothic beside the words, and under it a bar across the column that drains as they run out
 * (`screen-question-open-*.png`). At 0 the server reveals the answer (DECISIONS, F63), so the ring
 * never shows time up itself.
 */
function BuzzTimeRing({ countdown, seconds }: { countdown: AnswerCountdown; seconds: number }) {
  const left = seconds > 0 ? countdown.secondsLeft / seconds : 0;
  const t = useCopy();
  return (
    <div
      data-buzz-ring
      style={{ '--left': left } as CSSProperties}
      className="flex shrink-0 flex-col gap-[0.6cqh]"
    >
      <div className="flex items-center gap-[min(1.2cqw,2.14cqh)] self-start bg-accent px-[min(1.8cqw,3.2cqh)] py-[1cqh] font-display text-[max(var(--screen-min-name),min(3cqw,5.4cqh))] leading-none text-accent-ink uppercase">
        <p role="status">{t('buzzersOpen')}</p>
        <p
          role="timer"
          aria-label="Buzz time"
          className={`min-w-[1ch] text-[max(var(--screen-min-figure),1.15em)] leading-none ${FIGURE}`}
        >
          {countdown.secondsLeft}
        </p>
      </div>
      <span aria-hidden className="h-[min(0.6cqw,1.07cqh)] w-full bg-bg-deep">
        <span className="block h-full w-[calc(var(--left)*100%)] bg-accent" />
      </span>
    </div>
  );
}

/**
 * A choice question's 2–4 tiles in a 2×2 grid, each the well on a 2px rule edge with its letter on
 * a square in its A–D colour (F86, `screen-choice-1080.png`). While answers are taken, the time left
 * and "N of M answered" sit under them. At REVEAL the correct tile turns blue with a check, the
 * others dim, and each shows how many picked it. Before REVEAL the view carries neither
 * the correct choice nor the counts, so nothing here can give the answer away.
 */
function ChoiceBoard({
  choice,
  phase,
  countdown,
}: {
  choice: ChoiceView;
  phase: Phase;
  countdown: AnswerCountdown | null;
}) {
  const revealed = choice.correctChoice !== undefined;
  const t = useCopy();
  return (
    <section aria-label="Choices" className="flex shrink-0 flex-col gap-[2.4cqh]">
      <ol className="grid grid-cols-2 gap-x-[min(2.5cqw,4.4cqh)] gap-y-[3cqh]">
        {choice.choices.map((text, index) => {
          const correct = revealed && index === choice.correctChoice;
          const count = choice.counts?.[index];
          return (
            <li
              key={index}
              data-choice={CHOICE_LETTERS[index]}
              data-correct={correct || undefined}
              className={`flex min-w-0 items-center gap-[min(1.4cqw,2.49cqh)] border-2 px-[min(1.4cqw,2.49cqh)] py-[1.6cqh] transition-opacity ${
                correct
                  ? 'border-accent-2 bg-accent-2 text-accent-2-ink'
                  : `border-edge bg-surface text-ink ${revealed ? 'opacity-35' : ''}`
              }`}
            >
              {/* Ground type on the colour, as on the phone's tiles (F176). */}
              <span
                style={{ backgroundColor: CHOICE_COLORS[index] }}
                className="grid size-[max(1.4em,min(4.4cqw,7.8cqh))] shrink-0 place-items-center font-display text-[max(var(--screen-min-body),min(2.9cqw,5.1cqh))] leading-none text-bg"
              >
                {CHOICE_LETTERS[index]}
              </span>
              <span className="min-w-0 flex-1 text-[max(var(--screen-min-body),min(2.4cqw,4.3cqh))] leading-tight font-semibold break-words">
                {text}
              </span>
              {correct && (
                <>
                  <span className="sr-only">, correct</span>
                  <Icon name="check" className="size-[min(3.4cqw,6cqh)] shrink-0" />
                </>
              )}
              {count !== undefined && (
                <span
                  data-count
                  className={`min-w-[1.8em] shrink-0 bg-shade px-[min(0.8cqw,1.43cqh)] py-[0.4cqh] text-center text-[max(var(--screen-min-body),min(2.4cqw,4.3cqh))] leading-tight text-ink ${SMALL_FIGURE}`}
                >
                  {count}
                  <span className="sr-only"> picked</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {phase === 'ANSWERING' && (
        <AnsweringProgress
          countdown={countdown}
          status={t('answeredOf', { answered: choice.answered, expected: choice.expected })}
        />
      )}
      {phase === 'QUESTION' && <AnswersPill label={t('answersLocked')} />}
    </section>
  );
}

/** The time left to answer in a round amber pill, and how many have answered (F86, F88). */
function AnsweringProgress({
  countdown,
  status,
}: {
  countdown: AnswerCountdown | null;
  status: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-[min(1.8cqw,3.2cqh)]">
      {countdown && (
        <p
          role="timer"
          aria-label="Time to answer"
          className={`min-w-[2.6em] rounded-pill bg-buzz px-[min(1.4cqw,2.49cqh)] py-[0.6cqh] text-center text-[max(var(--screen-min-name),min(1.8cqw,3.2cqh))] leading-tight text-buzz-ink ${SMALL_FIGURE}`}
        >
          {countdown.secondsLeft}
        </p>
      )}
      <p
        role="status"
        className="text-[max(var(--screen-min-body),min(2.6cqw,4.6cqh))] font-semibold text-ink"
      >
        {status}
      </p>
    </div>
  );
}

/** A sunk well-2 block for answers not taken: before they open, or once typed answers lock. */
function AnswersPill({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="shrink-0 self-start bg-bg-deep px-[min(1.8cqw,3.2cqh)] py-[1.2cqh] font-display text-[max(var(--screen-min-body),min(2.2cqw,3.9cqh))] leading-none text-muted uppercase"
    >
      {label}
    </p>
  );
}

interface TypedBoardProps {
  typed: TypedView;
  phase: Phase;
  countdown: AnswerCountdown | null;
  /** In the view at REVEAL only. */
  answer: string | undefined;
  /** The question's points: each correct answer scored them, shown on its chip (F154). */
  points: number;
  players: RankedPlayer[];
}

/**
 * A typed question (F88): "Answers locked" before it opens; the time left and "N of M answered"
 * while answers come in; "Answers closed" once they lock and the host marks them. At REVEAL, the
 * answer, and the names of the players whose answers were marked right. The view carries no
 * answers or groups before REVEAL, so nothing here can give one away.
 */
function TypedBoard({ typed, phase, countdown, answer, points, players }: TypedBoardProps) {
  const t = useCopy();
  if (phase === 'REVEAL') {
    const right = new Set(
      (typed.groups ?? []).filter((group) => group.correct).flatMap((group) => group.playerIds),
    );
    const winners = players.filter((player) => right.has(player.id));
    return (
      <section aria-label="Answer" className="flex shrink-0 flex-col items-start gap-[2cqh]">
        <AnswerCard answer={answer} />
        {winners.length > 0 ? (
          <ul
            aria-label="Got it"
            className="flex max-w-full flex-wrap gap-[min(1cqw,1.78cqh)] overflow-hidden"
          >
            {winners.map((player) => (
              <li
                key={player.id}
                data-scorer
                className={`${PLAYER_CHIP} bg-win px-[min(1.6cqw,2.85cqh)] py-[0.8cqh] text-[max(var(--screen-min-name),min(1.8cqw,3.2cqh))] text-win-ink`}
              >
                <ColourDot color={player.color} className={CHIP_DOT} />
                {player.name}
                <span className="sr-only"> ✓</span>
                <Icon name="check" className="size-[1em]" />
                {/* Held, not floated as on the buzz reveal: chips wrap, so a float would cover a neighbour. */}
                {points > 0 && <span className={SMALL_FIGURE}>{signedPoints(points)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[max(var(--screen-min-body),min(2.6cqw,4.6cqh))] font-semibold text-muted">
            {t('nobodyGotIt')}
          </p>
        )}
      </section>
    );
  }
  if (phase === 'ANSWERING' && typed.closed) {
    return (
      <div className="flex shrink-0 items-center gap-[min(1.8cqw,3.2cqh)]">
        <AnswersPill label={t('answersClosed')} />
        <p className="text-[max(var(--screen-min-body),min(2.6cqw,4.6cqh))] font-semibold text-ink">
          {t('answeredCount', { n: typed.answered })}
        </p>
      </div>
    );
  }
  if (phase === 'ANSWERING') {
    return (
      <AnsweringProgress
        countdown={countdown}
        status={t('answeredOf', { answered: typed.answered, expected: typed.expected })}
      />
    );
  }
  return <AnswersPill label={t('answersLocked')} />;
}

/** Players judged wrong on this question, sunk to well-2 and struck through while the others may still buzz; the word in stop. */
function LockedOut({ ids, players }: { ids: string[]; players: RankedPlayer[] }) {
  const out = players.filter((p) => ids.includes(p.id));
  const t = useCopy();
  if (out.length === 0) return null;
  return (
    <div className="flex max-w-full shrink-0 items-baseline gap-[min(1.2cqw,2.14cqh)]">
      <p className={`shrink-0 text-stop ${SCREEN_LABEL}`}>{t('lockedOut')}</p>
      <ul
        aria-label="Locked out"
        className="flex flex-wrap gap-[min(1cqw,1.78cqh)] overflow-hidden"
      >
        {out.map((player) => (
          <li
            key={player.id}
            className="bg-bg-deep px-[min(1.4cqw,2.49cqh)] py-[0.6cqh] text-[max(var(--screen-min-name),min(2cqw,3.6cqh))] font-semibold text-muted line-through"
          >
            {player.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Players who pressed before the buzzers opened, as chips with their swatch and a small "Too early"
 * tag in stop red with ground type (F72): from the press until their wait after the opening ends.
 */
function FalseStarts({ ids, players }: { ids: string[]; players: RankedPlayer[] }) {
  const early = ids.flatMap((id) => players.find((p) => p.id === id) ?? []);
  const t = useCopy();
  if (early.length === 0) return null;
  return (
    <ul
      aria-label="Too early"
      className="flex max-w-full shrink-0 flex-wrap gap-[min(1cqw,1.78cqh)] overflow-hidden"
    >
      {early.map((player) => (
        <li
          key={player.id}
          className={`${PLAYER_CHIP} border-2 border-edge bg-surface py-[0.6cqh] pr-[min(0.6cqw,1.07cqh)] pl-[min(1.4cqw,2.49cqh)] text-[max(var(--screen-min-name),min(2cqw,3.6cqh))] text-ink`}
        >
          <ColourDot color={player.color} className={CHIP_DOT} />
          {player.name}
          <span
            className={`bg-warn px-[min(0.8cqw,1.43cqh)] py-[0.3cqh] text-stop-ink ${SCREEN_LABEL}`}
          >
            {t('tooEarlyTag')}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The answer card under the question, and the player who got it right on a blue chip with its
 * check (UI spec, Screen view: Reveal; `screen-reveal-1080.png`). "+100" floats up beside the chip
 * in DotGothic when the correct judgement's `fx` arrives.
 */
function Reveal({ answer, scorer }: { answer: string | undefined; scorer?: RankedPlayer }) {
  const recent = useRecentFx();
  const scored =
    recent?.fx.kind === 'correct' && recent.fx.playerId === scorer?.id ? recent : undefined;
  return (
    <section aria-label="Answer" className="flex shrink-0 flex-col items-start gap-[3cqh]">
      <AnswerCard answer={answer} />
      {scorer && (
        <p
          data-scorer
          className={`relative ${PLAYER_CHIP} bg-win px-[min(1.6cqw,2.85cqh)] py-[1.4cqh] text-[max(var(--screen-min-name),min(1.8cqw,3.2cqh))] text-win-ink`}
        >
          <ColourDot color={scorer.color} className={CHIP_DOT} />
          {scorer.name}
          <span className="sr-only"> ✓</span>
          <Icon name="check" className="size-[1em]" />
          {scored?.fx.kind === 'correct' && (
            <span
              key={scored.seq}
              className={`absolute top-1/2 left-full ml-[min(1.5cqw,2.67cqh)] -translate-y-1/2 text-[max(var(--screen-min-figure),min(3.2cqw,6cqh))] leading-none whitespace-nowrap text-accent-2 motion-safe:animate-float-up ${FIGURE}`}
            >
              {signedPoints(scored.fx.points)}
            </span>
          )}
        </p>
      )}
    </section>
  );
}

/** The answer in Antonio capitals on the well, under a 4px amber bar, across the column (`screen-reveal-1080.png`). */
function AnswerCard({ answer }: { answer: string | undefined }) {
  const t = useCopy();
  return (
    <div
      data-answer-card
      className="flex w-full flex-col items-start gap-[1cqh] border-t-4 border-accent bg-card px-[min(3.3cqw,5.9cqh)] py-[2.4cqh] text-card-ink"
    >
      <p className={`text-accent ${SCREEN_LABEL}`}>{t('answer')}</p>
      <p className="max-w-full font-display text-[max(var(--screen-min-name),min(5.6cqw,10cqh))] leading-none break-words uppercase">
        {answer}
      </p>
    </div>
  );
}

/** The answer countdown on the right of the winner's banner in DotGothic (UI spec, Screen view: Buzzed), then "Time's up!". */
function Countdown({ countdown }: { countdown: AnswerCountdown }) {
  const t = useCopy();
  return (
    <p
      role="timer"
      aria-label="Answer time"
      data-up={countdown.up || undefined}
      className={`shrink-0 leading-none whitespace-nowrap ${
        countdown.up
          ? 'bg-buzz-ink px-[min(1.6cqw,2.85cqh)] py-[1cqh] font-display text-[max(var(--screen-min-body),min(2.2cqw,3.9cqh))] text-buzz uppercase'
          : `text-[max(var(--screen-min-figure),min(7cqw,12.4cqh))] ${FIGURE}`
      }`}
    >
      {countdownText(countdown, t)}
    </p>
  );
}

interface BuzzResultProps {
  winner: RankedPlayer;
  /** Judged wrong and waiting for the reopen: the banner turns stop red, the name struck through, and reads "Wrong". */
  judgedWrong: boolean;
  /** The winner's answer countdown, shown on the banner; null with no answer time. */
  countdown: AnswerCountdown | null;
  alsoBuzzed: BuzzGap[];
  players: RankedPlayer[];
}

/**
 * The buzz banner (`screen-buzz-banner-*.png`, `screen-buzz-wrong-1080.png`): full width, amber with
 * a bulb border in ground, the winner's round swatch, their name in Antonio over "First to buzz", and
 * the countdown on the right. Judged wrong, it turns stop red with the name struck through and the
 * word "Wrong". The players who also buzzed sit under it as chips with their gap.
 */
function BuzzResult({ winner, judgedWrong, countdown, alsoBuzzed, players }: BuzzResultProps) {
  const others = alsoBuzzed.flatMap((gap) => {
    const player = players.find((p) => p.id === gap.playerId);
    return player ? [{ player, gapMs: gap.gapMs }] : [];
  });
  const t = useCopy();
  return (
    <div className="flex shrink-0 flex-col gap-[1.4cqh]">
      <section
        aria-label="Buzz result"
        data-judged={judgedWrong ? 'wrong' : undefined}
        // Ground on amber or stop, never light type on red (design.md Contrast). The bulbs are the
        // ground's too; the padding clears their 28px band, so no letter sits under one.
        className={`bulbs flex items-center gap-[min(2.4cqw,4.27cqh)] px-[max(2.5rem,min(3cqw,5.34cqh))] py-[max(2.25rem,4cqh)] [--bulb-dim:color-mix(in_oklab,var(--color-paper)_40%,transparent)] [--bulb-lit:var(--color-paper)] stage-portrait:flex-col stage-portrait:items-stretch ${
          judgedWrong ? 'bg-warn text-stop-ink' : 'bg-buzz text-buzz-ink'
        }`}
      >
        {/* Their palette colour, so the player can tell it is them: a paper gap in an ink ring, so
            a red player's swatch still reads on the stop banner (F154). */}
        <ColourDot
          data-player-color
          color={winner.color}
          className="size-[min(7cqw,12.4cqh)] border-[min(0.25cqw,0.45cqh)] border-paper ring-2 ring-ink stage-portrait:hidden"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[0.6cqh]">
          {/* Antonio is condensed: the name steps down from this size until it fits the column on
              one line, and wraps rather than truncates (F153). */}
          <div className="@container text-[max(var(--screen-min-name),min(7.2cqw,12.8cqh))]">
            <h2
              style={{ fontSize: nameFitSize(winner.name, BANNER_NAME) }}
              className={`min-w-0 pb-[0.04em] font-display leading-none uppercase [overflow-wrap:anywhere] ${
                judgedWrong ? 'line-through' : ''
              }`}
            >
              {winner.name}
            </h2>
          </div>
          {/* The state's word: buzz is "First to buzz", and a wrong judgement says so (design.md Rules). */}
          <p className="font-sans text-[max(var(--screen-min-label),min(1.6cqw,2.85cqh))] leading-tight font-bold">
            {judgedWrong ? t('wrong') : t('firstToBuzz')}
          </p>
        </div>
        {countdown && <Countdown countdown={countdown} />}
      </section>
      {others.length > 0 && (
        <div className="flex max-w-full items-center gap-[min(1cqw,1.78cqh)]">
          <p className={`shrink-0 text-muted ${SCREEN_LABEL}`}>{t('alsoBuzzed')}</p>
          <ol
            aria-label="Also buzzed"
            className="flex min-w-0 flex-wrap gap-[min(0.8cqw,1.43cqh)] overflow-hidden"
          >
            {others.map(({ player, gapMs }) => (
              <li
                key={player.id}
                className="flex items-center gap-[min(0.5cqw,0.89cqh)] border-2 border-edge bg-surface px-[min(1cqw,1.78cqh)] py-[0.6cqh] text-[max(var(--screen-min-body),min(1.4cqw,2.5cqh))] whitespace-nowrap"
              >
                <ColourDot color={player.color} className={CHIP_DOT} />
                <span className="font-semibold text-ink">{player.name}</span>
                <span className={`text-accent ${SMALL_FIGURE}`}>{formatGap(gapMs)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

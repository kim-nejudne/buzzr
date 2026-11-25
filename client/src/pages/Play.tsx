import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from 'react';
import { Link, useParams } from 'react-router';
import {
  AVATARS,
  CHOICE_COLORS,
  CHOICE_LETTERS,
  GAME_ENDED_ERROR,
  PLAYER_KICKED_ERROR,
  PLAYER_NAME_MAX,
  ROOM_CHECK_RATE_LIMITED_ERROR,
  ROOM_NOT_FOUND_ERROR,
  TYPED_ANSWER_MAX,
} from '../../../shared/constants.js';
import { playerNameSchema } from '../../../shared/schemas.js';
import type {
  Ack,
  ClientPayloads,
  LobbyPlayer,
  PlayerChoiceView,
  PlayerTypedView,
  PlayerView,
} from '../../../shared/types.js';
import { ConfirmButton } from '../components/ConfirmButton.js';
import { ConnectionDot } from '../components/ConnectionDot.js';
import { Icon } from '../components/Icon.js';
import { PlayerAvatar } from '../components/PlayerAvatar.js';
import { ShareResults } from '../components/ShareResults.js';
import { Toast, useToast } from '../components/Toast.js';
import { roomExists } from '../lib/api.js';
import { BUZZER_LOOK } from '../lib/buzzerLook.js';
import { buzzerState, gotItRight, type BuzzerKind, type BuzzerState } from '../lib/buzzerState.js';
import {
  clearPlayer,
  loadPlayer,
  newPlayerId,
  renamePlayer,
  savePlayer,
  type PlayerIdentity,
} from '../lib/playerIdentity.js';
import { pointsText, rankText, useCopy, type Translate } from '../lib/copy.js';
import { HOVER } from '../lib/hover.js';
import { ordinal } from '../lib/results.js';
import { teamOf } from '../lib/teams.js';
import { cardFromPlayer } from '../lib/resultsCard.js';
import { isCompleteRoomCode } from '../lib/roomCode.js';
import { useRoomStore } from '../lib/roomStore.js';
import { createSocket, type GameSocket } from '../lib/socket.js';
import { useRoomSocket, type JoinRoom } from '../lib/useRoomSocket.js';
import {
  useAnswerCountdown,
  useBuzzCountdown,
  useAnsweringCountdown,
} from '../lib/useAnswerCountdown.js';
import { useFalseStartWait } from '../lib/useFalseStartWait.js';
import { usePointerFine } from '../lib/usePointerFine.js';
import {
  BUTTON_DANGER,
  BUTTON_PRIMARY_SMALL,
  BUTTON_SMALL,
  CARD,
  INPUT,
  LABEL,
  LINK,
  PILL,
} from '../lib/ui.js';
import { useWakeLock } from '../lib/useWakeLock.js';

interface PlayProps {
  /** Tests pass a fake socket. */
  makeSocket?: () => GameSocket;
}

/** The phone view at `/play/:code`: the join form, then the buzzer screen. Mobile-first. */
export function Play({ makeSocket = createSocket }: PlayProps) {
  const code = (useParams().code ?? '').toUpperCase();
  if (!isCompleteRoomCode(code)) return <PlayMessage title="Room not found" />;
  return <PlayRoom key={code} code={code} makeSocket={makeSocket} />;
}

type Step =
  | { kind: 'checking' }
  | { kind: 'missing'; ended: boolean }
  | { kind: 'unreachable'; error: string }
  | { kind: 'form' }
  | { kind: 'joining'; identity: PlayerIdentity; saved: boolean };

type Avatar = NonNullable<PlayerIdentity['avatar']>;

function PlayRoom({ code, makeSocket }: { code: string; makeSocket: () => GameSocket }) {
  const [step, setStep] = useState<Step>({ kind: 'checking' });
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // One id per visit, reused if the first name is rejected; saved only once a join succeeds. A
  // player who leaves draws a new one, so they come back as a new player (DECISIONS F61).
  const [playerId, setPlayerId] = useState(newPlayerId);

  useEffect(() => {
    let cancelled = false;
    roomExists(code).then(
      (exists) => {
        if (cancelled) return;
        if (!exists) {
          // A stored identity means this device played here, so the game ended (expiry or restart).
          const ended = loadPlayer(code) !== null;
          // The room is gone, so any identity for it is stale (a later room may reuse the code).
          clearPlayer(code);
          return setStep({ kind: 'missing', ended });
        }
        // A stored identity means this device already joined: rejoin without the form.
        const stored = loadPlayer(code);
        setStep(stored ? { kind: 'joining', identity: stored, saved: true } : { kind: 'form' });
      },
      (error: Error) => {
        if (!cancelled) setStep({ kind: 'unreachable', error: error.message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = playerNameSchema.safeParse(name);
    if (!parsed.success) {
      return setFormError(
        name.trim() === ''
          ? 'Enter your name'
          : (parsed.error.issues[0]?.message ?? 'That name won’t work'),
      );
    }
    setFormError(null);
    // No `avatar` key without one: the join is then exactly as before avatars.
    const identity = avatar
      ? { playerId, name: parsed.data, avatar }
      : { playerId, name: parsed.data };
    setStep({ kind: 'joining', identity, saved: false });
  }

  const onJoined = useCallback(
    (identity: PlayerIdentity) => {
      savePlayer(code, identity);
      setStep({ kind: 'joining', identity, saved: true });
    },
    [code],
  );

  const onRejected = useCallback(
    (error: string) => {
      clearPlayer(code);
      setFormError(error);
      setStep({ kind: 'form' });
    },
    [code],
  );

  const onRenamed = useCallback(
    (newName: string) => {
      renamePlayer(code, newName);
      setStep((s) =>
        s.kind === 'joining' ? { ...s, identity: { ...s.identity, name: newName } } : s,
      );
    },
    [code],
  );

  // Back to the join form, with the name and avatar filled in to make coming back one tap.
  const onLeft = useCallback(
    (last: PlayerIdentity) => {
      clearPlayer(code);
      setPlayerId(newPlayerId());
      setName(last.name);
      setAvatar(last.avatar ?? null);
      setFormError(null);
      setStep({ kind: 'form' });
    },
    [code],
  );

  switch (step.kind) {
    case 'checking':
      return <PlayMessage title="Checking the room…" link={false} />;
    case 'missing':
      return step.ended ? (
        <PlayMessage title={GAME_ENDED_ERROR} />
      ) : (
        <PlayMessage title="Room not found" detail={`There is no game with code ${code}.`} />
      );
    case 'unreachable':
      // Past the room-check limit (F42) the server answered, so "can't reach" would mislead.
      return (
        <PlayMessage
          title={
            step.error === ROOM_CHECK_RATE_LIMITED_ERROR ? 'Slow down' : 'Can’t reach the game'
          }
          detail={step.error}
        />
      );
    case 'form':
      return (
        <NameForm
          code={code}
          name={name}
          avatar={avatar}
          error={formError}
          onName={setName}
          onAvatar={setAvatar}
          onSubmit={submit}
        />
      );
    case 'joining':
      return (
        <PlayerRoom
          code={code}
          identity={step.identity}
          saved={step.saved}
          makeSocket={makeSocket}
          onJoined={onJoined}
          onRejected={onRejected}
          onRenamed={onRenamed}
          onLeft={onLeft}
        />
      );
  }
}

interface NameFormProps {
  code: string;
  name: string;
  avatar: Avatar | null;
  error: string | null;
  onName: (name: string) => void;
  onAvatar: (avatar: Avatar | null) => void;
  onSubmit: (event: FormEvent) => void;
}

function NameForm({ code, name, avatar, error, onName, onAvatar, onSubmit }: NameFormProps) {
  return (
    // Top-aligned, as the mock's join frame (player.png): the amber Antonio heading, the field, the
    // avatar tiles, then JOIN at Size s across the column.
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-10">
      <form onSubmit={onSubmit} aria-labelledby="name-heading" className="flex flex-col gap-4">
        <h1
          id="name-heading"
          className="font-display text-[44px] leading-none text-accent uppercase"
        >
          Join room <span className="tabular-nums">{code}</span>
        </h1>
        <label htmlFor="player-name" className={LABEL}>
          Your name
        </label>
        <input
          id="player-name"
          value={name}
          onChange={(event) => onName(event.target.value)}
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="go"
          maxLength={PLAYER_NAME_MAX}
          aria-invalid={error !== null}
          aria-describedby={error ? 'name-error' : undefined}
          className={`${INPUT} text-lg`}
        />
        {error && (
          <p id="name-error" role="alert" className="text-lg text-stop">
            {error}
          </p>
        )}
        <AvatarPicker avatar={avatar} onAvatar={onAvatar} />
        <button
          type="submit"
          disabled={name.trim() === ''}
          className={`${BUTTON_PRIMARY_SMALL} mt-2 w-full`}
        >
          Join
        </button>
      </form>
      <Link to="/" className={`${LINK} self-start`}>
        Back to start
      </Link>
    </main>
  );
}

/**
 * The optional avatar on the join form (F75): a grid of the 24 emoji. Tapping the chosen one again
 * clears it, so a player can still join with only their name.
 */
function AvatarPicker({
  avatar,
  onAvatar,
}: {
  avatar: Avatar | null;
  onAvatar: (avatar: Avatar | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LABEL} mb-2`}>Avatar (optional)</legend>
      {/* At least 44px a cell: 4 across at 320px, 6 from 360px, so JOIN is on the first screen at 375×667 (PLY-06, F158). */}
      <div className="grid grid-cols-4 gap-2 min-[360px]:grid-cols-6">
        {AVATARS.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={`Avatar ${option}`}
            aria-pressed={avatar === option}
            onClick={() => onAvatar(avatar === option ? null : option)}
            // Square well tiles on a rule edge; the chosen one sinks to well-2 in a 2px ink ring (12 § Surfaces F176).
            className={`grid aspect-square min-h-11 place-items-center rounded-control border border-edge text-[26px] leading-none ${HOVER} ${
              avatar === option ? 'bg-bg-deep ring-2 ring-ink' : 'bg-surface'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

interface PlayerRoomProps {
  code: string;
  identity: PlayerIdentity;
  /** True once the server has accepted this identity and it is stored. */
  saved: boolean;
  makeSocket: () => GameSocket;
  onJoined: (identity: PlayerIdentity) => void;
  onRejected: (error: string) => void;
  /** The server took the new name. */
  onRenamed: (name: string) => void;
  /** The server removed this player; `identity` is the one they had. */
  onLeft: (identity: PlayerIdentity) => void;
}

function PlayerRoom({
  code,
  identity,
  saved,
  makeSocket,
  onJoined,
  onRejected,
  onRenamed,
  onLeft,
}: PlayerRoomProps) {
  const join = useCallback<JoinRoom>(
    (socket, ack) => {
      socket.emit('player:join', { code, ...identity }, (res) => {
        if (res.ok) {
          if (!saved) onJoined(identity);
          return ack(res);
        }
        // A kicked id stays stored, so every refresh is refused again (Edge cases: kicked player).
        if (saved && res.error === PLAYER_KICKED_ERROR) return ack(res);
        if (res.error === ROOM_NOT_FOUND_ERROR) {
          // The room went away after the page checked it. Joined before: the game ended (restart).
          if (!saved) return ack(res);
          clearPlayer(code);
          return ack({ ok: false, error: GAME_ENDED_ERROR });
        }
        // Any other refusal means the room does not know this identity: a first join with a taken
        // name, or a stored id from an expired room whose code was reused. Back to the form.
        onRejected(res.error);
      });
    },
    [code, identity, saved, onJoined, onRejected],
  );
  const socketRef = useRoomSocket(code, join, makeSocket);
  const press = useCallback<SendPress>(
    (event, ack) => {
      const socket = socketRef.current;
      if (!socket) return ack({ ok: false, error: 'Not connected' });
      socket.emit(event, {}, ack);
    },
    [socketRef],
  );
  const answer = useCallback<SendAnswer>(
    (payload, ack) => {
      const socket = socketRef.current;
      if (!socket) return ack({ ok: false, error: 'Not connected' });
      socket.emit('player:answer', payload, ack);
    },
    [socketRef],
  );
  const rename = useCallback<SendRename>(
    (name, ack) => {
      const socket = socketRef.current;
      if (!socket) return ack({ ok: false, error: 'Not connected' });
      socket.emit('player:rename', { name }, (res) => {
        if (res.ok) onRenamed(name);
        ack(res);
      });
    },
    [socketRef, onRenamed],
  );
  const leave = useCallback<SendLeave>(
    (ack) => {
      const socket = socketRef.current;
      if (!socket) return ack({ ok: false, error: 'Not connected' });
      socket.emit('player:leave', {}, (res) => {
        // On success this page unmounts the room, and its socket with it.
        if (res.ok) onLeft(identity);
        ack(res);
      });
    },
    [socketRef, onLeft, identity],
  );

  const view = useRoomStore((state) => state.view);
  const error = useRoomStore((state) => state.error);

  // Kicked now, or refused on a rejoin after a kick: the same page either way (UI spec, Player view).
  if (error === PLAYER_KICKED_ERROR) {
    return <PlayMessage title="Removed by host" detail={PLAYER_KICKED_ERROR} />;
  }
  if (error) return <PlayMessage title={error} />;
  if (view?.role !== 'player') return <PlayMessage title="Joining…" link={false} />;
  return <Buzzer view={view} send={press} answer={answer} rename={rename} leave={leave} />;
}

/** Sends a press: a buzz, or a lobby test buzz. */
type SendPress = (event: 'player:buzz' | 'player:practice', ack: (res: Ack) => void) => void;
/** Sends `player:answer`: a choice index, or a typed answer's text. */
type SendAnswer = (answer: ClientPayloads['player:answer'], ack: (res: Ack) => void) => void;
/** Sends `player:rename` with a name already checked against the join's rules. */
type SendRename = (name: string, ack: (res: Ack) => void) => void;
type SendLeave = (ack: (res: Ack) => void) => void;

/** Two short pulses for a correct answer, one long one for a wrong answer and its lockout. */
const CORRECT_VIBRATION = [60, 80, 60];
const WRONG_VIBRATION = 400;

/**
 * Vibrates on this player's own `fx correct` and `fx wrong` (UI spec, Player view). A wrong answer
 * is what locks a player out, so its one pulse covers the lockout too (DECISIONS F61). Only events
 * after mount count, as on the Host remote, so a reconnect never replays one.
 */
// SPEC-QUESTION: "vibrate on wrong and lockout" gets one pulse, as a lockout follows a wrong answer (DECISIONS, F61).
function useOutcomeHaptics(meId: string): void {
  const event = useRoomStore((state) => state.fx);
  const handledSeq = useRef(event?.seq ?? 0);
  useEffect(() => {
    if (!event || event.seq <= handledSeq.current) return;
    handledSeq.current = event.seq;
    const { fx } = event;
    if (!('vibrate' in navigator) || !('playerId' in fx) || fx.playerId !== meId) return;
    if (fx.kind === 'correct') navigator.vibrate(CORRECT_VIBRATION);
    else if (fx.kind === 'wrong') navigator.vibrate(WRONG_VIBRATION);
  }, [event, meId]);
}

/**
 * Vibrates when a choice or typed question this player answered is revealed (UI spec, Player view:
 * vibrate on correct and wrong). The server sends no `fx` at its close (DECISIONS, F85, F87), so
 * this follows the change from ANSWERING to REVEAL; a reconnect straight into REVEAL never replays it.
 */
function useAnswerHaptics(view: PlayerView): void {
  const lastPhase = useRef(view.phase);
  useEffect(() => {
    const was = lastPhase.current;
    lastPhase.current = view.phase;
    if (was !== 'ANSWERING' || view.phase !== 'REVEAL' || !('vibrate' in navigator)) return;
    const mine = view.choice?.mine ?? view.typed?.mine ?? null;
    if (mine === null) return;
    navigator.vibrate(gotItRight(view) ? CORRECT_VIBRATION : WRONG_VIBRATION);
  }, [view]);
}

/**
 * The status heading's ink (12 § The buzzer): amber where the phone asks for a press or an answer,
 * muted once it is out of the round. The winner's and too early's words sit on their own panel
 * (`STATUS_PANEL`), in ground type.
 */
const STATUS_LOOK: Record<BuzzerKind, string> = {
  idle: 'text-ink-2',
  choice: 'text-accent',
  typed: 'text-accent',
  practice: 'text-accent',
  early: 'text-stop-ink',
  live: 'text-accent',
  pressed: 'text-ink',
  won: 'text-buzz-ink',
  lost: 'text-muted',
  out: 'text-muted',
  revealed: 'text-card-ink',
  final: '',
};

/** The full-width panel under the top bar's rule: amber for the winner, stop for too early. */
const STATUS_PANEL: Partial<Record<BuzzerKind, string>> = {
  won: 'bg-buzz text-buzz-ink',
  early: 'bg-warn text-stop-ink',
};

interface BuzzerProps {
  view: PlayerView;
  /** Sends `player:buzz`, or `player:practice` in the lobby. */
  send: SendPress;
  answer: SendAnswer;
  rename: SendRename;
  leave: SendLeave;
}

/**
 * What covers the buzzer: nothing, the top bar's menu, the Change name form, or (on a landscape
 * phone) the lobby list opened from its pill.
 */
type Panel = 'menu' | 'rename' | 'whosHere' | null;

/**
 * The buzzer screen (UI spec, Player view): the player's avatar, name, room and score on top, the
 * state as a status line, the round BUZZ button, and their rank.
 */
function Buzzer({ view, send, answer, rename, leave }: BuzzerProps) {
  // The local press belongs to one opening; a new question or reopening clears it.
  const opening = `${view.questionIndex}:${view.openingCounter}`;
  const [pressedAt, setPressedAt] = useState<string | null>(null);
  // The local pick on a choice question, shown before the server's `mine` arrives; per opening.
  const [pick, setPick] = useState<{ opening: string; choice: number } | null>(null);
  const picked = (pick?.opening === opening ? pick.choice : null) ?? view.choice?.mine ?? null;
  const countdown = useAnswerCountdown(view);
  const buzzCountdown = useBuzzCountdown(view);
  const answeringCountdown = useAnsweringCountdown(view);
  const held = useFalseStartWait(view, view.falseStartMs, view.falseStart);
  const pointerFine = usePointerFine();
  const state = buzzerState(view, pressedAt === opening, countdown, held, picked, pointerFine);
  // Counts test buzzes, so each one restarts the ring animation.
  const [practices, setPractices] = useState(0);
  const { toast, show } = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [leaving, setLeaving] = useState(false);
  // The opening whose typed answer box has focus: on a short screen the stage then makes room for
  // the box (PLY-03). Per opening, so a box that unmounts while focused leaves no trace.
  const [typingAt, setTypingAt] = useState<string | null>(null);
  const typing = typingAt === opening && view.typed !== null;
  useWakeLock();
  useOutcomeHaptics(view.me.id);
  useAnswerHaptics(view);
  const inLobby = view.phase === 'LOBBY';
  const enabled = state.live || state.kind === 'practice';
  const team = teamOf(view.teams, view.me.id);
  const t = useCopy();

  function press() {
    if (state.kind === 'practice') return practice();
    if (!state.live) return;
    // Feedback first, before the server replies (Buzzer fairness and timing, Client-side speed).
    setPressedAt(opening);
    if ('vibrate' in navigator) navigator.vibrate(30);
    send('player:buzz', (res) => {
      // A refused buzz (rate limit, not joined, offline) frees the button to try again.
      if (res.ok) return;
      setPressedAt((at) => (at === opening ? null : at));
      show(res.error);
    });
  }

  /** A tap on a choice: marked at once, and a different tap changes it until the answering closes. */
  function choose(choice: number) {
    if (state.kind !== 'choice' || choice === picked) return;
    setPick({ opening, choice });
    if ('vibrate' in navigator) navigator.vibrate(30);
    answer({ choice }, (res) => {
      if (res.ok) return;
      // Refused (closed, rate limit, offline): back to what the server has.
      setPick((current) =>
        current?.opening === opening && current.choice === choice ? null : current,
      );
      show(res.error);
    });
  }

  /** A lobby test buzz: the same feedback as a buzz, but the button stays live. */
  function practice() {
    setPractices((count) => count + 1);
    if ('vibrate' in navigator) navigator.vibrate(30);
    send('player:practice', (res) => {
      if (!res.ok) show(res.error);
    });
  }
  function leaveGame() {
    setLeaving(true);
    leave((res) => {
      if (res.ok) return;
      setLeaving(false);
      show(res.error);
    });
  }

  // Space buzzes, except while the menu or the name form is open, or in the typed answer's box:
  // there it types and taps.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (panel !== null) {
      if (event.key === 'Escape') setPanel(null);
      return;
    }
    if (event.target instanceof HTMLInputElement) return;
    if (event.code !== 'Space') return;
    event.preventDefault();
    if (!event.repeat) press();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    press();
  }

  const inGame = view.questionIndex >= 0;
  // Two lines, "Question 3 of 12" over the heading and "Tap to buzz in" under it (09 § Open 3).
  const progress = inGame
    ? t('questionOf', { n: view.questionIndex + 1, count: view.questionCount })
    : null;
  const hint =
    // Only while the buzzers are open: the drained buzzer still takes a false start (F159).
    inGame && state.kind === 'live'
      ? t(pointerFine ? 'clickToBuzzIn' : 'tapToBuzzIn')
      : view.phase === 'LOBBY'
        ? t('youreIn')
        : null;
  const look = BUZZER_LOOK[state.kind];

  return (
    // From `md`, one centred shell holds the top bar, the stage and Who's here, so nothing sits at
    // the window's edges; from `lg` the shell is framed like a device (PLY-07).
    <main className="relative flex h-dvh touch-none flex-col overflow-hidden bg-bg select-none [-webkit-touch-callout:none] md:mx-auto md:w-full md:max-w-2xl lg:my-6 lg:h-[calc(100dvh-3rem)] lg:border-2 lg:border-ink">
      {/* The top bar: the well over the status block's 4px ink rule (12 § Surfaces F176). */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b-4 border-ink bg-surface px-4 py-2 short:py-1">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-bg-deep font-display text-xl text-ink">
            {/* The avatar replaces the initial when the player picked one (F75). */}
            {view.me.avatar ? (
              <PlayerAvatar avatar={view.me.avatar} className="text-2xl" />
            ) : (
              <span aria-hidden="true">{[...view.me.name][0]?.toUpperCase()}</span>
            )}
            {/* Their palette colour, round inside a 2px ink ring (design.md Rules, Content stays content). */}
            <span
              aria-hidden="true"
              data-player-color
              style={{ backgroundColor: view.me.color }}
              className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full ring-2 ring-ink"
            />
          </span>
          {/* Never narrower than the room line: the name takes the room left and truncates, the
              room never does (F159). */}
          <span className="flex flex-1 flex-col">
            <span className="truncate text-lg leading-tight font-bold contain-inline-size">
              {view.me.name}
            </span>
            {/* With teams on, their team's name and colour (UI spec, Player view: top bar; F82). */}
            {team && (
              <span data-team className="flex items-center gap-1.5 text-sm font-semibold">
                <span
                  aria-hidden="true"
                  data-team-color
                  style={{ backgroundColor: team.color }}
                  className="size-2.5 shrink-0 rounded-full ring-2 ring-ink"
                />
                <span className="truncate">{t('teamName', { team: team.name })}</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-sm whitespace-nowrap text-muted">
              <ConnectionDot />
              {t('room', { code: view.code })}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {/* From the first question: "3rd of 8", equal scores sharing a rank (server/ranking.ts). */}
          {inGame && (
            <span
              data-rank
              className="flex flex-col items-end font-sans text-sm leading-tight font-semibold whitespace-nowrap text-muted"
            >
              <span className="font-sans text-sm font-extrabold text-ink tabular-nums">
                {ordinal(view.me.rank)}
              </span>{' '}
              {t('of')} {view.playerCount}
            </span>
          )}
          <span
            aria-label="Score"
            // In amber: a figure under 40px is Sofia Sans 800 in tabular figures (design.md Rules).
            className="font-sans text-xl leading-none font-extrabold whitespace-nowrap text-accent tabular-nums"
          >
            {view.me.score}
          </span>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={panel === 'menu'}
            aria-controls="player-menu"
            onClick={() => setPanel((open) => (open === 'menu' ? null : 'menu'))}
            className={`grid size-11 place-items-center rounded-control border border-edge text-ink ${HOVER}`}
          >
            <Icon name="more" />
          </button>
        </span>
      </header>
      {panel === 'menu' && (
        <>
          {/* Any tap outside closes the menu, and never reaches the buzzer underneath. */}
          <div
            aria-hidden="true"
            data-menu-backdrop
            onPointerDown={(event) => {
              event.preventDefault();
              setPanel(null);
            }}
            className="fixed inset-0 z-10"
          />
          <div
            id="player-menu"
            className="absolute top-16 right-4 z-20 flex w-72 flex-col gap-3 rounded-card border border-edge bg-surface p-3"
          >
            {inLobby && (
              <button type="button" onClick={() => setPanel('rename')} className={BUTTON_SMALL}>
                {t('changeName')}
              </button>
            )}
            <ConfirmButton
              label={t('leaveGame')}
              confirmLabel={t('confirmLeave')}
              onConfirm={leaveGame}
              disabled={leaving}
              className={BUTTON_DANGER}
              cancelClassName={BUTTON_SMALL}
              // Armed, Confirm and Cancel each take a full-width row (PLY-11).
              armedClassName="flex flex-col gap-2"
            />
          </div>
        </>
      )}
      {panel === 'rename' && inLobby && (
        <RenameForm current={view.me.name} rename={rename} onDone={() => setPanel(null)} />
      )}
      {panel === 'whosHere' && view.lobby && (
        <>
          <div
            aria-hidden="true"
            data-menu-backdrop
            onPointerDown={(event) => {
              event.preventDefault();
              setPanel(null);
            }}
            className="fixed inset-0 z-10"
          />
          <WhosHere
            players={view.lobby}
            meId={view.me.id}
            id="whos-here-popover"
            className="absolute top-2 left-4 z-20 max-h-[calc(100dvh-1rem)] w-[min(24rem,calc(100%-2rem))] touch-auto border border-edge"
          />
        </>
      )}
      {state.kind === 'final' ? (
        // Scrolls when it runs taller than the window, as on a landscape phone, so Share stays
        // reachable (PLY-02).
        <section
          aria-label="Final result"
          data-final
          // Left-aligned in one column, as the mock's final frame (player.png).
          className="mx-auto flex min-h-0 w-full max-w-sm flex-1 touch-pan-y flex-col items-stretch justify-center-safe gap-4 overflow-y-auto p-6 short:max-w-none short:gap-2 short:py-3"
        >
          <p className={LABEL}>{t('gameOver')}</p>
          {/* The rank is a figure in DotGothic, 48px and up; side by side on a short screen. */}
          <div className="flex flex-col gap-3 short:flex-row short:items-baseline short:gap-6">
            <p className="font-outlier text-[64px] leading-none break-words text-accent short:text-5xl">
              {state.label}
            </p>
            <p className="font-display text-[44px] leading-none uppercase short:text-3xl">
              {state.detail}
            </p>
          </div>
          {/* With teams on, how their team finished (F82). */}
          {team && view.teams && (
            <p aria-label="Team" className={FINAL_BOX}>
              <span className={LABEL}>{t('teamName', { team: team.name })}</span>
              <span className="flex items-center gap-2 text-lg font-extrabold text-ink tabular-nums">
                <span
                  aria-hidden="true"
                  data-team-color
                  style={{ backgroundColor: team.color }}
                  className="size-3.5 shrink-0 rounded-full ring-2 ring-ink"
                />
                {t('teamRank', {
                  rank: ordinal(team.rank),
                  count: view.teams.length,
                  points: pointsText(t, team.score),
                })}
              </span>
            </p>
          )}
          {/* From game 2, the night so far (F77). */}
          {view.tonight && (
            <p aria-label="Tonight" className={FINAL_BOX}>
              <span className={LABEL}>{t('tonight')}</span>
              <span className="text-lg font-extrabold text-ink tabular-nums">
                {rankText(t, view.tonight.rank, view.tonight.count)} ·{' '}
                {pointsText(t, view.tonight.total)}
              </span>
            </p>
          )}
          {view.results && (
            <ShareResults
              card={() => cardFromPlayer(view, new Date())}
              mode="share"
              className={`${BUTTON_SMALL} mt-2 w-full`}
            />
          )}
        </section>
      ) : (
        <>
          {/*
            On a short screen (a landscape phone) the stage is two columns (PLY-01): the status
            and countdowns on the left, the buzzer or the answers on the right. The spacer
            rows centre the left column; while the typed answer has focus they give way, so the
            box sits at the top. The stage scrolls there rather than clip.
          */}
          <div
            data-stage
            className={`flex min-h-0 flex-1 flex-col items-center justify-evenly gap-4 px-4 py-2 short:grid short:touch-pan-y short:gap-x-6 short:gap-y-3 short:overflow-y-auto ${
              view.choice || view.typed
                ? 'short:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
                : look
                  ? 'short:grid-cols-[minmax(0,1fr)_auto]'
                  : 'short:grid-cols-1'
            } ${typing ? 'short:grid-rows-[0_auto_auto_1fr]' : 'short:grid-rows-[1fr_auto_auto_1fr]'}`}
          >
            <div
              data-status-column
              // Around a drawn buzzer, the status and the row under it share the height equally, so
              // the buzzer holds its place as lines come and go between states.
              className={`flex w-full flex-col items-center gap-5 short:col-start-1 short:row-start-2 short:gap-3 ${look ? 'flex-1 justify-end' : ''}`}
            >
              <BuzzerStatus state={state} progress={progress} hint={hint} compact={typing} />
              {view.lobby && (
                <button
                  type="button"
                  aria-expanded={panel === 'whosHere'}
                  aria-controls="whos-here-popover"
                  onClick={() => setPanel((open) => (open === 'whosHere' ? null : 'whosHere'))}
                  className={`${PILL} hidden min-h-11 items-center gap-2 px-4 font-bold short:inline-flex ${HOVER}`}
                >
                  {t('hereCount', { n: view.lobby.length })}
                  <Icon name="chevron-down" className="size-5 text-muted" />
                </button>
              )}
            </div>
            {view.choice ? (
              <ChoiceButtons
                className={ANSWER_CELL}
                choice={view.choice}
                picked={picked}
                enabled={state.kind === 'choice'}
                onPick={choose}
              />
            ) : view.typed ? (
              // Keyed by the opening, so a new question starts with an empty box.
              <TypedAnswer
                key={opening}
                className={`${ANSWER_CELL} ${typing ? 'short:row-start-2 short:row-end-4 short:self-start' : ''}`}
                typed={view.typed}
                enabled={state.kind === 'typed' && !view.typed.closed}
                answer={answer}
                onRefused={show}
                onTyping={(focused) => setTypingAt(focused ? opening : null)}
              />
            ) : look ? (
              // The buzzer's slot, a size container: it gives way when the stage is short, so the
              // buzzer and its ring never cross Who's here (F158); the key edge sits inside the ring.
              // On a short screen it steps aside and the buzzer is a cell of the stage's grid.
              <div
                data-buzzer-slot
                className="flex min-h-0 w-full basis-[min(320px,86vw,44dvh)] justify-center [container-type:size] md:basis-[min(440px,64vw,48dvh)] short:contents"
              >
                {/* The amber buzzer in its bulb ring (index.css `.lit-buzzer`): its state is
                  BUZZER_LOOK's data attributes. BUZZ is a third of the ring's width, as the mock. */}
                <button
                  type="button"
                  disabled={!enabled}
                  data-look={state.kind}
                  data-cap={look?.cap}
                  data-bulb={look?.bulb}
                  data-tone={look?.tone}
                  data-mark={look?.mark}
                  data-practices={state.kind === 'practice' ? practices : undefined}
                  aria-describedby="buzzer-status"
                  onPointerDown={onPointerDown}
                  onContextMenu={(event) => event.preventDefault()}
                  className={`lit-buzzer size-[100cqh] shrink-0 touch-none text-[calc(100cqh/3.3)] ${ANSWER_CELL} short:size-[min(70dvh,42vw)] short:text-[min(21dvh,12.7vw)] select-none [-webkit-touch-callout:none]`}
                >
                  <BulbRing />
                  {state.kind === 'practice' && practices > 0 && (
                    // Keyed by the count, so every test buzz lights the ring again.
                    <BulbRing key={practices} flare />
                  )}
                  <span className="lit-buzzer-cap">
                    <span className="lit-buzzer-label">BUZZ</span>
                  </span>
                </button>
              </div>
            ) : null}
            {(look || buzzCountdown || answeringCountdown) && (
              <div
                className={`flex flex-col items-center gap-4 short:col-start-1 short:row-start-3 ${look ? 'flex-1' : ''}`}
              >
                {/* With a mouse and keyboard, the Space key under the buzzer (PLY-10). */}
                {pointerFine &&
                  !view.choice &&
                  !view.typed &&
                  (state.kind === 'practice' || state.kind === 'live') && (
                    <p
                      aria-hidden="true"
                      data-space-hint
                      className="flex shrink-0 items-center gap-2 text-muted short:hidden"
                    >
                      <kbd className="border-2 border-b-4 border-ink bg-surface px-3 py-0.5 font-mono text-sm text-ink">
                        Space
                      </kbd>{' '}
                      {t('spaceToBuzz')}
                    </p>
                  )}
                {/* The winner's answer countdown, a DotGothic figure under the buzzer (12 § The buzzer). */}
                {state.secondsLeft !== undefined && (
                  <span
                    aria-label="Seconds left"
                    className="font-outlier text-[110px] leading-none text-accent tabular-nums short:text-6xl"
                  >
                    {state.secondsLeft}
                  </span>
                )}
                {/* The buzz time left, while the buzzers are open (DECISIONS, F64). */}
                {buzzCountdown && (
                  <p
                    role="timer"
                    aria-label="Buzz time"
                    className="flex shrink-0 flex-col items-center gap-1 font-sans text-sm font-semibold text-muted"
                  >
                    <span className="font-outlier text-[64px] leading-none text-accent tabular-nums short:text-5xl">
                      {buzzCountdown.secondsLeft}
                    </span>
                    {t(buzzCountdown.secondsLeft === 1 ? 'secondToBuzz' : 'secondsToBuzz')}
                  </p>
                )}
                {/* The time left to answer a choice or typed question (F86, F88). */}
                {answeringCountdown && (
                  <p
                    role="timer"
                    aria-label="Time to answer"
                    className="flex shrink-0 items-baseline gap-2 font-sans text-sm font-semibold text-muted"
                  >
                    <span className="font-outlier text-5xl leading-none text-accent tabular-nums">
                      {answeringCountdown.secondsLeft}
                    </span>
                    {t(answeringCountdown.secondsLeft === 1 ? 'secondToAnswer' : 'secondsToAnswer')}
                  </p>
                )}
              </div>
            )}
          </div>
          {/* On a short screen it folds into the pill above. */}
          {view.lobby && (
            <WhosHere
              players={view.lobby}
              meId={view.me.id}
              className="mx-4 mb-4 max-h-[24dvh] shrink-0 short:hidden"
            />
          )}
        </>
      )}
      <Toast toast={toast} />
    </main>
  );
}

/** The right-hand cell of the short-screen stage: the buzzer, the choices or the typed answer. */
const ANSWER_CELL = 'short:col-start-2 short:row-span-4 short:row-start-1 short:self-center';

/** The final result's Team and Tonight boxes: a well on a rule hairline (player.png, final). */
const FINAL_BOX = 'flex flex-col gap-1 rounded-card border border-edge bg-surface px-3 py-2';

/** Where each of the ring's 22 bulbs sits, as a turn about its centre. */
const BULB_TURNS = Array.from({ length: 22 }, (_, index) => `${(index * 360) / 22}deg`);

/**
 * The buzzer's ring of 22 bulbs (index.css `.lit-buzzer-bulb`); the button's `data-bulb` lights
 * them. `flare`: the copy a lobby test press lights once, fading out.
 */
function BulbRing({ flare = false }: { flare?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-practice-ring={flare || undefined}
      className={`lit-buzzer-ring ${flare ? 'lit-buzzer-flare motion-safe:animate-bulb-flare' : ''}`}
    >
      {BULB_TURNS.map((turn) => (
        <span key={turn} className="lit-buzzer-bulb" style={{ rotate: turn }} />
      ))}
    </span>
  );
}

interface ChoiceButtonsProps {
  className: string;
  choice: PlayerChoiceView;
  /** This player's pick: the local tap, else the server's `mine`. */
  picked: number | null;
  /** Answers are being taken (ANSWERING). Before that the buttons preview the choices. */
  enabled: boolean;
  onPick: (choice: number) => void;
}

/**
 * A choice question on the phone (UI spec, Player view): one big button per choice, its letter on a
 * square in the choice's colour, with the choice text. The pick turns blue and stays marked "Your
 * pick". At REVEAL the correct one turns blue with a check, a wrong pick takes a stop edge, and the
 * others dim; the view has no correct choice before then.
 */
function ChoiceButtons({ className, choice, picked, enabled, onPick }: ChoiceButtonsProps) {
  const revealed = choice.correctChoice !== undefined;
  const t = useCopy();
  return (
    <ol
      aria-label="Choices"
      // A 2×2 grid on a short screen, so four choices fit without the inner scroll (PLY-04), and
      // from `md`, where it mirrors the Screen's A/B over C/D in the same tile colours (PLY-09).
      className={`flex min-h-0 w-full max-w-sm shrink touch-auto flex-col gap-3 overflow-y-auto p-1 md:grid md:max-w-2xl md:grid-cols-2 md:overflow-visible short:grid short:max-w-none short:grid-cols-2 short:gap-2 short:overflow-visible ${className}`}
    >
      {choice.choices.map((text, index) => {
        const mine = picked === index;
        const correct = revealed && index === choice.correctChoice;
        return (
          <li key={index}>
            <button
              type="button"
              aria-pressed={mine}
              disabled={!enabled}
              data-correct={correct || undefined}
              onClick={() => onPick(index)}
              // The well on a rule edge (components-player.png); the pick or the right answer turns blue.
              className={`relative flex min-h-16 w-full items-center gap-3 rounded-control border-2 px-3 py-2.5 text-left text-lg leading-snug font-semibold md:h-full short:h-full short:min-h-14 short:gap-2 short:px-2 short:py-1.5 short:text-base not-disabled:hover:hover-tint ${
                (mine && !revealed) || correct
                  ? 'border-accent-2 bg-accent-2 text-accent-2-ink'
                  : mine
                    ? 'border-stop bg-surface text-ink'
                    : 'border-edge bg-surface text-ink'
              } ${(revealed && !correct) || (!revealed && !enabled) ? 'opacity-50' : ''}`}
            >
              {/* The letter on its colour, in ground type, which reads on all four (F86). */}
              <span
                data-choice-letter
                style={{ backgroundColor: CHOICE_COLORS[index] }}
                className="grid size-11 shrink-0 place-items-center rounded-control font-display text-2xl text-accent-ink short:size-9 short:text-xl"
              >
                {CHOICE_LETTERS[index]}
              </span>
              <span className="min-w-0 flex-1 break-words">{text}</span>
              {correct && (
                <>
                  <span className="sr-only">, correct</span>
                  <Icon name="check" className="size-7 shrink-0" />
                </>
              )}
              {mine && (
                // On a short screen's narrow tile, the badge sits on the top edge.
                <span className="shrink-0 rounded-pill bg-bg px-2.5 py-1 font-sans text-sm whitespace-nowrap text-ink short:absolute short:-top-3 short:right-2 short:py-0">
                  {t('yourPick')}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

interface TypedAnswerProps {
  className: string;
  typed: PlayerTypedView;
  /** Answers are being taken and not yet locked. Before and after, the box shows but is disabled. */
  enabled: boolean;
  answer: SendAnswer;
  onRefused: (error: string) => void;
  /** The box took or lost focus. */
  onTyping: (focused: boolean) => void;
}

/**
 * A typed question on the phone (UI spec, Player view): a text box and **Send**. The answer can be
 * edited and sent again until the answers lock; the server's `mine` is what counts as sent, so
 * Send is off while the box holds it. Enter sends too.
 */
function TypedAnswer({ className, typed, enabled, answer, onRefused, onTyping }: TypedAnswerProps) {
  const [draft, setDraft] = useState(typed.mine ?? '');
  const [sending, setSending] = useState(false);
  const text = draft.trim();
  const canSend = enabled && !sending && text !== '' && text !== typed.mine;
  const t = useCopy();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    // Drops the keyboard, so the status line above shows "Answer sent".
    const input = event.currentTarget.elements.namedItem('typed-answer');
    if (input instanceof HTMLInputElement) input.blur();
    answer({ text }, (res) => {
      setSending(false);
      if (!res.ok) onRefused(res.error);
    });
  }

  return (
    <form
      onSubmit={submit}
      aria-label="Your answer"
      // One row on a short screen, so the box and Send fit above the keyboard (PLY-03).
      className={`flex w-full max-w-sm shrink-0 touch-auto flex-col gap-3 short:max-w-none short:flex-row ${className}`}
    >
      <label htmlFor="typed-answer" className={`${LABEL} -mb-1 short:sr-only`}>
        {t('yourAnswer')}
      </label>
      <input
        id="typed-answer"
        name="typed-answer"
        // Once locked, the box shows what the server has, not an edit that was never sent.
        value={enabled ? draft : (typed.mine ?? '')}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => {
          onTyping(true);
          event.currentTarget.scrollIntoView({ block: 'nearest' });
        }}
        onBlur={() => onTyping(false)}
        disabled={!enabled}
        placeholder={enabled ? t('typeYourAnswer') : ''}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        maxLength={TYPED_ANSWER_MAX}
        className={`${INPUT} min-w-0 text-lg select-text disabled:opacity-60 short:flex-1`}
      />
      {/* At REVEAL the box stays as a record of the answer; there is nothing left to send. */}
      {typed.groups === undefined && (
        <button
          type="submit"
          disabled={!canSend}
          // Keeps focus in the box: a blur on press would end `typing` and move Send on a short
          // screen before the click lands (F162). Submit drops the keyboard itself.
          onMouseDown={(event) => event.preventDefault()}
          className={`${BUTTON_PRIMARY_SMALL} short:shrink-0`}
        >
          {t('send')}
        </button>
      )}
    </form>
  );
}

interface RenameFormProps {
  current: string;
  rename: SendRename;
  onDone: () => void;
}

/**
 * Change name, from the top bar's menu in the lobby: the join form's field and rules over the
 * buzzer. A refusal ("That name is taken") stays on the form, as on the join form.
 */
function RenameForm({ current, rename, onDone }: RenameFormProps) {
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const t = useCopy();

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = playerNameSchema.safeParse(name);
    if (!parsed.success) {
      return setError(nameError(t, name, parsed.error.issues[0]?.message));
    }
    if (parsed.data === current) return onDone();
    setError(null);
    setSending(true);
    rename(parsed.data, (res) => {
      setSending(false);
      if (res.ok) return onDone();
      setError(res.error);
    });
  }

  return (
    // Scrolls, so Save stays reachable with the keyboard open (PLY-05).
    <div
      data-rename-overlay
      className="fixed inset-0 z-20 flex touch-auto items-center-safe justify-center overflow-y-auto bg-bg/95 px-4 py-4 short:items-start"
    >
      <form
        onSubmit={submit}
        aria-labelledby="rename-heading"
        className={`flex w-full max-w-md flex-col gap-4 ${CARD}`}
      >
        <h2 id="rename-heading" className="font-display text-3xl text-accent uppercase">
          {t('changeName')}
        </h2>
        <label htmlFor="new-name" className={LABEL}>
          {t('yourName')}
        </label>
        <input
          id="new-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          autoComplete="nickname"
          autoCapitalize="words"
          enterKeyHint="done"
          maxLength={PLAYER_NAME_MAX}
          aria-invalid={error !== null}
          aria-describedby={error ? 'rename-error' : undefined}
          className={`${INPUT} text-lg select-text`}
        />
        {error && (
          <p id="rename-error" role="alert" className="text-lg text-stop">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onDone} className={`${BUTTON_SMALL} flex-1`}>
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={name.trim() === '' || sending}
            className={`${BUTTON_PRIMARY_SMALL} flex-1`}
          >
            {t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * The lobby's "Who's here" list (UI spec, Player view): this phone's own name first, then the
 * others in join order, each in their colour. It scrolls by itself once a big room overflows it.
 */
function WhosHere({
  players,
  meId,
  id,
  className,
}: {
  players: LobbyPlayer[];
  meId: string;
  id?: string;
  className: string;
}) {
  const headingId = useId();
  const ordered = [
    ...players.filter((player) => player.id === meId),
    ...players.filter((player) => player.id !== meId),
  ];
  const t = useCopy();
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`flex min-h-0 flex-col gap-2 rounded-card bg-surface px-4 py-3 ${className}`}
    >
      <h2 id={headingId} className={LABEL}>
        {t('whosHere', { n: players.length })}
      </h2>
      <ul className="flex touch-pan-y flex-wrap gap-2 overflow-y-auto">
        {ordered.map((player) => (
          <li
            key={player.id}
            data-connected={player.connected}
            // A chip: the ground on a rule hairline, the swatch round in its ink ring; away at 40%.
            className={`flex max-w-full items-center gap-2 rounded-control border border-edge bg-bg py-1 pr-3 pl-1.5 font-semibold ${player.connected ? '' : 'opacity-40'}`}
          >
            <span
              aria-hidden="true"
              data-player-color
              style={{ backgroundColor: player.color }}
              className="size-4 shrink-0 rounded-full ring-2 ring-ink"
            />
            <PlayerAvatar avatar={player.avatar} />
            <span className="truncate">{player.name}</span>
            {player.id === meId && <span className="text-sm text-muted">{t('you')}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The status under the top bar's 4px ink rule (player.png): "Question 3 of 12", the state's word as
 * an Antonio heading, and a hint under it ("Tap to buzz in"), centred. The winner's word sits on a
 * full-width amber panel, too early's on stop red, and at reveal the answer takes the answer card:
 * amber, blue when this player got it, stop when they got it wrong.
 */
function BuzzerStatus({
  state,
  progress,
  hint,
  compact,
}: {
  state: BuzzerState;
  /** "Question 3 of 12", from the first question. */
  progress: string | null;
  /** The line under the heading: "Tap to buzz in" while live, "You're in!" in the lobby. */
  hint: string | null;
  /** The typed answer has focus: on a short screen, one smaller line (PLY-03). */
  compact: boolean;
}) {
  const t = useCopy();
  const revealed = state.kind === 'revealed';
  // "Answer sent" and "Answers closed" ask nothing more of the player, so they drop the amber.
  const settled = state.label === t('answerSent') || state.label === t('answersClosed');
  const heading = (
    <h1
      id="buzzer-status"
      className={`break-words ${
        revealed
          ? 'font-sans text-[30px] leading-tight font-bold'
          : `font-display uppercase ${state.label.length > 40 ? 'text-2xl' : 'text-[44px] leading-none'} ${compact ? 'short:text-xl' : 'short:text-3xl'}`
      } ${settled ? 'text-ink' : STATUS_LOOK[state.kind]}`}
    >
      {state.label}
    </h1>
  );
  if (revealed) {
    const wrong = state.verdict === 'wrong' || state.detail?.startsWith('−');
    // A caption is set only when this player's own answer was right.
    const right = !wrong && (state.verdict === 'correct' || state.caption !== undefined);
    return (
      <section
        aria-label="Answer"
        // The answer card (components-player.png): the well, its edge and top bar in the verdict's ink.
        data-card
        className={`flex w-full max-w-sm flex-col items-start gap-2 rounded-card border-2 border-t-4 bg-card px-5 py-4 text-card-ink shadow-card ${
          wrong ? 'border-stop' : right ? 'border-win' : 'border-accent'
        }`}
      >
        <p
          className={`font-sans text-sm font-bold ${wrong ? 'text-stop' : right ? 'text-win' : 'text-ink'}`}
        >
          {state.caption ?? t('answer')}
        </p>
        {heading}
        {(state.detail || state.verdict) && (
          // Points as a game-state chip with its word (design.md Rules): win for a score, stop for
          // a wrong answer or a penalty. A figure under 40px, so Sofia Sans 800.
          // The word is a step smaller, so "Correct! +100" holds one line at 375 (F159).
          <span
            data-points-chip
            data-verdict={state.verdict}
            className={`flex flex-wrap items-baseline gap-x-3 rounded-control px-3 py-1 font-sans text-2xl leading-none font-extrabold tabular-nums ${
              wrong ? 'bg-stop text-stop-ink' : 'bg-win text-win-ink'
            }`}
          >
            {state.verdict && <span className="text-lg">{t(state.verdict)}</span>}
            {state.detail && <span>{state.detail}</span>}
          </span>
        )}
      </section>
    );
  }
  const panel = STATUS_PANEL[state.kind];
  const Block = state.kind === 'won' ? 'section' : 'div';
  return (
    <Block
      aria-label={state.kind === 'won' ? 'Your turn' : undefined}
      data-status-panel={panel ? state.kind : undefined}
      // A panel runs the stage's full width, out through its padding (short: inside its column).
      className={`flex flex-col items-center gap-1 text-center ${
        panel
          ? `-mx-4 w-[calc(100%+2rem)] px-4 py-3 short:mx-0 short:w-full ${panel}`
          : 'w-full max-w-sm'
      }`}
    >
      {progress && (
        <p
          className={`${panel ? 'font-sans text-sm font-semibold' : LABEL} ${compact ? 'short:hidden' : ''}`}
        >
          {progress}
        </p>
      )}
      {heading}
      {hint && <p className={`text-muted ${compact ? 'short:hidden' : ''}`}>{hint}</p>}
    </Block>
  );
}

/**
 * Change name's refusal: an empty name, else the name rule's message. The rule's messages come
 * from the shared schema and stay English, like the server's errors (DECISIONS, F91).
 */
function nameError(t: Translate, name: string, ruleMessage: string | undefined): string {
  return name.trim() === '' ? t('enterYourName') : (ruleMessage ?? t('nameWontWork'));
}

function PlayMessage({
  title,
  detail,
  link = true,
}: {
  title: string;
  detail?: string;
  link?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-display text-4xl">{title}</h1>
      {detail && <p className="text-lg text-muted">{detail}</p>}
      {link && (
        <Link to="/" className={`${LINK} text-lg`}>
          Back to start
        </Link>
      )}
    </main>
  );
}

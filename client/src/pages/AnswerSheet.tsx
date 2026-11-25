import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Question, QuestionSet } from '../../../shared/types.js';
import { getSet } from '../lib/db.js';
import { BUTTON_PRIMARY_SMALL, LINK } from '../lib/ui.js';

const LOAD_ERROR = 'Could not load this set in this browser.';

type Load =
  | { state: 'loading' }
  | { state: 'missing' }
  | { state: 'error' }
  | { state: 'ready'; set: QuestionSet };

/**
 * **Print answer sheet** `/sets/:setId/print`: number, question, answer and notes for every
 * question, for a host running the game from the Screen without a phone. Ground ink on white, with
 * no bulbs, edges or dark fills (design.md Variants): on screen it sits on the cream ink, and on
 * paper nothing is painted, so it prints the same with or without background graphics. The title
 * is Antonio capitals; heads, labels and numbers are Sofia Sans. The buttons are left off the paper.
 */
export function AnswerSheet() {
  const { setId = '' } = useParams();
  const [load, setLoad] = useState<Load>({ state: 'loading' });

  useEffect(() => {
    let live = true;
    getSet(setId).then(
      (set) => live && setLoad(set ? { state: 'ready', set } : { state: 'missing' }),
      () => live && setLoad({ state: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [setId]);

  const set = load.state === 'ready' ? load.set : null;
  // The title names the printout (and the PDF a browser saves), then goes back on leaving.
  useEffect(() => {
    if (!set) return;
    const previous = document.title;
    document.title = `${set.title} – answer sheet`;
    return () => {
      document.title = previous;
    };
  }, [set]);

  return (
    <main className="min-h-dvh bg-ink px-4 py-8 text-paper print:bg-transparent print:p-0">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link to={`/sets/${encodeURIComponent(setId)}`} className={`${LINK} text-lg text-paper!`}>
            Back to the editor
          </Link>
          {set && (
            <button
              type="button"
              onClick={() => window.print()}
              className={`${BUTTON_PRIMARY_SMALL} text-lg`}
            >
              Print
            </button>
          )}
        </div>

        {load.state === 'loading' && <p>Loading…</p>}
        {load.state === 'missing' && <p role="alert">This set no longer exists.</p>}
        {load.state === 'error' && <p role="alert">{LOAD_ERROR}</p>}
        {set && <Sheet set={set} />}
      </div>
    </main>
  );
}

function Sheet({ set }: { set: QuestionSet }) {
  const count = set.questions.length;
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl break-words uppercase sm:text-7xl">{set.title}</h1>
        <p className="font-sans">
          {count} {count === 1 ? 'question' : 'questions'}
        </p>
      </header>
      {count === 0 ? (
        <p>This set has no questions yet.</p>
      ) : (
        <>
          {/* A table from `sm`, and always on paper, so the printout is unchanged (LIB-07). */}
          <table className="hidden w-full border-collapse text-left align-top sm:table print:table">
            <thead>
              <tr className="border-b-2 border-paper font-sans font-bold">
                <th scope="col" className="w-12 py-2 pr-3">
                  #
                </th>
                <th scope="col" className="py-2 pr-3">
                  Question
                </th>
                <th scope="col" className="py-2 pr-3">
                  Answer
                </th>
                <th scope="col" className="py-2">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {set.questions.map((question, index) => (
                <tr key={question.id} className="break-inside-avoid border-b border-paper">
                  <td className="py-2 pr-3 align-top tabular-nums">{index + 1}</td>
                  <td className="py-2 pr-3 align-top break-words whitespace-pre-line">
                    <QuestionText question={question} />
                  </td>
                  <td className="py-2 pr-3 align-top font-semibold break-words">
                    {question.answer}
                  </td>
                  <td className="py-2 align-top break-words whitespace-pre-line">
                    {question.hostNotes ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* On a phone, four columns crush the words, so each question is a block of its own. */}
          <ol aria-label="Questions" className="flex flex-col sm:hidden print:hidden">
            {set.questions.map((question, index) => {
              const notes = question.hostNotes?.trim() ?? '';
              return (
                <li
                  key={question.id}
                  aria-label={`Question ${index + 1}`}
                  className="flex flex-col gap-1 border-b border-paper py-3"
                >
                  <p className="break-words whitespace-pre-line">
                    <span className="font-bold tabular-nums">{index + 1}.</span>{' '}
                    <QuestionText question={question} />
                  </p>
                  <p className="break-words">
                    <span className="font-sans text-sm font-bold">Answer</span>{' '}
                    <strong className="font-semibold">{question.answer}</strong>
                  </p>
                  {notes !== '' && (
                    <p className="break-words whitespace-pre-line">
                      <span className="font-sans text-sm font-bold">Notes</span> {notes}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}

/** A question's text, or a word on its picture when it has one. */
function QuestionText({ question }: { question: Question }) {
  const text = question.text.trim();
  return (
    <>
      {text || (question.imageId ? <em>(picture question)</em> : '')}
      {text && question.imageId && <em> (with a picture)</em>}
    </>
  );
}

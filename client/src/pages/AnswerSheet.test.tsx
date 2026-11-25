// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '../../../shared/types.js';
import { db } from '../lib/db.js';
import { AnswerSheet } from './AnswerSheet.js';
import css from '../index.css?raw';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.sets.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function seed(questions: Question[]) {
  await db.sets.add({
    id: 'set-1',
    title: 'Pub quiz',
    questions,
    createdAt: 1,
    updatedAt: 2,
    schemaVersion: 1,
  });
}

function renderSheet(id = 'set-1') {
  return render(
    <MemoryRouter initialEntries={[`/sets/${id}/print`]}>
      <Routes>
        <Route path="/sets/:setId/print" element={<AnswerSheet />} />
      </Routes>
    </MemoryRouter>,
  );
}

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

describe('Print answer sheet /sets/:setId/print', () => {
  it('lists number, question, answer and notes for every question, in set order', async () => {
    await seed([
      { id: 'a', text: 'Capital of France?', answer: 'Paris', hostNotes: 'Not Lyon', points: 100 },
      { id: 'b', text: 'Largest planet?', answer: 'Jupiter', points: 200 },
    ]);
    renderSheet();
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Pub quiz');
    expect(screen.getByText('2 questions')).toBeTruthy();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map(cells)).toEqual([
      ['1', 'Capital of France?', 'Paris', 'Not Lyon'],
      ['2', 'Largest planet?', 'Jupiter', ''],
    ]);
  });

  it('prints ground ink on white, with no bulbs, edges or dark fills, and the labels in sentence case (F182)', async () => {
    await seed([{ id: 'a', text: 'Q', answer: 'A', hostNotes: 'N', points: 100 }]);
    renderSheet();
    const title = await screen.findByRole('heading', { level: 1 });
    const page = title.closest('main')!;
    expect(page.className.split(' ')).toEqual(
      expect.arrayContaining(['text-paper', 'print:bg-transparent']),
    );
    // What prints: the screen-only bar (Back, the Print button in the capitals of every primary) is left out.
    const printed = page.cloneNode(true) as HTMLElement;
    printed.querySelectorAll('.print\\:hidden').forEach((el) => el.remove());
    // Only the title is in capitals (Antonio, design.md Rules); nothing is tracked.
    expect(title.className).toContain('uppercase');
    printed.querySelector('h1')!.classList.remove('uppercase');
    expect(printed.innerHTML).not.toMatch(/uppercase|tracking-|text-black|bg-black/);
    // design.md Variants: no amber or blue, no bulbs, no key edges and no dark fill on the paper.
    expect(printed.innerHTML).not.toMatch(
      /accent|mix-blend|bulb|shadow|bg-(bg|surface|paper|shade|ink)|text-muted|text-ink|card-ink/,
    );
    // No bar over the title; the numbers are Sofia Sans figures, not a display face.
    expect(title.parentElement!.className).not.toMatch(/border/);
    expect(screen.getAllByRole('cell')[0]!.className).not.toContain('font-display');
    expect(screen.queryByText(/host only/i)).toBeNull();
    // The header is the set's title, then its count: nothing small stands over the title.
    expect(title.previousElementSibling).toBeNull();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      '#',
      'Question',
      'Answer',
      'Notes',
    ]);
  });

  it('prints on a light scheme, so the dark tokens never paint the paper warm black (F182)', () => {
    // Unlayered, to beat tokens.css's `:root { color-scheme: dark }`.
    expect(css).toMatch(/^@media print \{\s*:root \{\s*color-scheme: light;/m);
  });

  it('marks a picture-only question, whose text is empty', async () => {
    await seed([{ id: 'a', text: '', imageId: 'img', answer: 'Eiffel Tower', points: 100 }]);
    renderSheet();
    const row = (await screen.findAllByRole('row'))[1]!;
    expect(cells(row)).toEqual(['1', '(picture question)', 'Eiffel Tower', '']);
  });

  it('Print opens the browser print dialog, and the controls stay off the paper', async () => {
    await seed([{ id: 'a', text: 'Q', answer: 'A', points: 100 }]);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderSheet();
    const button = await screen.findByRole('button', { name: 'Print' });
    fireEvent.click(button);
    expect(print).toHaveBeenCalledOnce();
    expect(button.parentElement!.className).toContain('print:hidden');
  });

  it('names the printout after the set, and restores the title on leaving', async () => {
    document.title = 'Buzzr';
    await seed([]);
    const view = renderSheet();
    await screen.findByText('This set has no questions yet.');
    expect(document.title).toBe('Pub quiz – answer sheet');
    view.unmount();
    expect(document.title).toBe('Buzzr');
  });

  it('says so when the set no longer exists', async () => {
    renderSheet('gone');
    expect((await screen.findByRole('alert')).textContent).toBe('This set no longer exists.');
  });

  it('below sm, each question is a stacked block, and the table is kept for sm and for print (LIB-07)', async () => {
    await seed([
      { id: 'a', text: 'Capital of France?', answer: 'Paris', hostNotes: 'Not Lyon', points: 100 },
      { id: 'b', text: '', imageId: 'img', answer: 'Eiffel Tower', points: 200 },
    ]);
    renderSheet();
    const table = await screen.findByRole('table');
    expect(table.className.split(' ')).toEqual(
      expect.arrayContaining(['hidden', 'sm:table', 'print:table']),
    );
    const stacked = screen.getByRole('list', { name: 'Questions' });
    expect(stacked.className.split(' ')).toEqual(
      expect.arrayContaining(['sm:hidden', 'print:hidden']),
    );
    const blocks = within(stacked).getAllByRole('listitem');
    expect(blocks.map((block) => block.textContent)).toEqual([
      '1. Capital of France?Answer ParisNotes Not Lyon',
      '2. (picture question)Answer Eiffel Tower',
    ]);
    expect(within(blocks[0]!).getByText('Paris').tagName).toBe('STRONG');
  });
});

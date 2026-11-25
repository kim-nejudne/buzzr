import type { ReactNode } from 'react';
import { LABEL } from '../lib/ui.js';

/** One figure of an admin summary, inside a `<dl>`: a box on the well with a 2px rule edge, the figure over its label (F183). */
export function AdminTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse justify-end gap-2 rounded-card border-2 border-edge bg-surface p-3">
      <dt className={LABEL}>{label}</dt>
      <dd className="flex flex-col">{children}</dd>
    </div>
  );
}

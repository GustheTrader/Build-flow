import type { ReactNode } from 'react';

/** Touch-sized building blocks for the field app (48px targets, 16px text so phones don't zoom into fields). */
export const primary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-blue-600 px-4 text-[15px] font-medium text-white active:bg-blue-700 disabled:opacity-40';
export const secondary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-sm border border-gray-200 bg-white px-4 text-[15px] font-medium text-gray-800 active:bg-gray-100 disabled:opacity-40';
export const small = 'inline-flex min-h-10 items-center justify-center rounded-sm border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 active:bg-gray-100 disabled:opacity-40';
export const fieldCls = 'min-h-12 w-full rounded-sm border border-gray-200 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export const Label = ({ text, children }: { text: string; children: ReactNode }) => (
  <label className="flex flex-col gap-1.5 text-xs text-gray-500">{text}{children}</label>
);

export const Panel = ({ title, right, children }: { title?: ReactNode; right?: ReactNode; children: ReactNode }) => (
  <section className="rounded-md border border-gray-200 bg-white">
    {(title || right) && <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3"><h2 className="label-mono !text-gray-600">{title}</h2>{right}</header>}
    <div className="p-4">{children}</div>
  </section>
);

export const Err = ({ text }: { text: string | null }) => (text ? <p className="text-sm text-red-600" role="alert">{text}</p> : null);

/** A bottom sheet over the page. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="flex-1 bg-black/60" aria-label="Close" onClick={onClose} />
      <div className="max-h-[80dvh] overflow-y-auto rounded-t-lg border-t border-gray-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-2xl text-gray-900">{title}</h2><button type="button" className={small} onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

export const fmtDay = (d?: string) => (d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
/** The phone's own date, as YYYY-MM-DD (not UTC: an evening in Kentucky is already tomorrow in UTC). */
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

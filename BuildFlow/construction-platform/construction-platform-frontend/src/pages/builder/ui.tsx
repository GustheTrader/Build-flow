import type { ReactNode } from 'react';

/** Small shared pieces for the builder pages, in the app's Tailwind style. */

export const btn = 'inline-flex items-center gap-1 rounded-sm bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-40';
export const btn2 = 'inline-flex items-center gap-1 rounded-sm border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 disabled:opacity-40';
export const input = 'w-full rounded-sm border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

export function Card({ title, actions, children }: { title?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white">
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
          <h3 className="label-mono !text-gray-600">{title}</h3>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-xs text-gray-500 ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  );
}

const PILL: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', pending_client: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800', void: 'bg-gray-100 text-gray-500 line-through', not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-800', complete: 'bg-green-100 text-green-800', pending: 'bg-amber-100 text-amber-800',
  selected: 'bg-blue-100 text-blue-800', ordered: 'bg-green-100 text-green-800', sent: 'bg-blue-100 text-blue-800', accepted: 'bg-green-100 text-green-800',
};
export const Pill = ({ value }: { value: string }) => (
  <span className={`inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider ${PILL[value] ?? 'bg-gray-100 text-gray-700'}`}>{value.replace(/_/g, ' ')}</span>
);

export const ErrorText = ({ error }: { error: string | null }) => (error ? <p className="mt-2 text-sm text-red-600" role="alert">{error}</p> : null);
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-6 text-center text-sm text-gray-500">{children}</p>;
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

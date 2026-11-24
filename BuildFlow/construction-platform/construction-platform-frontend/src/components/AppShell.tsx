import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Calculator, CheckSquare, FileText, FolderKanban, LayoutDashboard, HardHat, LogOut, Menu, Moon, Phone, ShoppingCart, Sun, Target, Users, X } from 'lucide-react';
import { auth } from '../lib/api';
import { BRAND } from '../brand';

/**
 * The app frame: a numbered sidebar (workspace sections and the AI desk) with the company's mark, and a top bar
 * with where you are, the light/dark switch and sign-out. On small screens the sidebar becomes a drawer.
 */
const NAV: { group: string; items: { to: string; label: string; icon: ReactNode }[] }[] = [
  { group: 'Workspace', items: [
    { to: '/', label: 'Daily Operations', icon: <LayoutDashboard size={16} /> },
    { to: '/leads', label: 'Leads', icon: <Target size={16} /> },
    { to: '/estimates', label: 'Estimates', icon: <Calculator size={16} /> },
    { to: '/projects', label: 'Jobs', icon: <FolderKanban size={16} /> },
    { to: '/invoices', label: 'Invoices', icon: <FileText size={16} /> },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: <ShoppingCart size={16} /> },
    { to: '/vendors', label: 'Trade Partners', icon: <Users size={16} /> },
    { to: '/crew', label: 'Crew & Field App', icon: <HardHat size={16} /> },
  ] },
  { group: 'AI Desk', items: [
    { to: '/hitl-approvals', label: 'Approvals', icon: <CheckSquare size={16} /> },
    { to: '/ai-agents', label: 'AI Agents', icon: <Activity size={16} /> },
  ] },
];
const ALL = NAV.flatMap((g) => g.items);

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('bf-theme', theme); } catch { /* private mode */ }
  }, [theme]);
  return [theme, setTheme] as const;
}

export default function AppShell({ children, onLogout, embedded }: { children: ReactNode; onLogout: () => void; embedded: boolean }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  useEffect(() => setOpen(false), [pathname]);
  const current = ALL.find((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to))) ?? ALL[0];
  let n = 0;

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <img src={BRAND.logoUrl} alt={BRAND.name} className="h-9 w-auto dark:invert" />
        </div>
        <div className="label-mono mt-3">{BRAND.tagline}</div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Sections">
        {NAV.map((g) => (
          <div key={g.group} className="mt-4 first:mt-1">
            <div className="label-mono px-2 pb-2">{g.group}</div>
            {g.items.map((i) => {
              n += 1;
              const active = i === current;
              return (
                <Link key={i.to} to={i.to} aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 rounded-sm px-2 py-2 text-[13.5px] ${active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded bg-blue-600" aria-hidden />}
                  <span className={active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}>{i.icon}</span>
                  <span className="flex-1">{i.label}</span>
                  <span className={`num text-[11px] ${active ? 'text-blue-700' : 'text-gray-400'}`}>{String(n).padStart(2, '0')}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500">
        <div className="text-[13px] font-medium text-gray-800">{BRAND.region}</div>
        <div className="mt-1">{BRAND.services}</div>
        <a href={`tel:${BRAND.phone.replace(/\D/g, '')}`} className="mt-2 inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900"><Phone size={12} />{BRAND.phone}</a>
        <div className="mt-2 font-serif text-[15px] italic text-blue-500">{BRAND.motto}</div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="relative">{sidebar}</div>
          <button type="button" className="flex-1 bg-black/60" aria-label="Close menu" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur lg:px-8">
          <button type="button" className="text-gray-600 lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="label-mono min-w-0 flex-1 truncate">{BRAND.short} <span className="mx-1.5 text-gray-300">/</span> <span className="text-gray-800">{current.label}</span></div>
          <div className="flex items-center rounded-sm border border-gray-200 p-0.5" role="group" aria-label="Theme">
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTheme(t)} aria-pressed={theme === t}
                className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs ${theme === t ? 'bg-gray-900 text-gray-50' : 'text-gray-500 hover:text-gray-900'}`}>
                {t === 'light' ? <Sun size={13} /> : <Moon size={13} />}{t === 'light' ? 'Light' : 'Dark'}
              </button>
            ))}
          </div>
          {!embedded && (
            <button type="button" onClick={() => { auth.logout(); onLogout(); }} className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-gray-500 hover:text-gray-900"><LogOut size={14} />Sign out</button>
          )}
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

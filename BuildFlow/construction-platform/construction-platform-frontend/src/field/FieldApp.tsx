import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { call, endSession, getToken } from './api';
import { Join, Login } from './Auth';
import Jobs from './Jobs';
import JobScreen from './Job';
import { clearOutbox, flush, useOutbox } from './outbox';
import { useFieldTheme } from './theme';
import { Sheet, secondary } from './ui';

/** Whitis Field: the phone app for crews. Served at /field/ and installable to the home screen. */
export default function FieldApp() {
  const [authed, setAuthed] = useState(() => !!getToken());
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useFieldTheme();
  const [me, setMe] = useState<{ name: string; email: string; role: string } | null>(null);
  const { waiting } = useOutbox();

  // A 401 from the server means the office turned this sign-in off (or it expired).
  useEffect(() => { const lost = () => setAuthed(false); window.addEventListener('bf-auth-lost', lost); return () => window.removeEventListener('bf-auth-lost', lost); }, []);
  useEffect(() => {
    if (!authed) { setMe(null); return; }
    void flush();
    call<{ crew: { name: string; email: string; role: string } }>('GET', '/me').then((r) => setMe(r.crew)).catch(() => {});
  }, [authed]);

  const signOut = async () => {
    if (waiting > 0 && !confirm(`${waiting} thing${waiting === 1 ? ' hasn’t' : 's haven’t'} been sent yet. Signing out will delete ${waiting === 1 ? 'it' : 'them'}. Sign out anyway?`)) return;
    await endSession(clearOutbox);
    setMenu(false); setAuthed(false);
  };

  return (
    <BrowserRouter basename="/field">
      <Routes>
        <Route path="/join/:token" element={<Join onAuthed={() => setAuthed(true)} />} />
        {authed ? (
          <>
            <Route path="/" element={<Jobs me={me?.name.split(' ')[0] ?? 'Menu'} onMenu={() => setMenu(true)} />} />
            <Route path="/job/:id" element={<JobScreen onMenu={() => setMenu(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Login onAuthed={() => setAuthed(true)} />} />
        )}
      </Routes>
      <Sheet open={menu} onClose={() => setMenu(false)} title={me?.name ?? 'Account'}>
        <div className="space-y-3">
          {me && <p className="text-sm text-gray-600">{me.email} · {me.role === 'foreman' ? 'Foreman' : 'Crew'}</p>}
          <button type="button" className={`${secondary} w-full`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{theme === 'dark' ? 'Switch to light (better in sunlight)' : 'Switch to dark'}</button>
          <button type="button" className={`${secondary} w-full`} onClick={() => void signOut()}>Sign out</button>
        </div>
      </Sheet>
    </BrowserRouter>
  );
}

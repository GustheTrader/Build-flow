import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BRAND } from '../brand';
import { call, startSession } from './api';
import { clearOutbox } from './outbox';
import { Err, Label, fieldCls, primary } from './ui';

/** Sign-in, and first sign-in from an invite link (set your own password). */
function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div>
        <img src={BRAND.logoUrl} alt={BRAND.name} className="h-10 w-auto dark:invert" />
        <div className="label-mono mt-4">Field app</div>
        <h1 className="mt-1 text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{sub}</p>
      </div>
      {children}
    </div>
  );
}

async function enter(r: { token: string; crew: { id: string } }, onAuthed: () => void, go: () => void) {
  await startSession(r.token, r.crew.id, clearOutbox);
  onAuthed(); go();
}

export function Login({ onAuthed }: { onAuthed: () => void }) {
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await enter(await call('POST', '/login', { email, password }), onAuthed, () => nav('/', { replace: true })); }
    catch (err) { setError(err instanceof Error && err.message !== 'No signal' ? err.message : 'No signal. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Sign in" sub="Use the email the office set you up with.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Label text="Email"><input className={fieldCls} type="email" inputMode="email" autoComplete="username" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} /></Label>
        <Label text="Password"><input className={fieldCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Label>
        <Err text={error} />
        <button type="submit" className={primary} disabled={busy || !email.trim() || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-xs text-gray-500">First time? Open the invite link the office sent you. Forgot your password? Ask the office for a new link.</p>
      </form>
    </Shell>
  );
}

export function Join({ onAuthed }: { onAuthed: () => void }) {
  const { token = '' } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState(''); const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== again) { setError('The two passwords don’t match.'); return; }
    setBusy(true); setError(null);
    try { await enter(await call('POST', '/join', { code: token, password }), onAuthed, () => nav('/', { replace: true })); }
    catch (err) { setError(err instanceof Error && err.message !== 'No signal' ? err.message : 'No signal. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Shell title="Welcome" sub="Choose a password. You’ll use it with your email to sign in.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Label text="New password (8 or more characters)"><input className={fieldCls} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Label>
        <Label text="Type it again"><input className={fieldCls} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></Label>
        <Err text={error} />
        <button type="submit" className={primary} disabled={busy || password.length < 8}>{busy ? 'Saving…' : 'Save and continue'}</button>
        <p className="text-xs text-gray-500">Tip: add this app to your home screen so it opens like any other app (Share → Add to Home Screen on iPhone).</p>
      </form>
    </Shell>
  );
}

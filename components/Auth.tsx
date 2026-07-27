import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Auth: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'signIn') {
        await signIn(email, password);
      } else {
        await signUp(email, password, inviteCode);
        setInfo('Account created — you are signed in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-hair bg-ink-950 px-3 py-2 text-[13px] text-ink-100 outline-none placeholder:text-ink-500 focus:border-hair-strong';

  return (
    <div className="flex h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-on">
            B
          </span>
          <h1 className="font-serif text-[26px] font-semibold tracking-tight text-ink-100">Berea</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
            Pastoral guidance grounded in Scripture, the Spirit of Prophecy, and the Church Manual.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 rounded-xl border border-hair bg-ink-900 p-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="elder@yourchurch.org"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-ink-400">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          {mode === 'signUp' && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-400">Invite code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className={inputClass}
                placeholder="Ask your elder for this"
              />
            </div>
          )}

          {error && <p className="text-[12px] text-red-400">{error}</p>}
          {info && <p className="text-[12px] text-good">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-accent-on transition disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            className="w-full text-center text-[11px] text-ink-500 hover:text-ink-200"
          >
            {mode === 'signIn' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;

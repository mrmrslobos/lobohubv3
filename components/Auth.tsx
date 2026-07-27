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
    'w-full rounded-xl bg-ink-950 px-3 py-2 text-sm text-ink-100 outline-none ring-1 ring-transparent focus:ring-accent placeholder:text-ink-400';

  return (
    <div className="flex h-screen items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">Berea</h1>
          <p className="mt-1 text-sm text-ink-400">
            Pastoral guidance grounded in Scripture, the Spirit of Prophecy, and the Church Manual.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-ink-900 p-6 shadow-xl shadow-black/30">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-400">Email</label>
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
            <label className="mb-1 block text-xs font-medium text-ink-400">Password</label>
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
              <label className="mb-1 block text-xs font-medium text-ink-400">Invite code</label>
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

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-good">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-on transition disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            className="w-full text-center text-xs text-ink-400 hover:text-ink-200"
          >
            {mode === 'signIn' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;

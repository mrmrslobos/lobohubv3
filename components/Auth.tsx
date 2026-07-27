import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Check your inbox to confirm your email, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-stone-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-berea-600 text-2xl shadow-lg shadow-berea-600/20">
            📖
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">Berea</h1>
          <p className="mt-1 text-sm text-stone-400">
            Pastoral guidance grounded in Scripture, the Spirit of Prophecy, and the Church Manual.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-berea-500"
              placeholder="elder@yourchurch.org"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-400">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 outline-none focus:border-berea-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-berea-400">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-berea-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-berea-500 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
            className="w-full text-center text-xs text-stone-500 hover:text-stone-300"
          >
            {mode === 'signIn' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;

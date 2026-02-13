
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Auth: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@lobo.com');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center font-bold text-4xl shadow-2xl shadow-blue-500/30 mx-auto mb-6 transform hover:rotate-6 transition-transform">
            🐺
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">LOBO PLANNING</h1>
          <p className="text-slate-500 font-medium">Secure family management for the pack.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Family Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <p className="mt-2 text-[10px] text-slate-500 italic">Try: admin@lobo.com, parent@lobo.com, or child@lobo.com</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Pass-key</label>
              <input 
                type="password" 
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 transition-all"
                placeholder="••••••••"
                defaultValue="password123"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center font-medium animate-pulse">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className={`w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all transform active:scale-95 ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoggingIn ? 'Verifying...' : 'Join the Pack'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              New family? <button className="text-blue-400 font-bold hover:underline">Register your household</button>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600 font-medium">
          Self-hosted & End-to-End Encrypted. <br/> Lobo Planning v1.0.0
        </p>
      </div>
    </div>
  );
};

export default Auth;

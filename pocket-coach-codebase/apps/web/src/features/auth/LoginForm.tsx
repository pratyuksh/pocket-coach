import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, AlertCircle, LogIn, KeyRound } from 'lucide-react';
import { GoogleOAuthButton } from './GoogleOAuthButton';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) {
        setError(authErr.message);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[620px] bg-[var(--bg-glass)] backdrop-blur-2xl border border-[var(--border-glass)] rounded-3xl p-10 sm:p-14 shadow-[var(--shadow-main)] space-y-9 transition-all duration-200">
      {/* Header */}
      <div className="text-center space-y-3 pb-4 border-b border-[var(--border-glass)]">
        <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-heading">
          Sign In
        </h2>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex flex-row items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-9 max-w-md mx-auto w-full flex flex-col items-center">
        <div className="space-y-3 w-full">
          <label htmlFor="login-email" className="block text-left text-xs font-bold text-[var(--text-secondary)] font-heading tracking-wide uppercase px-1">
            Email Address
          </label>
          <div className="input-group">
            <div className="input-icon-left">
              <Mail />
            </div>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trainer@club.de"
              className="styled-input text-center !pl-11 !pr-11"
            />
          </div>
        </div>

        <div className="space-y-3 w-full">
          <label htmlFor="login-password" className="block text-left text-xs font-bold text-[var(--text-secondary)] font-heading tracking-wide uppercase px-1">
            Password
          </label>
          <div className="input-group">
            <div className="input-icon-left">
              <Lock />
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="styled-input text-center !pl-11 !pr-11"
            />
          </div>
        </div>

        <div className="pt-10 w-full flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>{loading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </div>
      </form>

      {/* Divider */}
      <div className="divider-container my-8">
        <div className="divider-line" />
        <span className="divider-label">OR</span>
      </div>

      {/* OAuth Button */}
      <div className="pt-2">
        <GoogleOAuthButton onError={(msg) => setError(msg)} />
      </div>

      {/* Quick Fill Accounts */}
      <div className="pt-8 border-t border-[var(--border-glass)] space-y-4">
        <p className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center justify-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Demo Accounts (Password: <code className="text-emerald-500 font-mono font-bold">Password123!</code>)</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => { setEmail('admin@club.de'); setPassword('Password123!'); }}
            className="py-2.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer text-center truncate"
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => { setEmail('headtrainer@club.de'); setPassword('Password123!'); }}
            className="py-2.5 px-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 text-[11px] font-bold transition-all cursor-pointer text-center truncate"
          >
            Head Trainer
          </button>
          <button
            type="button"
            onClick={() => { setEmail('trainer1@club.de'); setPassword('Password123!'); }}
            className="py-2.5 px-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition-all cursor-pointer text-center truncate"
          >
            Trainer
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { LoginForm } from '../features/auth/LoginForm';
import { Card, CardHeader, CardTitle, CardBody, Button, ThemeToggle } from '../components/ui';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 relative overflow-hidden font-body transition-colors duration-200">
      {/* Ambient background glow mesh */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--ambient-glow-1)] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[var(--ambient-glow-2)] rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Theme Toggle in top-right */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle />
      </div>

      {/* Brand logo header near top of page */}
      <div className="absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 font-black text-xl shadow-xl shadow-emerald-500/30 ring-1 ring-emerald-400/40">
          PC
        </div>
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight font-heading">
            PocketCoach
          </h1>
        </div>
      </div>

      {/* Sign In Box centered */}
      <div className="relative z-10 w-full max-w-[620px] pt-16 sm:pt-12">
        <LoginForm />
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card
        variant="glass"
        className="max-w-md w-full border-[var(--border-glass)] shadow-2xl relative z-10"
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <CardTitle className="text-xl font-bold text-[var(--text-primary)] font-heading">
              Trainer Registration
            </CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Registration completes upon receiving an invitation from a Super Admin. If you have an
            invitation link, please open it directly.
          </p>
          <Link to="/login">
            <Button variant="gradient" className="w-full">
              Proceed to Sign In
            </Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
};

export const InvitePage: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  let initialEmail = '';
  if (token) {
    try {
      initialEmail = atob(token);
    } catch {
      initialEmail = token.includes('@') ? token : '';
    }
  }

  const [email, setEmail] = useState(initialEmail);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // 1. Attempt login with existing credentials/invited password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: 'Password123!',
      });

      if (!signInErr) {
        // Update password & metadata
        await supabase.auth.updateUser({
          password,
          data: { display_name: displayName },
        });

        // Update profile record
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase
            .from('profiles')
            .update({
              display_name: displayName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userData.user.id);
        }

        navigate('/dashboard');
        return;
      }

      // 2. If user is not yet created, sign up with given credentials
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });

      if (signUpErr) throw signUpErr;

      if (signUpData.user) {
        await supabase.from('profiles').upsert({
          id: signUpData.user.id,
          display_name: displayName,
          email,
          is_active: true,
          preferred_language: 'de',
        });

        await supabase.from('user_roles').upsert({
          profile_id: signUpData.user.id,
          role: 'trainer',
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200 font-body">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--ambient-glow-1)] rounded-full blur-[140px] pointer-events-none" />

      <Card
        variant="glass"
        className="max-w-md w-full border-[var(--border-glass)] shadow-2xl relative z-10 p-2"
      >
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[var(--text-primary)] font-heading">
            Accept Trainer Invitation
          </CardTitle>
          <p className="text-xs text-[var(--text-secondary)]">
            Complete your account setup to join the club roster.
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleCompleteSetup} className="space-y-4">
            <div>
              <label
                htmlFor="invite-setup-email"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Account Email
              </label>
              <input
                id="invite-setup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainer@club.de"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="invite-setup-name"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Display Name / Full Name
              </label>
              <input
                id="invite-setup-name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Schmidt"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="invite-setup-pass"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Set Password
              </label>
              <input
                id="invite-setup-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="invite-setup-pass-confirm"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Confirm Password
              </label>
              <input
                id="invite-setup-pass-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="gradient" className="w-full" disabled={loading}>
                {loading ? 'Completing Setup...' : 'Complete Account Setup'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

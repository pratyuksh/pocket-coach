import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Field, Input } from '../components/ui';
import { AuthError, AuthHeading, AuthLayout } from '../features/auth/AuthLayout';
import { authErrorMessage } from '../features/auth/authErrors';
import { LoginForm } from '../features/auth/LoginForm';
import { useLanguage } from '../i18n/useLanguage';
import { supabase } from '../lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

export const LoginPage: React.FC = () => (
  <AuthLayout>
    <LoginForm />
  </AuthLayout>
);

const emailFromToken = (token?: string): string => {
  if (!token) return '';
  try {
    return atob(token);
  } catch {
    return token.includes('@') ? token : '';
  }
};

export const InvitePage: React.FC = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const initialEmail = emailFromToken(token);
  const [email, setEmail] = useState(initialEmail);
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.errors.passwordTooShort', { min: MIN_PASSWORD_LENGTH }));
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
              preferred_language: language,
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
          preferred_language: language,
        });

        await supabase.from('user_roles').upsert({
          profile_id: signUpData.user.id,
          role: 'trainer',
        });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(authErrorMessage(err, t, 'auth.errors.setupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthHeading title={t('auth.invitedTitle')} body={t('auth.invitedBody')} />

      {error && <AuthError message={error} />}

      <form onSubmit={handleCompleteSetup} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Field label={t('auth.email')}>
            <Input
              type="email"
              required
              autoComplete="username"
              readOnly={!!initialEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('auth.yourName')}>
            <Input
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
          <Field label={t('auth.choosePassword')}>
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" size="lg" isLoading={loading} className="w-full">
          {loading ? (
            t('auth.creatingAccount')
          ) : (
            <>
              {t('auth.createAccount')} <span aria-hidden="true">→</span>
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};

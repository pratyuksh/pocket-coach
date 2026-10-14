import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Button, Field, Input } from '../../components/ui';
import { AuthError, AuthHeading } from './AuthLayout';
import { authErrorMessage } from './authErrors';
import { DemoAccounts } from './DemoAccounts';

export const LoginForm: React.FC = () => {
  const { t } = useTranslation();
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
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });

      if (authErr) {
        setError(authErrorMessage(authErr, t, 'auth.errors.signInFailed'));
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(authErrorMessage(err, t, 'auth.errors.signInFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthHeading title={t('auth.signInTitle')} body={t('auth.inviteOnly')} />

      {error && <AuthError message={error} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Field label={t('auth.email')}>
            <Input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={t('auth.password')}>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>

        <Button type="submit" size="lg" isLoading={loading} className="w-full">
          {loading ? (
            t('auth.signingIn')
          ) : (
            <>
              {t('auth.signIn')} <span aria-hidden="true">→</span>
            </>
          )}
        </Button>
      </form>

      {import.meta.env.DEV && (
        <DemoAccounts
          onPick={(demoEmail, demoPassword) => {
            setEmail(demoEmail);
            setPassword(demoPassword);
          }}
        />
      )}
    </>
  );
};

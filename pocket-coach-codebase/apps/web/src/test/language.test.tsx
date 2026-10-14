import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_STORAGE_KEY } from '../i18n';
import { useLanguage } from '../i18n/useLanguage';
import { LanguageSync } from '../i18n/LanguageSync';
import { SegmentedControl } from '../components/ui';

const auth = vi.hoisted(() => ({
  value: {
    user: null as null | { id: string },
    profile: null as null | { preferred_language: string },
    refreshProfile: vi.fn(),
  },
}));
const update = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useAuth', () => ({ useAuth: () => auth.value }));
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => ({ eq: (...args: unknown[]) => update(payload, ...args) }),
    }),
  },
}));

const Switcher: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  return (
    <div>
      <p>{t('auth.signInTitle')}</p>
      <SegmentedControl
        ariaLabel={t('language.label')}
        value={language}
        onChange={setLanguage}
        options={[
          { value: 'en', label: 'EN' },
          { value: 'de', label: 'DE' },
        ]}
      />
    </div>
  );
};

describe('language switching', () => {
  beforeEach(() => {
    auth.value = { user: null, profile: null, refreshProfile: vi.fn() };
    update.mockReset().mockResolvedValue({ error: null });
  });

  it('switches immediately and remembers the choice before sign-in', async () => {
    render(<Switcher />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'DE' }));

    expect(await screen.findByText('Anmelden')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
    expect(update).not.toHaveBeenCalled();
  });

  it('saves the choice to the profile when signed in', async () => {
    auth.value = {
      user: { id: 'u1' },
      profile: { preferred_language: 'en' },
      refreshProfile: vi.fn(),
    };
    render(<Switcher />);

    await userEvent.click(screen.getByRole('radio', { name: 'DE' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ preferred_language: 'de' }, 'id', 'u1'),
    );
    expect(auth.value.refreshProfile).toHaveBeenCalled();
  });

  it('applies the profile language after sign-in', async () => {
    auth.value = {
      user: { id: 'u1' },
      profile: { preferred_language: 'de' },
      refreshProfile: vi.fn(),
    };
    render(<LanguageSync />);
    await waitFor(() => expect(i18n.resolvedLanguage).toBe('de'));
  });
});

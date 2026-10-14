import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Toast } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveSeason } from '../features/seasons/hooks/useActiveSeason';
import { CalendarSection } from '../features/settings/CalendarSection';
import { HallsSection } from '../features/settings/HallsSection';
import { LanguageSection } from '../features/settings/LanguageSection';
import { ProfileSection } from '../features/settings/ProfileSection';
import { SeasonSection } from '../features/settings/SeasonSection';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { canManageSeasons } = usePermissions();
  const { season, slots, refetch } = useActiveSeason();
  const [notice, setNotice] = useState<string | null>(null);
  const closeNotice = useCallback(() => setNotice(null), []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) return null;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6">
        <ProfileSection onNotice={setNotice} />
        <LanguageSection />
        <Button variant="secondary" className="self-start" onClick={handleSignOut}>
          {t('actions.signOut')}
        </Button>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <CalendarSection onNotice={setNotice} />
        {canManageSeasons && <SeasonSection season={season} slots={slots} refetch={refetch} />}
        {canManageSeasons && <HallsSection onNotice={setNotice} />}
      </div>

      {notice && (
        <div className="fixed bottom-[76px] right-4 z-50 md:bottom-6 md:right-6">
          <Toast
            type="success"
            message={notice}
            onClose={closeNotice}
            dismissLabel={t('actions.dismiss')}
          />
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, CheckRow, Dialog, Field, Input } from '../../components/ui';
import { createIsolatedAuthClient, supabase } from '../../lib/supabase';
import { AuthError } from './AuthLayout';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Invites a trainer by email. The account is still created with a temporary password and a
 * link built from the email (known issue S1); server-side invites replace this in Sub-Phase 1.6a.
 */
export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [headTrainer, setHeadTrainer] = useState(false);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [isJuniorCoach, setIsJuniorCoach] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail('');
    setHeadTrainer(false);
    setSuperAdmin(false);
    setIsJuniorCoach(false);
    setError(null);
    setSuccess(false);
    setCopied(false);
  };

  const close = () => {
    onClose();
    reset();
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const displayName = email.split('@')[0];

    try {
      let targetUserId: string | null = null;
      // Account creation runs on an isolated client so the admin's own session is kept;
      // the profile and role writes below then run as the admin.
      const authClient = createIsolatedAuthClient();

      // 1. Attempt signup
      const { data, error: inviteErr } = await authClient.auth.signUp({
        email,
        password: 'Password123!', // Default temporary setup password for seed/invite
        options: { data: { display_name: displayName } },
      });

      if (!inviteErr && data?.user) {
        targetUserId = data.user.id;
      } else if (
        inviteErr &&
        (inviteErr.message.toLowerCase().includes('already registered') ||
          inviteErr.message.toLowerCase().includes('already exists') ||
          inviteErr.status === 422)
      ) {
        // Check if existing profile can be re-activated
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingProf) {
          targetUserId = existingProf.id;
        } else {
          // Attempt sign in fallback to retrieve user id if profile was hard-deleted
          const { data: signInData } = await authClient.auth.signInWithPassword({
            email,
            password: 'Password123!',
          });
          if (signInData?.user) {
            targetUserId = signInData.user.id;
          } else {
            throw inviteErr;
          }
        }
      } else if (inviteErr) {
        throw inviteErr;
      }

      if (targetUserId) {
        // Upsert active profile record. The invitee sets their own name when accepting.
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: targetUserId,
          display_name: displayName,
          email,
          is_junior_coach: isJuniorCoach,
          is_active: true,
          preferred_language: 'de',
        });
        if (profileErr) throw profileErr;

        // Everyone is a Trainer; the chosen extra roles are added (existing rows are kept)
        const roles = [
          'trainer',
          ...(headTrainer ? ['head_trainer'] : []),
          ...(superAdmin ? ['super_admin'] : []),
        ];
        const { error: roleErr } = await supabase.from('user_roles').upsert(
          roles.map((role) => ({ profile_id: targetUserId, role })),
          { onConflict: 'profile_id,role', ignoreDuplicates: true },
        );
        if (roleErr) throw roleErr;

        // Trigger Supabase Auth email dispatch (sent to local Mailpit at http://localhost:54324)
        try {
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/invite/${btoa(email)}`,
          });
        } catch (emailErr) {
          console.warn('Local email dispatch warning:', emailErr);
        }
      }

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      const message = (err as { message?: string } | null)?.message;
      setError(message || t('invite.failed'));
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = email ? `${window.location.origin}/invite/${btoa(email)}` : '';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      title={success ? t('invite.sentTitle') : t('invite.title')}
      closeLabel={t('actions.close')}
    >
      {success ? (
        <div className="flex flex-col gap-3.5">
          <p className="text-[13.5px] text-neutral-800">{t('invite.sentBody', { email })}</p>
          {import.meta.env.DEV && (
            <p className="text-xs text-neutral-700">
              Development: emails arrive in Mailpit at http://localhost:54324.
            </p>
          )}
          <Field label={t('invite.link')}>
            <Input readOnly value={inviteLink} className="select-all text-xs" />
          </Field>
          {copied && (
            <p role="status" className="text-xs text-neutral-700">
              {t('invite.copied')}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  setCopied(true);
                } catch {
                  // The link stays visible and selectable.
                }
              }}
            >
              {t('invite.copy')}
            </Button>
            <Button onClick={close}>{t('invite.done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleInvite} className="flex flex-col gap-3.5">
          <p className="text-[13.5px] text-neutral-800">{t('invite.body')}</p>

          {error && <AuthError message={error} />}

          <Field label={t('invite.email')}>
            <Input
              type="email"
              required
              autoComplete="off"
              value={email}
              placeholder={t('invite.emailPlaceholder')}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <div className="border-t-2 border-divider">
            <CheckRow
              checked={headTrainer}
              onChange={setHeadTrainer}
              label={t('roles.headTrainer')}
              description={t('rolesDialog.headD')}
            />
            <CheckRow
              checked={superAdmin}
              onChange={setSuperAdmin}
              label={t('roles.superAdmin')}
              description={t('rolesDialog.superD')}
            />
            <CheckRow
              checked={isJuniorCoach}
              onChange={setIsJuniorCoach}
              label={t('roles.junior')}
              description={t('rolesDialog.juniorD')}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={loading}>
              {t('invite.cancel')}
            </Button>
            <Button type="submit" isLoading={loading}>
              {loading ? t('invite.sending') : t('invite.send')}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
};

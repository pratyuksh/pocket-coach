import React, { useState } from 'react';
import { Modal, Button } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isJuniorCoach, setIsJuniorCoach] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [role, setRole] = useState<'trainer' | 'head_trainer' | 'super_admin'>('trainer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let targetUserId: string | null = null;

      // 1. Attempt signup
      const { data, error: inviteErr } = await supabase.auth.signUp({
        email,
        password: 'Password123!', // Default temporary setup password for seed/invite
        options: {
          data: {
            display_name: displayName,
          },
        },
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
          const { data: signInData } = await supabase.auth.signInWithPassword({
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
        // Upsert active profile record
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: targetUserId,
          display_name: displayName || email.split('@')[0],
          email,
          specialty: specialty || null,
          is_junior_coach: isJuniorCoach,
          is_active: true,
          preferred_language: 'de',
        });

        if (profileErr) console.warn('Profile upsert warning:', profileErr);

        // Assign user role
        await supabase.from('user_roles').upsert({
          profile_id: targetUserId,
          role,
        });

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
    } catch (err: any) {
      setError(err?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = email ? `${window.location.origin}/invite/${btoa(email)}` : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite New Trainer / Coach">
      {success ? (
        <div className="py-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-bold text-[var(--text-primary)]">Invitation Sent!</h4>
          <p className="text-xs text-[var(--text-secondary)]">
            Account created for <span className="text-emerald-500 font-semibold">{email}</span>.
            Check local email dashboard (Inbucket) at{' '}
            <code className="text-xs font-mono text-cyan-500">http://localhost:54324</code> or use
            the invitation link below.
          </p>

          <div className="p-3 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] space-y-2">
            <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Invitation Setup Link:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-lg px-3 py-1.5 text-xs font-mono select-all"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                }}
              >
                Copy Link
              </Button>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSuccess(false);
                onClose();
                setEmail('');
                setDisplayName('');
                setSpecialty('');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleInvite} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="invite-email"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
            >
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--input-icon)] absolute left-3 top-3" />
              <input
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="newtrainer@club.de"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="invite-name"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
            >
              Display Name / Full Name
            </label>
            <input
              id="invite-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Schmidt"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="invite-role"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Base Role
              </label>
              <select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option
                  value="trainer"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Trainer (Default)
                </option>
                <option
                  value="head_trainer"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Head Trainer
                </option>
                <option
                  value="super_admin"
                  className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                >
                  Super Admin
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="invite-specialty"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1"
              >
                Responsibility / Specialty
              </label>
              <input
                id="invite-specialty"
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Youth U16 Tactics"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isJuniorCoach"
              checked={isJuniorCoach}
              onChange={(e) => setIsJuniorCoach(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-subtle)] text-emerald-500 focus:ring-emerald-500 bg-[var(--input-bg)]"
            />
            <label
              htmlFor="isJuniorCoach"
              className="text-xs text-[var(--text-secondary)] cursor-pointer"
            >
              Mark as 1418 Coach (U14/U18 youth player designation)
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-[var(--border-glass)]">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

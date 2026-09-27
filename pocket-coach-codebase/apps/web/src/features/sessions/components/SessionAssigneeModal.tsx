import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../../components/ui';
import type { EnrichedSession } from '../hooks/useSessions';
import { useSessionAssignments } from '../hooks/useSessionAssignments';
import { useAssignTrainer } from '../hooks/useAssignTrainer';
import { useTrainers } from '../../trainers/hooks/useTrainers';
import { useAuth } from '../../../hooks/useAuth';
import { Calendar, Clock, MapPin, Plus, Trash2 } from 'lucide-react';

interface SessionAssigneeModalProps {
  session: EnrichedSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

interface AssignedCoachRow {
  assignmentId?: string;
  profileId: string;
  roleTag: 'primary' | 'assistant_coach' | 'junior_coach';
}

export const SessionAssigneeModal: React.FC<SessionAssigneeModalProps> = ({
  session,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const { user } = useAuth();
  const { assignments, loading: assignmentsLoading, refetch } = useSessionAssignments(session?.id);
  const { trainers, loading: trainersLoading } = useTrainers();
  const { assignTrainer, removeAssignment, loading: saving, error: saveError } = useAssignTrainer();

  const [coachRows, setCoachRows] = useState<AssignedCoachRow[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync initial assignments when loaded
  useEffect(() => {
    if (assignments && assignments.length > 0) {
      const rows: AssignedCoachRow[] = assignments.map((a) => {
        let roleTag: 'primary' | 'assistant_coach' | 'junior_coach' = 'primary';
        if (a.track === 'junior_coach' || a.profile?.is_junior_coach) {
          roleTag = 'junior_coach';
        } else if (a.session_role === 'assistant_coach') {
          roleTag = 'assistant_coach';
        }
        return {
          assignmentId: a.id,
          profileId: a.profile_id ?? '',
          roleTag,
        };
      });
      setCoachRows(rows);
    } else {
      setCoachRows([{ profileId: '', roleTag: 'primary' }]);
    }
  }, [assignments]);

  useEffect(() => {
    setCoachRows([{ profileId: '', roleTag: 'primary' }]);
  }, [session?.id]);

  if (!session) return null;

  const handleAddRow = () => {
    setCoachRows((prev) => [...prev, { profileId: '', roleTag: 'assistant_coach' }]);
  };

  const handleRemoveRow = (index: number) => {
    setCoachRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: 'profileId' | 'roleTag', value: string) => {
    setCoachRows((prev) => {
      const updated = [...prev];
      const targetTrainer = trainers.find(
        (t) => t.id === (field === 'profileId' ? value : updated[index].profileId),
      );

      let nextRoleTag = updated[index].roleTag;
      if (field === 'roleTag') {
        nextRoleTag = value as any;
      } else if (field === 'profileId' && targetTrainer?.is_junior_coach) {
        nextRoleTag = 'junior_coach';
      }

      updated[index] = {
        ...updated[index],
        [field]: value,
        roleTag: nextRoleTag,
      };
      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setLocalError(null);

      // Determine assignments to remove
      const activeIds = coachRows.map((r) => r.assignmentId).filter(Boolean);
      const toRemove = assignments.filter((a) => !activeIds.includes(a.id));

      for (const rem of toRemove) {
        await removeAssignment(rem.id);
      }

      // Upsert assigned rows
      for (const row of coachRows) {
        if (!row.profileId) continue;

        const isJunior = row.roleTag === 'junior_coach';
        const track = isJunior ? 'junior_coach' : 'regular';
        const session_role = row.roleTag === 'primary' ? 'primary' : 'assistant_coach';

        await assignTrainer({
          session_id: session.id,
          profile_id: row.profileId,
          track,
          session_role,
          assigned_by: user?.id,
        });
      }

      await refetch();
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to update session assignments');
    }
  };

  const startTime = session.start_time.slice(0, 5);
  const endTime = session.end_time.slice(0, 5);

  const juniorCoaches = trainers.filter((t) => t.is_junior_coach);
  const regularTrainers = trainers.filter((t) => !t.is_junior_coach);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Trainers to Session">
      <div className="space-y-6 py-2">
        {/* Session Meta Header */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Calendar className="w-4 h-4 text-emerald-500" />
              {session.session_date}
            </div>
            <Badge variant="neutral">
              <Clock className="w-3 h-3 mr-1 text-emerald-500" />
              {startTime} – {endTime}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span className="truncate">
              {session.location ? session.location.name : 'No Hall Assigned'}
            </span>
          </div>
        </div>

        {(localError || saveError) && (
          <div className="p-3 text-xs font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg">
            {localError || saveError}
          </div>
        )}

        {assignmentsLoading || trainersLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading assignments...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Assigned Coaches ({coachRows.filter((r) => r.profileId).length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="text-xs py-1 px-2.5 flex items-center gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Add Coach
              </Button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {coachRows.map((row, idx) => {
                const selectedTrainer = trainers.find((t) => t.id === row.profileId);
                const baseTrainers =
                  row.roleTag === 'junior_coach' ? juniorCoaches : regularTrainers;
                const selectableTrainers =
                  selectedTrainer && !baseTrainers.some((t) => t.id === selectedTrainer.id)
                    ? [selectedTrainer, ...baseTrainers]
                    : baseTrainers;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    {/* Role Tag Selector */}
                    <select
                      value={row.roleTag}
                      onChange={(e) => handleRowChange(idx, 'roleTag', e.target.value)}
                      className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shrink-0 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="primary">Lead Coach (Primary)</option>
                      <option value="assistant_coach">Assistant Coach</option>
                      <option value="junior_coach">🌱 1418 Coach</option>
                    </select>

                    {/* Trainer Selector */}
                    <select
                      value={row.profileId}
                      onChange={(e) => handleRowChange(idx, 'profileId', e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Select Coach --</option>
                      {selectableTrainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.is_junior_coach ? '🌱 ' : ''}
                          {t.display_name} ({t.email}) {t.specialty ? `• ${t.specialty}` : ''}
                        </option>
                      ))}
                    </select>

                    {/* Remove Row Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors self-end sm:self-center"
                      title="Remove coach assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" isLoading={saving} onClick={handleSave}>
            Save Assignments
          </Button>
        </div>
      </div>
    </Modal>
  );
};

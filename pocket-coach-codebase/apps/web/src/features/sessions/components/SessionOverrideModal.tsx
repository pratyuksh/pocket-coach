import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../../../components/ui';
import { useLocations } from '../../locations/hooks/useLocations';
import type { EnrichedSession } from '../hooks/useSessions';
import { Clock, MapPin, AlertCircle, Edit3 } from 'lucide-react';

interface SessionOverrideModalProps {
  session: EnrichedSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    sessionId: string,
    updates: { start_time?: string; end_time?: string; location_id?: string | null },
  ) => Promise<void>;
}

export const SessionOverrideModal: React.FC<SessionOverrideModalProps> = ({
  session,
  isOpen,
  onClose,
  onSave,
}) => {
  const { locations } = useLocations();
  const [startTime, setStartTime] = useState('17:30:00');
  const [endTime, setEndTime] = useState('19:00:00');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      setStartTime(session.start_time || '17:30:00');
      setEndTime(session.end_time || '19:00:00');
      setLocationId(session.location_id || null);
    }
  }, [session]);

  if (!session) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await onSave(session.id, {
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        location_id: locationId,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Override Session Details" maxWidth="lg">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Target Session Date
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📅 {session.session_date}</span>
            {session.is_time_overridden && <Badge variant="warning">Previously Overridden</Badge>}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Time Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> Start Time
            </label>
            <input
              type="time"
              value={startTime.slice(0, 5)}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" /> End Time
            </label>
            <input
              type="time"
              value={endTime.slice(0, 5)}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Hall Location Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Sports Hall Location
          </label>
          <select
            value={locationId || ''}
            onChange={(e) => setLocationId(e.target.value || null)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">-- No Location Assigned --</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} {loc.district_area ? `(${loc.district_area})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Attending Groups Info */}
        {session.player_groups && session.player_groups.length > 0 && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Attending Player Groups
            </label>
            <div className="flex flex-wrap gap-1.5">
              {session.player_groups.map((pg) => (
                <Badge key={pg.id} variant="neutral">
                  {pg.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            <Edit3 className="w-4 h-4 mr-1" /> Save Override
          </Button>
        </div>
      </form>
    </Modal>
  );
};

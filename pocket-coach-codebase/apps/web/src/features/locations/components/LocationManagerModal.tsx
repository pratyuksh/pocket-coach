import React, { useState } from 'react';
import { Modal, Button, Badge } from '../../../components/ui';
import { useLocations } from '../hooks/useLocations';
import { MapPin, Plus, Building2, AlertCircle } from 'lucide-react';

interface LocationManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocationManagerModal: React.FC<LocationManagerModalProps> = ({ isOpen, onClose }) => {
  const { locations, loading, error, addLocation, updateLocation } = useLocations();
  const [newHallName, setNewHallName] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHallName.trim()) return;

    try {
      setSubmitting(true);
      setFormError(null);
      await addLocation(newHallName.trim(), newDistrict.trim() || undefined);
      setNewHallName('');
      setNewDistrict('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to add hall location');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateLocation(id, { is_active: !currentActive });
    } catch (err: any) {
      console.error('Failed to toggle location active status', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sports Hall Locations" maxWidth="lg">
      <div className="space-y-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Manage training halls available for season schedule setup and session overrides.
        </p>

        {(error || formError) && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* Add Location Form */}
        <form
          onSubmit={handleAddLocation}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3"
        >
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            Add New Hall Location
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Hall Name *
              </label>
              <input
                type="text"
                value={newHallName}
                onChange={(e) => setNewHallName(e.target.value)}
                placeholder="e.g. Sporthalle Borrweg"
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                District / Area
              </label>
              <input
                type="text"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                placeholder="e.g. Friesenberg"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              disabled={!newHallName.trim()}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Location
            </Button>
          </div>
        </form>

        {/* Existing Locations List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Available Halls ({locations.length})
          </h4>

          {loading ? (
            <div className="py-6 text-center text-sm text-slate-500">Loading halls...</div>
          ) : locations.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No sports hall locations found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto pr-1">
              {locations.map((loc) => (
                <div key={loc.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {loc.name}
                        {!loc.is_active && <Badge variant="neutral">Inactive</Badge>}
                      </div>
                      {loc.district_area && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {loc.district_area}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={loc.is_active ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleToggleActive(loc.id, loc.is_active)}
                  >
                    {loc.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

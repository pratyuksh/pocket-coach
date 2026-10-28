import React from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { HeadDashboard } from '../features/home/HeadDashboard';
import { TrainerHome } from '../features/home/TrainerHome';

/** Home: the Dashboard for Head-trainers and above, the trainer's own home for everyone else. */
export const DashboardPage: React.FC = () => {
  const { isHeadTrainer } = usePermissions();
  return isHeadTrainer ? <HeadDashboard /> : <TrainerHome />;
};

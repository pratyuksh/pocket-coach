import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Badge } from '../components/ui';

export const TrainersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Trainer Roster & Roles</CardTitle>
          <Badge variant="info">Sub-Phase 1.2 Target</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-300">
            Trainer roster, invite flows, and role management (Trainer, Head-Trainer, Super-Admin)
            will be implemented in Sub-Phase 1.2.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

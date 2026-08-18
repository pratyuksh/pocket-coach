import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Badge } from '../components/ui';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Settings & Profile</CardTitle>
          <Badge variant="neutral">Sub-Phase 1.7 Polish</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-300">
            Language preferences, iCal feed token management, and notification settings will be
            implemented in Sub-Phase 1.7.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

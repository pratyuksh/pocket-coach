import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Badge } from '../components/ui';

export const SessionsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Training Sessions Schedule</CardTitle>
          <Badge variant="info">Sub-Phase 1.3 Target</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-300">
            Season session schedule and automatic batch generation will be implemented in Sub-Phase
            1.3.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

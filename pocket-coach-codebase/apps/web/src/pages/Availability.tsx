import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, Badge } from '../components/ui';

export const AvailabilityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Availability Survey & Matrix</CardTitle>
          <Badge variant="info">Sub-Phase 1.4 Target</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-300">
            Availability responses date-by-date and Head-Trainer Matrix Grid will be implemented in
            Sub-Phase 1.4.
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

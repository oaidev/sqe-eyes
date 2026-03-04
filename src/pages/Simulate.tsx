import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SimulateCameraDialog } from '@/components/cameras/SimulateCameraDialog';

export default function Simulate() {
  return (
    <AppLayout title="Simulasi Deteksi">
      <SimulateCameraDialog open={true} onOpenChange={() => {}} />
    </AppLayout>
  );
}

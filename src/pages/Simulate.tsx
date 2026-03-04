import { AppLayout } from '@/components/layout/AppLayout';
import { SimulateCameraDialog } from '@/components/cameras/SimulateCameraDialog';

export default function Simulate() {
  return (
    <AppLayout title="Simulasi Deteksi">
      <div className="max-w-5xl mx-auto">
        <SimulateCameraDialog open={true} onOpenChange={() => {}} />
      </div>
    </AppLayout>
  );
}

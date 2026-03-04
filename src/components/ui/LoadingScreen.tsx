import logo from '@/assets/logo.png';
import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img src={logo} alt="COSMOS" className="h-16 w-auto animate-pulse" />
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

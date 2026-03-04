import { Loader2 } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co.com/0SsvMtL/logo-PROXIS-3x-1.png';

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <img src={LOGO_URL} alt="PROXIS" className="h-10 w-auto animate-pulse" />
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

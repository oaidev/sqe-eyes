import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import logo from '@/assets/logo.png';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <img src={logo} alt="SQE Eyes" className="h-16 w-auto" />
      <div className="text-center">
        <h1 className="mb-2 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Halaman tidak ditemukan</p>
        <a
          href="/"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Workers from "./pages/Workers";
import Zones from "./pages/Zones";
import PpeRules from "./pages/PpeRules";
import AccessRules from "./pages/AccessRules";
import LiveCameras from "./pages/LiveCameras";
import Events from "./pages/Events";
import Alerts from "./pages/Alerts";
import Validations from "./pages/Validations";
import ExitPermits from "./pages/ExitPermits";
import Compliance from "./pages/Compliance";
import Violations from "./pages/Violations";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Index />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/zones" element={<Zones />} />
            <Route path="/ppe-rules" element={<PpeRules />} />
            <Route path="/access-rules" element={<AccessRules />} />
            <Route path="/live-cameras" element={<LiveCameras />} />
            <Route path="/events" element={<Events />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/validations" element={<Validations />} />
            <Route path="/exit-permits" element={<ExitPermits />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/violations" element={<Violations />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

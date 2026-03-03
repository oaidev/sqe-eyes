import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
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
import Users from "./pages/Users";
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
            <Route path="/" element={<ProtectedRoute page="dashboard"><Index /></ProtectedRoute>} />
            <Route path="/workers" element={<ProtectedRoute page="workers"><Workers /></ProtectedRoute>} />
            <Route path="/zones" element={<ProtectedRoute page="zones"><Zones /></ProtectedRoute>} />
            <Route path="/ppe-rules" element={<ProtectedRoute page="ppe-rules"><PpeRules /></ProtectedRoute>} />
            <Route path="/access-rules" element={<ProtectedRoute page="access-rules"><AccessRules /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute page="users"><Users /></ProtectedRoute>} />
            <Route path="/live-cameras" element={<ProtectedRoute page="live-cameras"><LiveCameras /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute page="events"><Events /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute page="alerts"><Alerts /></ProtectedRoute>} />
            <Route path="/validations" element={<ProtectedRoute page="validations"><Validations /></ProtectedRoute>} />
            <Route path="/exit-permits" element={<ProtectedRoute page="exit-permits"><ExitPermits /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute page="compliance"><Compliance /></ProtectedRoute>} />
            <Route path="/violations" element={<ProtectedRoute page="violations"><Violations /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute page="reports"><Reports /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

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
import Users from "./pages/Users";
import Roles from "./pages/Roles";
import Simulate from "./pages/Simulate";
import OperatorValidation from "./pages/OperatorValidation";
import SupervisorValidation from "./pages/SupervisorValidation";
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
            <Route path="/users" element={<ProtectedRoute page="users"><Users /></ProtectedRoute>} />
            <Route path="/roles" element={<ProtectedRoute page="roles"><Roles /></ProtectedRoute>} />
            <Route path="/simulate" element={<ProtectedRoute page="simulate"><Simulate /></ProtectedRoute>} />
            <Route path="/operator-validation" element={<ProtectedRoute page="operator-validation"><OperatorValidation /></ProtectedRoute>} />
            <Route path="/supervisor-validation" element={<ProtectedRoute page="supervisor-validation"><SupervisorValidation /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPharmacies from "./pages/admin/AdminPharmacies";
import AdminPharmacyDetail from "./pages/admin/AdminPharmacyDetail";
import AdminSales from "./pages/admin/AdminSales";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSettings from "./pages/admin/AdminSettings";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffMedicines from "./pages/staff/StaffMedicines";
import StaffSale from "./pages/staff/StaffSale";
import StaffHistory from "./pages/staff/StaffHistory";
import StaffNotifications from "./pages/staff/StaffNotifications";
import StaffProfile from "./pages/staff/StaffProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<DashboardLayout requiredRole="admin" />}>
              <Route index element={<AdminDashboard />} />
              <Route path="pharmacies" element={<AdminPharmacies />} />
              <Route path="pharmacies/:id" element={<AdminPharmacyDetail />} />
              <Route path="sales" element={<AdminSales />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route path="/staff" element={<DashboardLayout requiredRole="staff" />}>
              <Route index element={<StaffDashboard />} />
              <Route path="medicines" element={<StaffMedicines />} />
              <Route path="sale" element={<StaffSale />} />
              <Route path="history" element={<StaffHistory />} />
              <Route path="notifications" element={<StaffNotifications />} />
              <Route path="profile" element={<StaffProfile />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

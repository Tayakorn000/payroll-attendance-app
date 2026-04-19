import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "./store/auth";
import Layout from "./components/shared/Layout";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminEmployees from "./pages/admin/Employees";
import AdminAttendance from "./pages/admin/Attendance";
import AdminPayroll from "./pages/admin/Payroll";
import AdminAdvances from "./pages/admin/Advances";
import EmployeeDashboard from "./pages/employee/Dashboard";
import EmployeePayslips from "./pages/employee/Payslips";
import EmployeeAdvances from "./pages/employee/Advances";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ role, children }: { role: "admin" | "employee"; children: React.ReactNode }) {
  const { token, role: userRole } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (userRole !== role) return <Navigate to={`/${userRole}`} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="advances" element={<AdminAdvances />} />
          </Route>

          <Route
            path="/employee"
            element={
              <ProtectedRoute role="employee">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmployeeDashboard />} />
            <Route path="payslips" element={<EmployeePayslips />} />
            <Route path="advances" element={<EmployeeAdvances />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (username: string, password: string) => {
  const form = new FormData();
  form.append("username", username);
  form.append("password", password);
  return api.post("/auth/login", form);
};
export const getMe = () => api.get("/auth/me");
export const changePassword = (data: any) => api.post("/auth/change-password", data);
export const resetEmployeePassword = (employeeId: string, data: any) => api.post(`/auth/employees/${employeeId}/reset-password`, data);

// Employees
export const getEmployees = () => api.get("/employees/");
export const getEmployee = (id: string) => api.get(`/employees/${id}`);
export const createEmployee = (data: unknown) => api.post("/employees/", data);
export const updateEmployee = (id: string, data: unknown) => api.patch(`/employees/${id}`, data);
export const deleteEmployee = (id: string) => api.delete(`/employees/${id}`);

// Attendance
export const getAttendance = (employeeId: string, start: string, end: string) =>
  api.get(`/attendance/employee/${employeeId}`, { params: { start_date: start, end_date: end } });
export const createAttendanceLog = (data: unknown) => api.post("/attendance/", data);
export const bulkAttendance = (logs: unknown[]) => api.post("/attendance/bulk", { logs });
export const updateAttendanceLog = (id: string, data: unknown) => api.patch(`/attendance/${id}`, data);

// Payroll
export const getPeriods = () => api.get("/payroll/periods");
export const createPeriod = (data: unknown) => api.post("/payroll/periods", data);
export const calculatePeriod = (id: string) => api.post(`/payroll/periods/${id}/calculate`);
export const approvePeriod = (id: string) => api.post(`/payroll/periods/${id}/approve`);
export const getMySlips = (periodId?: string) => api.get("/payroll/slips/me", { params: { period_id: periodId } });
export const getEmployeeSlips = (id: string, periodId?: string) => api.get(`/payroll/slips/${id}`, { params: { period_id: periodId } });
export const updatePayrollSlip = (id: string, data: any) => api.patch(`/payroll/slips/${id}`, data);
export const exportPayroll = (periodId: string) => api.get(`/payroll/periods/${periodId}/export`, { responseType: "blob" });

// Advances
export const getMyAdvances = () => api.get("/advances/me");
export const requestAdvance = (data: unknown) => api.post("/advances/", data);
export const listAdvances = (status?: string) => api.get("/advances/", { params: { status } });
export const approveAdvance = (id: string, periodId?: string) =>
  api.patch(`/advances/${id}/approve`, null, { params: { period_id: periodId } });
export const rejectAdvance = (id: string) => api.patch(`/advances/${id}/reject`);

// Leaves
export const getMyLeaves = () => api.get("/leaves/me");
export const requestLeave = (data: any) => api.post("/leaves/", data);
export const listLeaves = (status?: string) => api.get("/leaves/", { params: { status } });
export const updateLeaveStatus = (id: string, status: string) => api.patch(`/leaves/${id}`, { status });

// Announcements
export const getAnnouncements = () => api.get("/announcements/");
export const createAnnouncement = (data: any) => api.post("/announcements/", data);
export const deleteAnnouncement = (id: string) => api.delete(`/announcements/${id}`);

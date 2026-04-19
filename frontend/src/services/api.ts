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

// Employees
export const getEmployees = () => api.get("/employees/");
export const getEmployee = (id: string) => api.get(`/employees/${id}`);
export const createEmployee = (data: unknown) => api.post("/employees/", data);
export const updateEmployee = (id: string, data: unknown) => api.patch(`/employees/${id}`, data);

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
export const getMySlips = () => api.get("/payroll/slips/me");
export const getEmployeeSlips = (id: string) => api.get(`/payroll/slips/${id}`);

// Advances
export const getMyAdvances = () => api.get("/advances/me");
export const requestAdvance = (data: unknown) => api.post("/advances/", data);
export const listAdvances = (status?: string) => api.get("/advances/", { params: { status } });
export const approveAdvance = (id: string, periodId?: string) =>
  api.patch(`/advances/${id}/approve`, null, { params: { period_id: periodId } });
export const rejectAdvance = (id: string) => api.patch(`/advances/${id}/reject`);

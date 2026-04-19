export type UserRole = "admin" | "employee";

export interface AuthState {
  token: string | null;
  role: UserRole | null;
  employeeId: string | null;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department: string | null;
  position: string | null;
  employment_type: "monthly" | "daily";
  base_salary: number;
  daily_rate: number | null;
  ot_rate_per_hour: number;
  lunch_allowance_per_day: number;
  work_start_time: string;
  work_end_time: string;
  hire_date: string;
  is_active: boolean;
}

export interface AttendanceLog {
  id: string;
  employee_id: string;
  log_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  late_minutes: number;
  early_leave_minutes: number;
  ot_minutes: number;
  work_minutes: number;
  notes: string | null;
}

export interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: "draft" | "processing" | "approved" | "paid";
}

export interface PayrollSlip {
  id: string;
  period_id: string;
  employee_id: string;
  working_days_in_period: number;
  days_worked: number;
  days_absent: number;
  days_leave: number;
  late_minutes_total: number;
  ot_minutes_total: number;
  base_salary_earned: number;
  lunch_allowance_earned: number;
  ot_pay: number;
  total_earnings: number;
  social_security_deduction: number;
  advance_deduction: number;
  late_penalty: number;
  total_deductions: number;
  net_pay: number;
  status: "draft" | "approved" | "paid";
  approved_at: string | null;
}

export interface Advance {
  id: string;
  employee_id: string;
  amount: number;
  request_date: string;
  approved_date: string | null;
  period_id: string | null;
  status: "pending" | "approved" | "rejected" | "deducted";
  reason: string | null;
}

import { useQuery } from "@tanstack/react-query";
import { getMySlips, getMyAdvances, getAttendance } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { PayrollSlip, Advance, AttendanceLog } from "../../types";

export default function EmployeeDashboard() {
  const { employeeId } = useAuthStore();
  const now = new Date();
  const start = format(startOfMonth(now), "yyyy-MM-dd");
  const end = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: slips } = useQuery<PayrollSlip[]>({
    queryKey: ["mySlips"],
    queryFn: () => getMySlips().then((r) => r.data),
  });
  const { data: advances } = useQuery<Advance[]>({
    queryKey: ["myAdvances"],
    queryFn: () => getMyAdvances().then((r) => r.data),
  });
  const { data: attendance } = useQuery<AttendanceLog[]>({
    queryKey: ["myAttendance", start, end],
    queryFn: () => getAttendance(employeeId!, start, end).then((r) => r.data),
    enabled: !!employeeId,
  });

  const latestSlip = slips?.[0];
  const pendingAdvances = advances?.filter((a) => a.status === "pending").length ?? 0;
  const totalLateMinutes = attendance?.reduce((s, l) => s + l.late_minutes, 0) ?? 0;
  const totalOtMinutes = attendance?.reduce((s, l) => s + l.ot_minutes, 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Dashboard</h1>

      {latestSlip && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-6 shadow">
          <p className="text-blue-200 text-sm mb-1">Latest Net Pay</p>
          <p className="text-4xl font-bold">฿{latestSlip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-blue-100">
            <div><p className="font-semibold text-white">฿{latestSlip.total_earnings.toLocaleString()}</p><p>Earnings</p></div>
            <div><p className="font-semibold text-white">฿{latestSlip.total_deductions.toLocaleString()}</p><p>Deductions</p></div>
            <div><p className="font-semibold text-white capitalize">{latestSlip.status}</p><p>Status</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Days Worked", value: attendance?.filter(l => l.status !== "absent").length ?? 0 },
          { label: "Late (min)", value: totalLateMinutes },
          { label: "OT (min)", value: totalOtMinutes },
          { label: "Pending Advances", value: pendingAdvances },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-700 mb-4">This Month's Attendance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th>
                <th className="pb-2">Clock In</th>
                <th className="pb-2">Clock Out</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Late (min)</th>
                <th className="pb-2">OT (min)</th>
              </tr>
            </thead>
            <tbody>
              {attendance?.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="py-2">{log.log_date}</td>
                  <td className="py-2">{log.clock_in ? format(new Date(log.clock_in), "HH:mm") : "—"}</td>
                  <td className="py-2">{log.clock_out ? format(new Date(log.clock_out), "HH:mm") : "—"}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      log.status === "present" ? "bg-green-100 text-green-700" :
                      log.status === "late" ? "bg-yellow-100 text-yellow-700" :
                      log.status === "absent" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2 text-center">{log.late_minutes || "—"}</td>
                  <td className="py-2 text-center">{log.ot_minutes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

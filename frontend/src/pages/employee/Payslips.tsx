import { useQuery } from "@tanstack/react-query";
import { getMySlips } from "../../services/api";
import type { PayrollSlip } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  paid: "bg-purple-100 text-purple-700",
};

export default function EmployeePayslips() {
  const { data: slips = [] } = useQuery<PayrollSlip[]>({
    queryKey: ["mySlips"],
    queryFn: () => getMySlips().then(r => r.data),
  });

  if (slips.length === 0) return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payslips</h1>
      <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">No payslips available yet.</div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payslips</h1>
      <div className="space-y-4">
        {slips.map(slip => (
          <div key={slip.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-sm text-gray-500 mb-1">Net Pay</p>
                <p className="text-3xl font-bold text-gray-800">
                  ฿{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[slip.status]}`}>
                {slip.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 text-sm">
              {/* Attendance */}
              <div>
                <p className="font-semibold text-gray-700 mb-3 pb-1 border-b">Attendance</p>
                <div className="space-y-2 text-gray-600">
                  <Row label="Working days" value={slip.working_days_in_period} />
                  <Row label="Days worked" value={slip.days_worked} />
                  <Row label="Days absent" value={slip.days_absent} highlight={slip.days_absent > 0 ? "text-red-500" : ""} />
                  <Row label="Days leave" value={slip.days_leave} />
                  <Row label="Late (min)" value={slip.late_minutes_total} highlight={slip.late_minutes_total > 0 ? "text-yellow-600" : ""} />
                  <Row label="OT (min)" value={slip.ot_minutes_total} highlight="text-blue-600" />
                </div>
              </div>

              {/* Earnings */}
              <div>
                <p className="font-semibold text-gray-700 mb-3 pb-1 border-b">Earnings</p>
                <div className="space-y-2 text-gray-600">
                  <Row label="Base salary" value={`฿${slip.base_salary_earned.toLocaleString()}`} />
                  <Row label="Lunch allowance" value={`฿${slip.lunch_allowance_earned.toLocaleString()}`} />
                  <Row label="OT pay" value={`฿${slip.ot_pay.toLocaleString()}`} highlight="text-blue-600" />
                  <div className="border-t pt-2 flex justify-between font-semibold text-gray-700">
                    <span>Total</span><span>฿{slip.total_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <p className="font-semibold text-gray-700 mb-3 pb-1 border-b">Deductions</p>
                <div className="space-y-2 text-gray-600">
                  <Row label="Social Security" value={`฿${slip.social_security_deduction.toLocaleString()}`} />
                  <Row label="Advances" value={`฿${slip.advance_deduction.toLocaleString()}`} />
                  <Row label="Late penalty" value={`฿${slip.late_penalty.toLocaleString()}`} />
                  <div className="border-t pt-2 flex justify-between font-semibold text-red-600">
                    <span>Total</span><span>฿{slip.total_deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, highlight = "" }: { label: string; value: string | number; highlight?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={highlight}>{value}</span>
    </div>
  );
}

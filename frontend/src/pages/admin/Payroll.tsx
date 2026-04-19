import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPeriods, createPeriod, calculatePeriod, approvePeriod, getEmployees, getEmployeeSlips } from "../../services/api";
import type { PayrollPeriod, PayrollSlip, Employee } from "../../types";
import { Plus, Calculator, CheckCircle, ChevronDown, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-purple-100 text-purple-700",
};

export default function AdminPayroll() {
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [form, setForm] = useState({ period_name: "", start_date: "", end_date: "", payment_date: "" });

  const { data: periods = [] } = useQuery<PayrollPeriod[]>({
    queryKey: ["periods"],
    queryFn: () => getPeriods().then(r => r.data),
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => getEmployees().then(r => r.data),
  });
  const { data: slips = [] } = useQuery<PayrollSlip[]>({
    queryKey: ["slips", selectedEmp],
    queryFn: () => selectedEmp ? getEmployeeSlips(selectedEmp).then(r => r.data) : Promise.resolve([]),
    enabled: !!selectedEmp,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createPeriod(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["periods"] }); setCreateModal(false); },
  });
  const calcMut = useMutation({
    mutationFn: (id: string) => calculatePeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods"] }),
  });
  const approveMut = useMutation({
    mutationFn: (id: string) => approvePeriod(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["periods"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(form);
  };

  void selectedPeriod; // period selection highlights the row; slips are fetched per employee

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payroll</h1>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> New Period
        </button>
      </div>

      {/* Periods list */}
      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Period", "Start", "End", "Payment Date", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.period_name}</td>
                <td className="px-4 py-3 text-gray-500">{p.start_date}</td>
                <td className="px-4 py-3 text-gray-500">{p.end_date}</td>
                <td className="px-4 py-3 text-gray-500">{p.payment_date || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => calcMut.mutate(p.id)}
                    disabled={calcMut.isPending}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100"
                  >
                    <Calculator size={12} /> Calculate
                  </button>
                  {p.status === "processing" && (
                    <button
                      onClick={() => approveMut.mutate(p.id)}
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100"
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                  )}
                  <button onClick={() => setSelectedPeriod(p.id === selectedPeriod ? "" : p.id)}
                    className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">
                    <ChevronDown size={12} /> View Slips
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payslip viewer */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-800">Payslip Viewer</h2>
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
          </select>
        </div>
        {slips.map(slip => (
          <div key={slip.id} className="border rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-800">Payslip</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[slip.status]}`}>{slip.status}</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">฿{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-600 mb-2">Attendance</p>
                <div className="space-y-1 text-gray-500">
                  <div className="flex justify-between"><span>Working days</span><span>{slip.working_days_in_period}</span></div>
                  <div className="flex justify-between"><span>Days worked</span><span>{slip.days_worked}</span></div>
                  <div className="flex justify-between"><span>Days absent</span><span className="text-red-500">{slip.days_absent}</span></div>
                  <div className="flex justify-between"><span>Late (min)</span><span className="text-yellow-600">{slip.late_minutes_total}</span></div>
                  <div className="flex justify-between"><span>OT (min)</span><span className="text-blue-600">{slip.ot_minutes_total}</span></div>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-600 mb-2">Earnings</p>
                <div className="space-y-1 text-gray-500">
                  <div className="flex justify-between"><span>Base salary</span><span>฿{slip.base_salary_earned.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Lunch allowance</span><span>฿{slip.lunch_allowance_earned.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>OT pay</span><span>฿{slip.ot_pay.toLocaleString()}</span></div>
                  <div className="flex justify-between font-medium text-gray-700 border-t pt-1 mt-1"><span>Total earnings</span><span>฿{slip.total_earnings.toLocaleString()}</span></div>
                </div>
                <p className="font-medium text-gray-600 mb-2 mt-3">Deductions</p>
                <div className="space-y-1 text-gray-500">
                  <div className="flex justify-between"><span>Social Security</span><span>฿{slip.social_security_deduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Advances</span><span>฿{slip.advance_deduction.toLocaleString()}</span></div>
                  <div className="flex justify-between font-medium text-red-600 border-t pt-1 mt-1"><span>Total deductions</span><span>฿{slip.total_deductions.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {selectedEmp && slips.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No payslips found for this employee.</p>}
        {!selectedEmp && <p className="text-gray-400 text-sm text-center py-6">Select an employee to view payslips.</p>}
      </div>

      {/* Create Period modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">New Payroll Period</h2>
              <button onClick={() => setCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              {[
                { label: "Period Name", key: "period_name", type: "text", placeholder: "e.g. April 2026" },
                { label: "Start Date", key: "start_date", type: "date" },
                { label: "End Date", key: "end_date", type: "date" },
                { label: "Payment Date", key: "payment_date", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type={f.type} required placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

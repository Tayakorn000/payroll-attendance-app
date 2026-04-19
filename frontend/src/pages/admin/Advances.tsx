import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdvances, approveAdvance, rejectAdvance, requestAdvance, getPeriods, getEmployees } from "../../services/api";
import type { Advance, Employee, PayrollPeriod } from "../../types";
import { CheckCircle, XCircle, Plus, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  deducted: "bg-green-100 text-green-700",
};

export default function AdminAdvances() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({ employee_id: "", amount: "", reason: "" });
  const [approveModal, setApproveModal] = useState<Advance | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const { data: advances = [] } = useQuery<Advance[]>({
    queryKey: ["advances", statusFilter],
    queryFn: () => listAdvances(statusFilter || undefined).then(r => r.data),
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => getEmployees().then(r => r.data),
  });
  const { data: periods = [] } = useQuery<PayrollPeriod[]>({
    queryKey: ["periods"],
    queryFn: () => getPeriods().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => requestAdvance(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["advances"] }); setCreateModal(false); },
  });
  const approveMut = useMutation({
    mutationFn: ({ id, periodId }: { id: string; periodId?: string }) => approveAdvance(id, periodId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["advances"] }); setApproveModal(null); },
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectAdvance(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["advances"] }),
  });

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Advances</h1>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> Record Advance
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex gap-3">
        {["", "pending", "approved", "rejected", "deducted"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Employee", "Amount", "Request Date", "Reason", "Status", "Period", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {advances.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No advances found</td></tr>
            ) : advances.map(adv => {
              const emp = empMap[adv.employee_id];
              return (
                <tr key={adv.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{emp?.first_name || "—"}</p>
                    <p className="text-xs text-gray-400">{emp?.employee_code}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">฿{Number(adv.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{adv.request_date}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{adv.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[adv.status]}`}>{adv.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{periods.find(p => p.id === adv.period_id)?.period_name || "—"}</td>
                  <td className="px-4 py-3">
                    {adv.status === "pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => setApproveModal(adv)} className="text-green-500 hover:text-green-700"><CheckCircle size={16} /></button>
                        <button onClick={() => rejectMut.mutate(adv.id)} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Record Advance</h2>
              <button onClick={() => setCreateModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); createMut.mutate({ ...form, amount: Number(form.amount) }); }} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
                <select required value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (THB)</label>
                <input type="number" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve modal (with period selection) */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Approve Advance</h2>
              <button onClick={() => setApproveModal(null)}><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Amount: <strong>฿{Number(approveModal.amount).toLocaleString()}</strong></p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Deduct from Period (optional)</label>
              <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">No period (approve only)</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.period_name}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setApproveModal(null)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button onClick={() => approveMut.mutate({ id: approveModal.id, periodId: selectedPeriod || undefined })}
                className="flex-1 bg-green-600 text-white rounded-lg py-2 text-sm">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

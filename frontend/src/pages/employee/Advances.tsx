import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyAdvances, requestAdvance } from "../../services/api";
import { useAuthStore } from "../../store/auth";
import type { Advance } from "../../types";
import { Plus, X } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  deducted: "bg-green-100 text-green-700",
};

export default function EmployeeAdvances() {
  const qc = useQueryClient();
  const { employeeId } = useAuthStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ amount: "", reason: "" });

  const { data: advances = [] } = useQuery<Advance[]>({
    queryKey: ["myAdvances"],
    queryFn: () => getMyAdvances().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => requestAdvance(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myAdvances"] }); setModal(false); setForm({ amount: "", reason: "" }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    createMut.mutate({ employee_id: employeeId, amount: Number(form.amount), reason: form.reason });
  };

  const totalPending = advances.filter(a => a.status === "pending").reduce((s, a) => s + Number(a.amount), 0);
  const totalApproved = advances.filter(a => a.status === "approved").reduce((s, a) => s + Number(a.amount), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Advances</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> Request Advance
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">฿{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Approved (awaiting deduction)</p>
          <p className="text-2xl font-bold text-blue-600">฿{totalApproved.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Request Date", "Amount", "Reason", "Status", "Approved Date"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {advances.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No advance requests yet.</td></tr>
            ) : advances.map(adv => (
              <tr key={adv.id} className="border-b last:border-0">
                <td className="px-4 py-3">{adv.request_date}</td>
                <td className="px-4 py-3 font-medium">฿{Number(adv.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{adv.reason || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[adv.status]}`}>{adv.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{adv.approved_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Request Advance</h2>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount (THB)</label>
                <input type="number" required min="1" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm disabled:opacity-50">Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

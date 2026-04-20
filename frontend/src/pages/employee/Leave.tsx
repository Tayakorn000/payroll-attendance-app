import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyLeaves, requestLeave } from "../../services/api";
import { Plus, X, Calendar } from "lucide-react";

const TYPE_THAI: Record<string, string> = {
  sick: "ลาป่วย",
  annual: "ลาพักร้อน",
  personal: "ลากิจ",
  unpaid: "ลาไม่รับค่าจ้าง",
};

export default function EmployeeLeaves() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ leave_type: "sick", start_date: "", end_date: "", days_count: 1, reason: "" });

  const { data: leaves = [] } = useQuery<any[]>({
    queryKey: ["myLeaves"],
    queryFn: () => getMyLeaves().then(r => r.data),
  });

  const requestMut = useMutation({
    mutationFn: (data: any) => requestLeave(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myLeaves"] }); setModal(false); },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">แจ้งลาหยุด</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> ส่งคำขอลา
        </button>
      </div>

      <div className="grid gap-4">
        {leaves.map((l) => (
          <div key={l.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                <Calendar size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-800">{TYPE_THAI[l.leave_type] || l.leave_type} — {l.days_count} วัน</p>
                <p className="text-gray-500 text-sm">{l.start_date} ถึง {l.end_date}</p>
                {l.reason && <p className="text-gray-400 text-xs mt-1">เหตุผล: {l.reason}</p>}
              </div>
            </div>
            <div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                l.status === "approved" ? "bg-green-100 text-green-700" :
                l.status === "rejected" ? "bg-red-100 text-red-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {l.status === "approved" ? "อนุมัติแล้ว" : l.status === "rejected" ? "ปฏิเสธ" : "รอดำเนินการ"}
              </span>
            </div>
          </div>
        ))}
        {leaves.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">ยังไม่มีประวัติการลา</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-800">ส่งคำขอลา</h2>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); requestMut.mutate(form); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทการลา</label>
                <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="sick">ลาป่วย</option>
                  <option value="annual">ลาพักร้อน</option>
                  <option value="personal">ลากิจ</option>
                  <option value="unpaid">ลาไม่รับค่าจ้าง</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ตั้งแต่วันที่</label>
                  <input type="date" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ถึงวันที่</label>
                  <input type="date" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนวันลา</label>
                <input type="number" required value={form.days_count} onChange={e => setForm({ ...form, days_count: parseInt(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" min={1} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เหตุผล</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none" rows={3} placeholder="ระบุเหตุผล (ถ้ามี)" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">ยกเลิก</button>
                <button type="submit" disabled={requestMut.isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">ส่งคำขอ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

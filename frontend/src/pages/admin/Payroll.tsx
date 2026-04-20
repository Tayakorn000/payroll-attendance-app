import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPeriods, createPeriod, calculatePeriod, approvePeriod, getEmployees, getEmployeeSlips, updatePayrollSlip, exportPayroll } from "../../services/api";
import type { PayrollPeriod, PayrollSlip, Employee } from "../../types";
import { Plus, Calculator, CheckCircle, ChevronDown, X, Download, Edit2, Save } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-purple-100 text-purple-700",
};

const STATUS_THAI: Record<string, string> = {
  draft: "ฉบับร่าง",
  processing: "กำลังดำเนินการ",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายแล้ว",
};

export default function AdminPayroll() {
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [form, setForm] = useState({ period_name: "", start_date: "", end_date: "", payment_date: "" });
  
  const [editingSlip, setEditingSlip] = useState<string | null>(null);
  const [slipForm, setSlipForm] = useState({ bonus: 0, commission: 0, other_earnings: 0, other_deductions: 0, notes: "" });

  const { data: periods = [] } = useQuery<PayrollPeriod[]>({
    queryKey: ["periods"],
    queryFn: () => getPeriods().then(r => r.data),
  });
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => getEmployees().then(r => r.data),
  });
  const { data: slips = [] } = useQuery<PayrollSlip[]>({
    queryKey: ["slips", selectedEmp, selectedPeriod],
    queryFn: () => selectedEmp ? getEmployeeSlips(selectedEmp, selectedPeriod).then(r => r.data) : Promise.resolve([]),
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
  const updateSlipMut = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updatePayrollSlip(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["slips"] }); setEditingSlip(null); },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate(form);
  };

  const handleExport = (periodId: string) => {
    exportPayroll(periodId).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll_export_${periodId}.csv`);
      document.body.appendChild(link);
      link.click();
    });
  };

  const startEdit = (slip: PayrollSlip) => {
    setEditingSlip(slip.id);
    setSlipForm({
      bonus: slip.bonus,
      commission: slip.commission,
      other_earnings: slip.other_earnings,
      other_deductions: slip.other_deductions,
      notes: slip.notes || "",
    });
  };

  const saveSlip = (id: string) => {
    updateSlipMut.mutate({ id, data: slipForm });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการเงินเดือน</h1>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <Plus size={16} /> เพิ่มรอบการจ่าย
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["รอบการจ่าย", "เริ่มต้น", "สิ้นสุด", "วันที่จ่าย", "สถานะ", "จัดการ"].map(h => (
                <th key={h} className="px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${selectedPeriod === p.id ? 'bg-blue-50/30' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{p.period_name}</td>
                <td className="px-4 py-3 text-gray-500">{p.start_date}</td>
                <td className="px-4 py-3 text-gray-500">{p.end_date}</td>
                <td className="px-4 py-3 text-gray-500">{p.payment_date || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status]}`}>{STATUS_THAI[p.status] || p.status}</span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => calcMut.mutate(p.id)}
                    disabled={calcMut.isPending}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md hover:bg-blue-100 font-medium"
                  >
                    <Calculator size={14} /> คำนวณ
                  </button>
                  {p.status === "processing" && (
                    <button
                      onClick={() => approveMut.mutate(p.id)}
                      className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-md hover:bg-green-100 font-medium"
                    >
                      <CheckCircle size={14} /> อนุมัติ
                    </button>
                  )}
                  <button onClick={() => setSelectedPeriod(p.id === selectedPeriod ? "" : p.id)}
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium ${selectedPeriod === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <ChevronDown size={14} /> ดูสลิป
                  </button>
                  <button onClick={() => handleExport(p.id)} className="p-1.5 text-gray-400 hover:text-blue-600">
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="font-bold text-gray-800 text-lg">รายละเอียดสลิปเงินเดือน</h2>
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
            className="border border-gray-200 rounded-lg px-4 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64">
            <option value="">เลือกพนักงาน...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
          </select>
        </div>
        
        {slips.map(slip => (
          <div key={slip.id} className="border border-gray-200 rounded-xl p-5 mb-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">สลิปเงินเดือนประจำงวด</p>
                <h3 className="font-bold text-gray-900">{periods.find(p => p.id === slip.period_id)?.period_name}</h3>
                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${STATUS_COLORS[slip.status]}`}>{STATUS_THAI[slip.status] || slip.status}</span>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">ยอดรับสุทธิ</p>
                <p className="text-3xl font-black text-blue-600">฿{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-gray-800 border-b pb-2 mb-3">ข้อมูลการเข้างาน</p>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex justify-between"><span>จำนวนวันทำงานในงวด</span><span className="font-medium">{slip.working_days_in_period}</span></div>
                    <div className="flex justify-between"><span>วันที่มาทำงานจริง</span><span className="font-medium text-green-600">{slip.days_worked}</span></div>
                    <div className="flex justify-between"><span>จำนวนวันที่ลา</span><span className="font-medium text-blue-600">{slip.days_leave}</span></div>
                    <div className="flex justify-between"><span>จำนวนวันที่ขาดงาน</span><span className="font-medium text-red-600">{slip.days_absent}</span></div>
                    <div className="flex justify-between border-t pt-2 mt-2"><span>มาสายรวม (นาที)</span><span className="font-medium text-orange-600">{slip.late_minutes_total}</span></div>
                    <div className="flex justify-between"><span>OT รวม (นาที)</span><span className="font-medium text-blue-600">{slip.ot_minutes_total}</span></div>
                  </div>
                </div>
                
                {editingSlip === slip.id ? (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase">บันทึกเพิ่มเติม</p>
                    <textarea 
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      value={slipForm.notes}
                      onChange={e => setSlipForm({ ...slipForm, notes: e.target.value })}
                    />
                  </div>
                ) : slip.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">หมายเหตุ</p>
                    <p className="text-gray-600 text-xs italic">{slip.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center border-b pb-2 mb-3">
                  <p className="font-bold text-gray-800">รายการรายได้</p>
                  {editingSlip !== slip.id && slip.status === 'draft' && (
                    <button onClick={() => startEdit(slip)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs">
                      <Edit2 size={12} /> แก้ไขยอด
                    </button>
                  )}
                  {editingSlip === slip.id && (
                    <button onClick={() => saveSlip(slip.id)} className="bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs">
                      <Save size={12} /> บันทึก
                    </button>
                  )}
                </div>
                
                <div className="space-y-2 text-gray-600 mb-6">
                  <div className="flex justify-between"><span>เงินเดือนพื้นฐาน</span><span>฿{slip.base_salary_earned.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>ค่าอาหารกลางวัน</span><span>฿{slip.lunch_allowance_earned.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>ค่าล่วงเวลา (OT)</span><span>฿{slip.ot_pay.toLocaleString()}</span></div>
                  
                  {editingSlip === slip.id ? (
                    <div className="space-y-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-bold">โบนัส</span>
                        <input type="number" className="w-24 border rounded px-2 py-1 text-right" value={slipForm.bonus} onChange={e => setSlipForm({ ...slipForm, bonus: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-bold">ค่าคอมมิชชั่น</span>
                        <input type="number" className="w-24 border rounded px-2 py-1 text-right" value={slipForm.commission} onChange={e => setSlipForm({ ...slipForm, commission: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-xs font-bold">รายได้อื่นๆ</span>
                        <input type="number" className="w-24 border rounded px-2 py-1 text-right" value={slipForm.other_earnings} onChange={e => setSlipForm({ ...slipForm, other_earnings: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>
                  ) : (
                    <>
                      {slip.bonus > 0 && <div className="flex justify-between text-green-600 font-medium"><span>โบนัส</span><span>+ ฿{slip.bonus.toLocaleString()}</span></div>}
                      {slip.commission > 0 && <div className="flex justify-between text-green-600 font-medium"><span>ค่าคอมมิชชั่น</span><span>+ ฿{slip.commission.toLocaleString()}</span></div>}
                      {slip.other_earnings > 0 && <div className="flex justify-between"><span>รายได้อื่นๆ</span><span>฿{slip.other_earnings.toLocaleString()}</span></div>}
                    </>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 border-t pt-2 mt-2"><span>รวมรายได้</span><span>฿{slip.total_earnings.toLocaleString()}</span></div>
                </div>

                <p className="font-bold text-gray-800 border-b pb-2 mb-3">รายการหัก</p>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between"><span>ประกันสังคม</span><span className="text-red-500">- ฿{slip.social_security_deduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>เงินเบิกล่วงหน้า</span><span className="text-red-500">- ฿{slip.advance_deduction.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>หักมาสาย</span><span className="text-red-500">- ฿{slip.late_penalty.toLocaleString()}</span></div>
                  
                  {editingSlip === slip.id ? (
                    <div className="flex justify-between items-center gap-4 bg-red-50/50 p-3 rounded-lg border border-red-100">
                      <span className="text-xs font-bold">รายการหักอื่นๆ</span>
                      <input type="number" className="w-24 border rounded px-2 py-1 text-right" value={slipForm.other_deductions} onChange={e => setSlipForm({ ...slipForm, other_deductions: parseFloat(e.target.value) || 0 })} />
                    </div>
                  ) : (
                    slip.other_deductions > 0 && <div className="flex justify-between text-red-500 font-medium"><span>หักอื่นๆ</span><span>- ฿{slip.other_deductions.toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-red-600 border-t pt-2 mt-2"><span>รวมรายการหัก</span><span>- ฿{slip.total_deductions.toLocaleString()}</span></div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {selectedEmp && slips.length === 0 && <p className="text-gray-400 text-sm text-center py-12">ยังไม่มีการคำนวณสลิปเงินเดือนสำหรับพนักงานรายนี้ในงวดปัจจุบัน</p>}
        {!selectedEmp && <p className="text-gray-400 text-sm text-center py-12">กรุณาเลือกพนักงานเพื่อตรวจสอบข้อมูล</p>}
      </div>

      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800">สร้างรอบการจ่ายเงินเดือนใหม่</h2>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {[
                { label: "ชื่อรอบการจ่าย", key: "period_name", type: "text", placeholder: "เช่น เมษายน 2569" },
                { label: "วันที่เริ่มต้น", key: "start_date", type: "date" },
                { label: "วันที่สิ้นสุด", key: "end_date", type: "date" },
                { label: "วันที่จ่ายเงิน", key: "payment_date", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{f.label}</label>
                  <input type={f.type} required placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              ))}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 transition-colors">สร้างรอบการจ่าย</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

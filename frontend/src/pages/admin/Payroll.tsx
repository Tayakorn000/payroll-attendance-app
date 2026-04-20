import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPeriods, createPeriod, calculatePeriod, approvePeriod, getEmployees, getEmployeeSlips, updatePayrollSlip, exportPayroll } from "../../services/api";
import type { PayrollPeriod, PayrollSlip, Employee } from "../../types";
import { Plus, Calculator, CheckCircle, ChevronDown, X, Download, Edit2, Save, BadgeDollarSign, UserCircle } from "lucide-react";

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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">การจัดการเงินเดือน</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">คำนวณ ตรวจสอบ และอนุมัติสลิปเงินเดือนพนักงาน</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
          <Plus size={18} /> เพิ่มรอบการจ่ายใหม่
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                {["รอบการจ่าย", "ระยะเวลา", "วันที่จ่าย", "สถานะ", "การจัดการ"].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${selectedPeriod === p.id ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4 font-black text-gray-900">{p.period_name}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{p.start_date} → {p.end_date}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{p.payment_date || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[p.status]}`}>{STATUS_THAI[p.status] || p.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => calcMut.mutate(p.id)}
                        disabled={calcMut.isPending}
                        className="flex items-center gap-1.5 text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-wider"
                      >
                        <Calculator size={14} /> {calcMut.isPending ? 'กำลังคำนวณ...' : 'คำนวณ'}
                      </button>
                      {p.status === "processing" && (
                        <button
                          onClick={() => approveMut.mutate(p.id)}
                          className="flex items-center gap-1.5 text-[10px] font-black bg-green-50 text-green-600 px-3 py-2 rounded-xl hover:bg-green-600 hover:text-white transition-all uppercase tracking-wider"
                        >
                          <CheckCircle size={14} /> อนุมัติ
                        </button>
                      )}
                      <button onClick={() => setSelectedPeriod(p.id === selectedPeriod ? "" : p.id)}
                        className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-2 rounded-xl transition-all uppercase tracking-wider ${selectedPeriod === p.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <ChevronDown size={14} className={selectedPeriod === p.id ? 'rotate-180 transition-transform' : 'transition-transform'} /> ตรวจสอบ
                      </button>
                      <button onClick={() => handleExport(p.id)} title="Download CSV" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-100">
               <UserCircle size={24} />
             </div>
             <div>
               <h2 className="font-black text-gray-900 text-xl tracking-tight">รายละเอียดรายบุคคล</h2>
               <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Individual Slip Preview</p>
             </div>
          </div>
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
            className="border border-gray-100 rounded-2xl px-6 py-3 text-sm font-bold bg-gray-50 focus:ring-4 focus:ring-blue-100 outline-none w-full sm:w-80 shadow-inner transition-all">
            <option value="">เลือกรายชื่อพนักงาน...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.employee_code} — {e.full_name}</option>)}
          </select>
        </div>
        
        {slips.map(slip => (
          <div key={slip.id} className="border-2 border-gray-50 rounded-3xl p-8 mb-8 shadow-sm relative overflow-hidden bg-gray-50/20">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
            
            <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-10">
              <div>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">ประจำงวดการจ่าย</p>
                <h3 className="font-black text-2xl text-gray-900 tracking-tight">{periods.find(p => p.id === slip.period_id)?.period_name}</h3>
                <div className="flex gap-2 mt-3">
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${STATUS_COLORS[slip.status]}`}>{STATUS_THAI[slip.status] || slip.status}</span>
                </div>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-blue-600">ยอดรับสุทธิ (Net Pay)</p>
                <p className="text-4xl font-black text-gray-900 tracking-tighter">฿{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 text-sm">
              <div className="space-y-6">
                <div>
                  <p className="font-black text-gray-900 border-b-2 border-gray-100 pb-3 mb-4 uppercase tracking-wider text-[11px] flex justify-between items-center">
                    <span>ข้อมูลการเข้างาน</span>
                    <BadgeDollarSign size={14} className="text-gray-300" />
                  </p>
                  <div className="space-y-3 text-gray-600">
                    <Row label="วันทำงานในงวด" value={slip.working_days_in_period} />
                    <Row label="วันมาทำงานจริง" value={slip.days_worked} highlight="text-green-600 font-bold" />
                    <Row label="วันลา (ที่อนุมัติ)" value={slip.days_leave} highlight="text-blue-600 font-bold" />
                    <Row label="วันขาดงาน" value={slip.days_absent} highlight="text-red-500 font-bold" />
                    <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between items-center">
                       <span className="text-gray-400 text-xs">มาสายรวม (นาที)</span>
                       <span className="font-black text-orange-600">{slip.late_minutes_total}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">บันทึกเพิ่มเติม</p>
                  {editingSlip === slip.id ? (
                    <textarea 
                      className="w-full border border-gray-100 rounded-xl p-3 text-xs outline-none focus:ring-4 focus:ring-blue-500/10 bg-gray-50 transition-all"
                      rows={3}
                      value={slipForm.notes}
                      onChange={e => setSlipForm({ ...slipForm, notes: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-600 text-xs italic leading-relaxed">{slip.notes || "ไม่มีบันทึกพิเศษในงวดนี้"}</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center border-b-2 border-blue-600 pb-3 mb-4">
                  <p className="font-black text-gray-900 uppercase tracking-wider text-[11px]">รายการรายได้ (Earnings)</p>
                  {editingSlip !== slip.id && slip.status === 'draft' && (
                    <button onClick={() => startEdit(slip)} className="text-blue-600 hover:text-blue-800 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Edit2 size={12} /> แก้ไขยอด
                    </button>
                  )}
                  {editingSlip === slip.id && (
                    <button onClick={() => saveSlip(slip.id)} className="bg-blue-600 text-white px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-blue-100">
                      <Save size={12} /> บันทึก
                    </button>
                  )}
                </div>
                
                <div className="space-y-3 text-gray-600 mb-8">
                  <Row label="เงินเดือนพื้นฐาน" value={slip.base_salary_earned.toLocaleString()} prefix="฿" />
                  <Row label="ค่าอาหารกลางวัน" value={slip.lunch_allowance_earned.toLocaleString()} prefix="฿" />
                  <Row label="ค่าล่วงเวลา (OT)" value={slip.ot_pay.toLocaleString()} prefix="฿" />
                  
                  {editingSlip === slip.id ? (
                    <div className="space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mt-4 animate-in slide-in-from-top-1 duration-200">
                      <EditField label="โบนัส" value={slipForm.bonus} onChange={v => setSlipForm({ ...slipForm, bonus: v })} />
                      <EditField label="คอมมิชชั่น" value={slipForm.commission} onChange={v => setSlipForm({ ...slipForm, commission: v })} />
                      <EditField label="รายได้อื่นๆ" value={slipForm.other_earnings} onChange={v => setSlipForm({ ...slipForm, other_earnings: v })} />
                    </div>
                  ) : (
                    <>
                      {slip.bonus > 0 && <Row label="โบนัส" value={slip.bonus.toLocaleString()} prefix="+ ฿" highlight="text-green-600 font-bold" />}
                      {slip.commission > 0 && <Row label="คอมมิชชั่น" value={slip.commission.toLocaleString()} prefix="+ ฿" highlight="text-green-600 font-bold" />}
                      {slip.other_earnings > 0 && <Row label="รายได้อื่นๆ" value={slip.other_earnings.toLocaleString()} prefix="+ ฿" />}
                    </>
                  )}
                  <div className="flex justify-between font-black text-gray-900 border-t-2 border-dashed border-gray-100 pt-4 mt-6 text-base tracking-tight">
                    <span>รวมรายได้</span><span>฿{slip.total_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-black text-red-600 border-b-2 border-red-500 pb-3 mb-4 uppercase tracking-wider text-[11px]">รายการหัก (Deductions)</p>
                <div className="space-y-3 text-gray-600">
                  <Row label="ประกันสังคม" value={slip.social_security_deduction.toLocaleString()} prefix="- ฿" highlight="text-red-500" />
                  <Row label="กองทุนสำรองฯ (PVD)" value={slip.provident_fund_deduction.toLocaleString()} prefix="- ฿" highlight="text-red-500" />
                  <Row label="ภาษีหัก ณ ที่จ่าย" value={slip.tax_deduction.toLocaleString()} prefix="- ฿" highlight="text-red-500 font-bold" />
                  <Row label="หักเงินเบิกล่วงหน้า" value={slip.advance_deduction.toLocaleString()} prefix="- ฿" highlight="text-red-500" />
                  <Row label="หักมาสาย/ขาดงาน" value={slip.late_penalty.toLocaleString()} prefix="- ฿" highlight="text-red-500" />
                  
                  {editingSlip === slip.id ? (
                    <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 mt-4 animate-in slide-in-from-top-1 duration-200">
                      <EditField label="รายการหักอื่นๆ" value={slipForm.other_deductions} onChange={v => setSlipForm({ ...slipForm, other_deductions: v })} />
                    </div>
                  ) : (
                    slip.other_deductions > 0 && <Row label="หักอื่นๆ" value={slip.other_deductions.toLocaleString()} prefix="- ฿" highlight="text-red-500 font-bold" />
                  )}
                  <div className="flex justify-between font-black text-red-600 border-t-2 border-dashed border-gray-100 pt-4 mt-6 text-base tracking-tight">
                    <span>รวมรายการหัก</span><span>- ฿{slip.total_deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {selectedEmp && slips.length === 0 && (
          <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
             <Calculator className="mx-auto text-gray-200 mb-4" size={48} />
             <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">ยังไม่มีสลิปเงินเดือนสำหรับงวดนี้</p>
          </div>
        )}
        {!selectedEmp && (
          <div className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
             <UserCircle className="mx-auto text-gray-200 mb-4" size={48} />
             <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">กรุณาเลือกพนักงานเพื่อตรวจสอบสลิป</p>
          </div>
        )}
      </div>

      {createModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50/50">
              <h2 className="font-black text-gray-900 uppercase tracking-tight">สร้างรอบการจ่าย</h2>
              <button onClick={() => setCreateModal(false)} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full border shadow-sm transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-5">
              {[
                { label: "ชื่อรอบการจ่าย", key: "period_name", type: "text", placeholder: "เช่น เมษายน 2569" },
                { label: "วันที่เริ่มต้น", key: "start_date", type: "date" },
                { label: "วันที่สิ้นสุด", key: "end_date", type: "date" },
                { label: "วันที่จ่ายเงิน", key: "payment_date", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">{f.label}</label>
                  <input type={f.type} required placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold bg-gray-50 focus:ring-4 focus:ring-blue-100 outline-none transition-all shadow-inner" />
                </div>
              ))}
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setCreateModal(false)} className="flex-1 border border-gray-100 rounded-2xl py-3 text-sm font-black text-gray-400 hover:bg-gray-50 transition-all">ยกเลิก</button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 bg-blue-600 text-white rounded-2xl py-3 text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">สร้างรอบงาน</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, prefix="", highlight = "" }: { label: string; value: string | number; prefix?: string; highlight?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-xs font-bold">{label}</span>
      <span className={`font-black tracking-tight tabular-nums ${highlight}`}>{prefix}{value}</span>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{label}</span>
      <input 
        type="number" 
        className="w-28 border border-gray-100 rounded-xl px-3 py-1.5 text-right font-black text-sm bg-white shadow-sm focus:ring-4 focus:ring-blue-100 outline-none" 
        value={value} 
        onChange={e => onChange(parseFloat(e.target.value) || 0)} 
      />
    </div>
  );
}

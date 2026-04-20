import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees, createEmployee, updateEmployee, resetEmployeePassword, deleteEmployee } from "../../services/api";
import type { Employee } from "../../types";
import { Plus, Pencil, X, Key, Trash2, CreditCard, ShieldCheck, Wallet } from "lucide-react";

const emptyForm = {
  employee_code: "", first_name: "", last_name: "", department: "", position: "",
  employment_type: "monthly", base_salary: 15000, daily_rate: "",
  ot_rate_per_hour: 93.75, lunch_allowance_per_day: 50,
  work_start_time: "08:00", work_end_time: "17:00", hire_date: "2025-01-01",
  id_card_number: "", bank_name: "", bank_account_number: "",
  pvd_rate: 0, tax_allowance_personal: 60000
};

export default function AdminEmployees() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | "reset" | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [newPassword, setNewPassword] = useState("");

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => getEmployees().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createEmployee(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); setModal(null); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); setModal(null); },
  });
  const resetMut = useMutation({
    mutationFn: ({ id, pass }: { id: string; pass: string }) => resetEmployeePassword(id, { new_password: pass }),
    onSuccess: () => { alert("รีเซ็ตรหัสผ่านสำเร็จ"); setModal(null); setNewPassword(""); },
    onError: (err: any) => alert(err.response?.data?.detail || "เกิดข้อผิดพลาด"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); },
    onError: (err: any) => alert(err.response?.data?.detail || "เกิดข้อผิดพลาด"),
  });

  const openCreate = () => { setForm(emptyForm); setModal("create"); };
  const openEdit = (emp: Employee) => {
    setSelected(emp);
    setForm({ ...emp, daily_rate: emp.daily_rate ?? "" });
    setModal("edit");
  };
  const openReset = (emp: Employee) => {
    setSelected(emp);
    setNewPassword("");
    setModal("reset");
  };
  const handleDelete = (emp: Employee) => {
    if (confirm(`ยืนยันการลบพนักงาน: ${emp.full_name}?`)) {
      deleteMut.mutate(emp.id);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modal === "reset" && selected) {
      resetMut.mutate({ id: selected.id, pass: newPassword });
      return;
    }
    const payload = { 
      ...form, 
      daily_rate: form.daily_rate || null, 
      base_salary: Number(form.base_salary), 
      ot_rate_per_hour: Number(form.ot_rate_per_hour), 
      lunch_allowance_per_day: Number(form.lunch_allowance_per_day),
      pvd_rate: Number(form.pvd_rate) / 100, // convert % to decimal
      tax_allowance_personal: Number(form.tax_allowance_personal)
    };
    if (modal === "create") createMut.mutate(payload);
    else if (selected) updateMut.mutate({ id: selected.id, data: payload });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการพนักงาน</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <Plus size={16} /> เพิ่มพนักงาน
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["รหัส", "ชื่อ", "แผนก", "ตำแหน่ง", "ประเภท", "เงินเดือน", "OT (ชม.)", "จัดการ"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-bold whitespace-nowrap uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{emp.employee_code}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{emp.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{emp.department || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{emp.position || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${emp.employment_type === "monthly" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {emp.employment_type === "monthly" ? "รายเดือน" : "รายวัน"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">฿{emp.base_salary.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">฿{emp.ot_rate_per_hour}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-nowrap min-w-max">
                      <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" title="แก้ไข">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => openReset(emp)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-all" title="รีเซ็ตรหัสผ่าน">
                        <Key size={15} />
                      </button>
                      <button onClick={() => handleDelete(emp)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="ลบ">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "reset" && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2"><Key size={16} className="text-orange-500" /> รีเซ็ตรหัสผ่าน: {selected.full_name}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 font-medium hover:bg-gray-50">ยกเลิก</button>
                <button type="submit" disabled={resetMut.isPending} className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 shadow-md shadow-orange-100">
                  {resetMut.isPending ? "กำลังบันทึก..." : "ยืนยันการรีเซ็ต"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b bg-gray-50/50">
              <div>
                <h2 className="font-black text-gray-900 text-xl">{modal === "create" ? "เพิ่มพนักงานใหม่" : "แก้ไขข้อมูลพนักงาน"}</h2>
                <p className="text-xs text-gray-500 mt-1">กรุณาระบุข้อมูลให้ครบถ้วนเพื่อความถูกต้องในการคำนวณเงินเดือน</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 bg-white p-2 rounded-full border border-gray-100 shadow-sm transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
              {/* Section 1: Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <ShieldCheck size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider">ข้อมูลพื้นฐานและการจ้างงาน</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="รหัสพนักงาน" key="employee_code" value={form.employee_code} onChange={v => setForm({...form, employee_code: v})} required />
                  <FormField label="วันที่เริ่มงาน" type="date" key="hire_date" value={form.hire_date} onChange={v => setForm({...form, hire_date: v})} required />
                  <FormField label="ชื่อ" key="first_name" value={form.first_name} onChange={v => setForm({...form, first_name: v})} required />
                  <FormField label="นามสกุล" key="last_name" value={form.last_name} onChange={v => setForm({...form, last_name: v})} required />
                  <FormField label="แผนก" key="department" value={form.department} onChange={v => setForm({...form, department: v})} />
                  <FormField label="ตำแหน่ง" key="position" value={form.position} onChange={v => setForm({...form, position: v})} />
                </div>
              </div>

              {/* Section 2: Financial Info */}
              <div>
                <div className="flex items-center gap-2 mb-4 text-green-600">
                  <Wallet size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider">ข้อมูลการเงินและภาษี</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="เงินเดือนพื้นฐาน (บาท)" type="number" value={form.base_salary} onChange={v => setForm({...form, base_salary: v})} required />
                  <FormField label="ประเภทการจ้าง" type="select" value={form.employment_type} onChange={v => setForm({...form, employment_type: v})} options={[{l:"รายเดือน",v:"monthly"},{l:"รายวัน",v:"daily"}]} />
                  <FormField label="ค่าล่วงเวลา (บาท/ชม.)" type="number" value={form.ot_rate_per_hour} onChange={v => setForm({...form, ot_rate_per_hour: v})} />
                  <FormField label="ค่าอาหาร/วัน (บาท)" type="number" value={form.lunch_allowance_per_day} onChange={v => setForm({...form, lunch_allowance_per_day: v})} />
                  <FormField label="สะสม PVD (%)" type="number" value={form.pvd_rate * 100} onChange={v => setForm({...form, pvd_rate: v/100})} />
                  <FormField label="ลดหย่อนภาษีส่วนตัว (บาท)" type="number" value={form.tax_allowance_personal} onChange={v => setForm({...form, tax_allowance_personal: v})} />
                </div>
              </div>

              {/* Section 3: Privacy & Bank (PDPA Compliance) */}
              <div>
                <div className="flex items-center gap-2 mb-4 text-red-600">
                  <CreditCard size={18} />
                  <h3 className="font-bold text-sm uppercase tracking-wider">ข้อมูลส่วนตัวและธนาคาร (PDPA)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="เลขบัตรประชาชน" value={form.id_card_number} onChange={v => setForm({...form, id_card_number: v})} placeholder="1-xxxx-xxxxx-xx-x" />
                  <div className="hidden md:block" />
                  <FormField label="ชื่อธนาคาร" value={form.bank_name} onChange={v => setForm({...form, bank_name: v})} placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" />
                  <FormField label="เลขบัญชีธนาคาร" value={form.bank_account_number} onChange={v => setForm({...form, bank_account_number: v})} placeholder="xxx-x-xxxxx-x" />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t">
                <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">ยกเลิก</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-blue-300">
                  {modal === "create" ? "เพิ่มพนักงาน" : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type="text", required=false, options=[], placeholder="" }: any) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">{label} {required && "*"}</label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      ) : (
        <input
          type={type}
          required={required}
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      )}
    </div>
  );
}

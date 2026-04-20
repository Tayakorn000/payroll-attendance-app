import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees, createEmployee, updateEmployee, resetEmployeePassword, deleteEmployee } from "../../services/api";
import type { Employee } from "../../types";
import { Plus, Pencil, X, Key, Trash2 } from "lucide-react";

const emptyForm = {
  employee_code: "", first_name: "", last_name: "", department: "", position: "",
  employment_type: "monthly", base_salary: 15000, daily_rate: "",
  ot_rate_per_hour: 93.75, lunch_allowance_per_day: 50,
  work_start_time: "08:00", work_end_time: "17:00", hire_date: "2025-01-01",
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
    const payload = { ...form, daily_rate: form.daily_rate || null, base_salary: Number(form.base_salary), ot_rate_per_hour: Number(form.ot_rate_per_hour), lunch_allowance_per_day: Number(form.lunch_allowance_per_day) };
    if (modal === "create") createMut.mutate(payload);
    else if (selected) updateMut.mutate({ id: selected.id, data: payload });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">พนักงาน</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> เพิ่มพนักงาน
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["รหัส", "ชื่อ", "แผนก", "ตำแหน่ง", "ประเภท", "เงินเดือนพื้นฐาน", "ค่าล่วงเวลา (OT)", "จัดการ"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{emp.employee_code}</td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{emp.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{emp.department || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{emp.position || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.employment_type === "monthly" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {emp.employment_type === "monthly" ? "รายเดือน" : "รายวัน"}
                    </span>
                  </td>
                  <td className="px-4 py-3">฿{emp.base_salary.toLocaleString()}</td>
                  <td className="px-4 py-3">฿{emp.ot_rate_per_hour}/ชม.</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-nowrap min-w-max">
                      <button onClick={() => openEdit(emp)} className="text-gray-500 hover:text-blue-600 p-1 hover:bg-gray-100 rounded-md transition-colors" title="แก้ไข">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => openReset(emp)} className="text-gray-500 hover:text-orange-600 p-1 hover:bg-gray-100 rounded-md transition-colors" title="รีเซ็ตรหัสผ่าน">
                        <Key size={15} />
                      </button>
                      <button onClick={() => handleDelete(emp)} className="text-gray-500 hover:text-red-600 p-1 hover:bg-gray-100 rounded-md transition-colors" title="ลบ">
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-800 text-sm">รีเซ็ตรหัสผ่าน: {selected.full_name}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600">ยกเลิก</button>
                <button type="submit" disabled={resetMut.isPending} className="flex-1 bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                  {resetMut.isPending ? "กำลังบันทึก..." : "ยืนยัน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-800">{modal === "create" ? "เพิ่มพนักงาน" : "แก้ไขข้อมูลพนักงาน"}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {[
                { label: "รหัสพนักงาน", key: "employee_code", type: "text", required: true },
                { label: "ชื่อ", key: "first_name", type: "text", required: true },
                { label: "นามสกุล", key: "last_name", type: "text" },
                { label: "แผนก", key: "department", type: "text" },
                { label: "ตำแหน่ง", key: "position", type: "text" },
                { label: "เงินเดือนพื้นฐาน (บาท)", key: "base_salary", type: "number" },
                { label: "ค่าล่วงเวลา (บาท/ชม.)", key: "ot_rate_per_hour", type: "number" },
                { label: "ค่าอาหารกลางวัน/วัน (บาท)", key: "lunch_allowance_per_day", type: "number" },
                { label: "เวลาเริ่มงาน", key: "work_start_time", type: "text" },
                { label: "เวลาเลิกงาน", key: "work_end_time", type: "text" },
                { label: "วันที่จ้างงาน", key: "hire_date", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key] ?? ""}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ประเภทการจ้างงาน</label>
                <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="monthly">รายเดือน</option>
                  <option value="daily">รายวัน</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">
                  {modal === "create" ? "สร้าง" : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
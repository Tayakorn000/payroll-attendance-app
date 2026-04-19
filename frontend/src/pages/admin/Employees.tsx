import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees, createEmployee, updateEmployee } from "../../services/api";
import type { Employee } from "../../types";
import { Plus, Pencil, X } from "lucide-react";

const emptyForm = {
  employee_code: "", first_name: "", last_name: "", department: "", position: "",
  employment_type: "monthly", base_salary: 15000, daily_rate: "",
  ot_rate_per_hour: 93.75, lunch_allowance_per_day: 50,
  work_start_time: "08:00", work_end_time: "17:00", hire_date: "2025-01-01",
};

export default function AdminEmployees() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState<any>(emptyForm);

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

  const openCreate = () => { setForm(emptyForm); setModal("create"); };
  const openEdit = (emp: Employee) => {
    setSelected(emp);
    setForm({ ...emp, daily_rate: emp.daily_rate ?? "" });
    setModal("edit");
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, daily_rate: form.daily_rate || null, base_salary: Number(form.base_salary), ot_rate_per_hour: Number(form.ot_rate_per_hour), lunch_allowance_per_day: Number(form.lunch_allowance_per_day) };
    if (modal === "create") createMut.mutate(payload);
    else if (selected) updateMut.mutate({ id: selected.id, data: payload });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Code", "Name", "Department", "Position", "Type", "Base Salary", "OT Rate", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-medium text-blue-600">{emp.employee_code}</td>
                <td className="px-4 py-3 font-medium">{emp.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{emp.department || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{emp.position || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.employment_type === "monthly" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {emp.employment_type}
                  </span>
                </td>
                <td className="px-4 py-3">฿{emp.base_salary.toLocaleString()}</td>
                <td className="px-4 py-3">฿{emp.ot_rate_per_hour}/hr</td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(emp)} className="text-gray-500 hover:text-blue-600"><Pencil size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-800">{modal === "create" ? "Add Employee" : "Edit Employee"}</h2>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {[
                { label: "Employee Code", key: "employee_code", type: "text", required: true },
                { label: "First Name", key: "first_name", type: "text", required: true },
                { label: "Last Name", key: "last_name", type: "text" },
                { label: "Department", key: "department", type: "text" },
                { label: "Position", key: "position", type: "text" },
                { label: "Base Salary (THB)", key: "base_salary", type: "number" },
                { label: "OT Rate (THB/hr)", key: "ot_rate_per_hour", type: "number" },
                { label: "Lunch Allowance/day (THB)", key: "lunch_allowance_per_day", type: "number" },
                { label: "Work Start", key: "work_start_time", type: "text" },
                { label: "Work End", key: "work_end_time", type: "text" },
                { label: "Hire Date", key: "hire_date", type: "date" },
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
                <select value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700">
                  {modal === "create" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

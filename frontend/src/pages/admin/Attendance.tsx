import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees, getAttendance, updateAttendanceLog } from "../../services/api";
import type { Employee, AttendanceLog } from "../../types";
import { format } from "date-fns";
import { Search, Pencil } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-700",
  half_day: "bg-orange-100 text-orange-700",
  leave: "bg-purple-100 text-purple-700",
};

export default function AdminAttendance() {
  const qc = useQueryClient();
  const [selectedEmp, setSelectedEmp] = useState<string>("");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-31");
  const [editLog, setEditLog] = useState<AttendanceLog | null>(null);
  const [editForm, setEditForm] = useState({ clock_in: "", clock_out: "", notes: "" });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => getEmployees().then(r => r.data),
  });

  const { data: logs = [], refetch } = useQuery<AttendanceLog[]>({
    queryKey: ["attendance", selectedEmp, startDate, endDate],
    queryFn: () => selectedEmp ? getAttendance(selectedEmp, startDate, endDate).then(r => r.data) : Promise.resolve([]),
    enabled: !!selectedEmp,
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateAttendanceLog(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); setEditLog(null); },
  });

  const openEdit = (log: AttendanceLog) => {
    setEditLog(log);
    setEditForm({
      clock_in: log.clock_in ? format(new Date(log.clock_in), "yyyy-MM-dd'T'HH:mm") : "",
      clock_out: log.clock_out ? format(new Date(log.clock_out), "yyyy-MM-dd'T'HH:mm") : "",
      notes: log.notes ?? "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLog) return;
    updateMut.mutate({
      id: editLog.id,
      data: {
        clock_in: editForm.clock_in || null,
        clock_out: editForm.clock_out || null,
        notes: editForm.notes || null,
      },
    });
  };

  const totals = {
    present: logs.filter(l => l.status === "present").length,
    late: logs.filter(l => l.status === "late").length,
    absent: logs.filter(l => l.status === "absent").length,
    lateMin: logs.reduce((s, l) => s + l.late_minutes, 0),
    otMin: logs.reduce((s, l) => s + l.ot_minutes, 0),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Attendance</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Employee</label>
          <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="">Select employee…</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.employee_code} — {emp.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Search size={14} /> Search
        </button>
      </div>

      {/* Summary */}
      {logs.length > 0 && (
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: "Present", value: totals.present, color: "text-green-600" },
            { label: "Late", value: totals.late, color: "text-yellow-600" },
            { label: "Absent", value: totals.absent, color: "text-red-600" },
            { label: "Late (min)", value: totals.lateMin, color: "text-orange-600" },
            { label: "OT (min)", value: totals.otMin, color: "text-blue-600" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 shadow-sm text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Date", "Clock In", "Clock Out", "Status", "Late (min)", "OT (min)", "Work (min)", "Notes", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Select an employee to view attendance</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{log.log_date}</td>
                <td className="px-4 py-2">{log.clock_in ? format(new Date(log.clock_in), "HH:mm") : "—"}</td>
                <td className="px-4 py-2">{log.clock_out ? format(new Date(log.clock_out), "HH:mm") : "—"}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status] || "bg-gray-100 text-gray-600"}`}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">{log.late_minutes || "—"}</td>
                <td className="px-4 py-2 text-center">{log.ot_minutes || "—"}</td>
                <td className="px-4 py-2 text-center">{log.work_minutes || "—"}</td>
                <td className="px-4 py-2 text-gray-400 text-xs">{log.notes || "—"}</td>
                <td className="px-4 py-2">
                  <button onClick={() => openEdit(log)} className="text-gray-400 hover:text-blue-600"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h2 className="font-semibold mb-4">Edit Log — {editLog.log_date}</h2>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clock In</label>
                <input type="datetime-local" value={editForm.clock_in}
                  onChange={e => setEditForm({ ...editForm, clock_in: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Clock Out</label>
                <input type="datetime-local" value={editForm.clock_out}
                  onChange={e => setEditForm({ ...editForm, clock_out: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input type="text" value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditLog(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

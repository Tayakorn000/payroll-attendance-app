import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listLeaves, updateLeaveStatus } from "../../services/api";
import { Check, X } from "lucide-react";

const TYPE_THAI: Record<string, string> = {
  sick: "ลาป่วย",
  annual: "ลาพักร้อน",
  personal: "ลากิจ",
  unpaid: "ลาไม่รับค่าจ้าง",
};

export default function AdminLeaves() {
  const qc = useQueryClient();
  const { data: leaves = [] } = useQuery<any[]>({
    queryKey: ["leaves"],
    queryFn: () => listLeaves().then(r => r.data),
  });

  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLeaveStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">คำขออนุมัติลา</h1>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["พนักงาน", "ประเภท", "วันที่", "จำนวนวัน", "เหตุผล", "สถานะ", "จัดการ"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{l.employee_id}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs whitespace-nowrap">{TYPE_THAI[l.leave_type] || l.leave_type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{l.start_date} — {l.end_date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{l.days_count} วัน</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      l.status === "approved" ? "bg-green-100 text-green-700" :
                      l.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {l.status === "approved" ? "อนุมัติแล้ว" : l.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-nowrap min-w-max">
                      {l.status === "pending" && (
                        <>
                          <button onClick={() => mut.mutate({ id: l.id, status: "approved" })} className="p-1 text-green-600 hover:bg-green-50 rounded border border-green-200">
                            <Check size={14} />
                          </button>
                          <button onClick={() => mut.mutate({ id: l.id, status: "rejected" })} className="p-1 text-red-600 hover:bg-red-50 rounded border border-red-200">
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">ไม่พบข้อมูลคำขอลา</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

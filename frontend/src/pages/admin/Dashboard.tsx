import { useQuery } from "@tanstack/react-query";
import { getEmployees, getPeriods, getAnnouncements } from "../../services/api";
import { Users, Calendar, DollarSign, Clock, Megaphone } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: employees } = useQuery({ queryKey: ["employees"], queryFn: () => getEmployees().then(r => r.data) });
  const { data: periods } = useQuery({ queryKey: ["periods"], queryFn: () => getPeriods().then(r => r.data) });
  const { data: announcements = [] } = useQuery({ queryKey: ["announcements"], queryFn: () => getAnnouncements().then(r => r.data) });

  const stats = [
    { label: "พนักงานที่ทำงานอยู่", value: employees?.length ?? "—", icon: Users, color: "bg-blue-500" },
    { label: "รอบการจ่ายเงินเดือน", value: periods?.length ?? "—", icon: Calendar, color: "bg-purple-500" },
    { label: "สลิปที่อนุมัติแล้ว", value: periods?.filter((p: any) => p.status === "approved").length ?? "—", icon: DollarSign, color: "bg-green-500" },
    { label: "รอบที่รอดำเนินการ", value: periods?.filter((p: any) => p.status === "draft").length ?? "—", icon: Clock, color: "bg-orange-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">แผงควบคุม</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className={`${s.color} p-3 rounded-lg`}>
              <s.icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">รอบการจ่ายเงินเดือนล่าสุด</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">รอบการจ่าย</th>
                <th className="pb-2">เริ่มต้น</th>
                <th className="pb-2">สิ้นสุด</th>
                <th className="pb-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {periods?.slice(0, 5).map((p: any) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.period_name}</td>
                  <td className="py-2 text-gray-500">{p.start_date}</td>
                  <td className="py-2 text-gray-500">{p.end_date}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "approved" ? "bg-green-100 text-green-700" :
                      p.status === "processing" ? "bg-blue-100 text-blue-700" :
                      p.status === "paid" ? "bg-purple-100 text-purple-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {p.status === "approved" ? "อนุมัติแล้ว" :
                       p.status === "processing" ? "กำลังดำเนินการ" :
                       p.status === "paid" ? "จ่ายแล้ว" :
                       p.status === "draft" ? "ฉบับร่าง" : p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-700">ประกาศล่าสุด</h2>
          </div>
          <div className="space-y-4">
            {announcements.slice(0, 3).map((ann: any) => (
              <div key={ann.id} className="border-l-4 border-blue-500 bg-blue-50/50 p-3 rounded-r-lg">
                <p className="font-bold text-gray-800 text-sm">{ann.title}</p>
                <p className="text-gray-600 text-xs mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-gray-400 text-[10px] mt-2">{format(new Date(ann.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">ไม่มีประกาศ</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

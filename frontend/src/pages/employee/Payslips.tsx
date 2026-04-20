import { useQuery } from "@tanstack/react-query";
import { getMySlips } from "../../services/api";
import type { PayrollSlip } from "../../types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  approved: "bg-green-100 text-green-700",
  paid: "bg-purple-100 text-purple-700",
};

const STATUS_THAI: Record<string, string> = {
  draft: "ฉบับร่าง",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายแล้ว",
};

export default function EmployeePayslips() {
  const { data: slips = [] } = useQuery<PayrollSlip[]>({
    queryKey: ["mySlips"],
    queryFn: () => getMySlips().then(r => r.data),
  });

  if (slips.length === 0) return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">สลิปเงินเดือนของฉัน</h1>
      <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">ยังไม่มีสลิปเงินเดือน</div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">สลิปเงินเดือนของฉัน</h1>
      <div className="space-y-4">
        {slips.map(slip => (
          <div key={slip.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-sm text-gray-500 mb-1">เงินรับสุทธิ</p>
                <p className="text-3xl font-bold text-gray-800">
                  ฿{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[slip.status]}`}>
                {STATUS_THAI[slip.status] || slip.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-6 text-sm">
              {/* Attendance */}
              <div>
                <p className="font-semibold text-gray-700 mb-3 pb-1 border-b">การเข้างาน</p>
                <div className="space-y-2 text-gray-600">
                  <Row label="วันทำงาน" value={slip.working_days_in_period} />
                  <Row label="วันที่มาทำงาน" value={slip.days_worked} />
                  <Row label="ขาดงาน (วัน)" value={slip.days_absent} highlight={slip.days_absent > 0 ? "text-red-500" : ""} />
                  <Row label="ลางาน (วัน)" value={slip.days_leave} />
                  <Row label="มาสาย (นาที)" value={slip.late_minutes_total} highlight={slip.late_minutes_total > 0 ? "text-yellow-600" : ""} />
                  <Row label="OT (นาที)" value={slip.ot_minutes_total} highlight="text-blue-600" />
                </div>
              </div>

              {/* Earnings */}
              <div>
                <p className="font-semibold text-gray-700 mb-3 pb-1 border-b">รายได้</p>
                <div className="space-y-2 text-gray-600">
                  <Row label="เงินเดือนพื้นฐาน" value={`฿${slip.base_salary_earned.toLocaleString()}`} />
                  <Row label="ค่าอาหารกลางวัน" value={`฿${slip.lunch_allowance_earned.toLocaleString()}`} />
                  <Row label="ค่าล่วงเวลา (OT)" value={`฿${slip.ot_pay.toLocaleString()}`} highlight="text-blue-600" />
                  <div className="border-t pt-2 flex justify-between font-semibold text-gray-700">
                    <span>รวม</span><span>฿{slip.total_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <p className="font-semibold text-gray-700 mb-3 pb-1 border-b">รายการหัก</p>
                <div className="space-y-2 text-gray-600">
                  <Row label="ประกันสังคม" value={`฿${slip.social_security_deduction.toLocaleString()}`} />
                  <Row label="เบิกเงินล่วงหน้า" value={`฿${slip.advance_deduction.toLocaleString()}`} />
                  <Row label="หักมาสาย" value={`฿${slip.late_penalty.toLocaleString()}`} />
                  <div className="border-t pt-2 flex justify-between font-semibold text-red-600">
                    <span>รวม</span><span>฿{slip.total_deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, highlight = "" }: { label: string; value: string | number; highlight?: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={highlight}>{value}</span>
    </div>
  );
}
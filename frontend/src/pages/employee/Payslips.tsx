import { useQuery } from "@tanstack/react-query";
import { getMySlips } from "../../services/api";
import type { PayrollSlip } from "../../types";
import { Printer } from "lucide-react";

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

  const handlePrint = () => {
    window.print();
  };

  if (slips.length === 0) return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">สลิปเงินเดือนของฉัน</h1>
      <div className="bg-white rounded-xl p-12 shadow-sm text-center text-gray-400">ยังไม่มีสลิปเงินเดือน</div>
    </div>
  );

  return (
    <div className="print:p-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">สลิปเงินเดือนของฉัน</h1>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900 transition-colors">
          <Printer size={16} /> พิมพ์สลิป
        </button>
      </div>

      <div className="space-y-8">
        {slips.map(slip => (
          <div key={slip.id} className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 print:shadow-none print:border-gray-300 print:rounded-none">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">สลิปเงินเดือน (Payslip)</h2>
                <p className="text-gray-500 text-sm mt-1">งวดการจ่าย: {slip.period_id}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase print:hidden ${STATUS_COLORS[slip.status]}`}>
                  {STATUS_THAI[slip.status] || slip.status}
                </span>
                <p className="text-sm text-gray-400 mt-2">ยอดรับสุทธิ</p>
                <p className="text-3xl font-black text-blue-600">
                  ฿{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-sm">
              {/* Attendance */}
              <div className="bg-gray-50/50 p-4 rounded-lg print:bg-white print:p-0">
                <p className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">สถิติการเข้างาน</p>
                <div className="space-y-2.5 text-gray-600">
                  <Row label="วันทำงานทั้งหมด" value={slip.working_days_in_period} />
                  <Row label="วันที่มาทำงาน" value={slip.days_worked} />
                  <Row label="วันลา" value={slip.days_leave} />
                  <Row label="วันขาดงาน" value={slip.days_absent} highlight={slip.days_absent > 0 ? "text-red-500 font-bold" : ""} />
                  <Row label="มาสายรวม (นาที)" value={slip.late_minutes_total} highlight={slip.late_minutes_total > 0 ? "text-orange-600" : ""} />
                  <Row label="OT รวม (นาที)" value={slip.ot_minutes_total} highlight="text-blue-600 font-bold" />
                </div>
              </div>

              {/* Earnings */}
              <div className="md:col-span-1">
                <p className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">รายได้ (Earnings)</p>
                <div className="space-y-2.5 text-gray-600">
                  <Row label="เงินเดือนพื้นฐาน" value={`฿${slip.base_salary_earned.toLocaleString()}`} />
                  <Row label="ค่าอาหารกลางวัน" value={`฿${slip.lunch_allowance_earned.toLocaleString()}`} />
                  <Row label="ค่าล่วงเวลา (OT)" value={`฿${slip.ot_pay.toLocaleString()}`} />
                  {slip.bonus > 0 && <Row label="โบนัส" value={`฿${slip.bonus.toLocaleString()}`} highlight="text-green-600" />}
                  {slip.commission > 0 && <Row label="คอมมิชชั่น" value={`฿${slip.commission.toLocaleString()}`} highlight="text-green-600" />}
                  {slip.other_earnings > 0 && <Row label="รายได้อื่นๆ" value={`฿${slip.other_earnings.toLocaleString()}`} />}
                  <div className="border-t border-dashed pt-3 flex justify-between font-bold text-gray-900 text-base mt-2">
                    <span>รวมรายได้</span><span>฿{slip.total_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="md:col-span-1">
                <p className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">รายการหัก (Deductions)</p>
                <div className="space-y-2.5 text-gray-600">
                  <Row label="ประกันสังคม" value={`฿${slip.social_security_deduction.toLocaleString()}`} />
                  <Row label="เงินเบิกล่วงหน้า" value={`฿${slip.advance_deduction.toLocaleString()}`} />
                  <Row label="หักมาสาย" value={`฿${slip.late_penalty.toLocaleString()}`} />
                  {slip.other_deductions > 0 && <Row label="รายการหักอื่นๆ" value={`฿${slip.other_deductions.toLocaleString()}`} />}
                  <div className="border-t border-dashed pt-3 flex justify-between font-bold text-red-600 text-base mt-2">
                    <span>รวมรายการหัก</span><span>฿{slip.total_deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {slip.notes && (
              <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-100 print:bg-white print:border-gray-200">
                <p className="text-xs font-bold text-yellow-700 uppercase mb-1">หมายเหตุ:</p>
                <p className="text-gray-700 text-sm italic">{slip.notes}</p>
              </div>
            )}
            
            <div className="hidden print:block mt-12 pt-8 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-20 text-center text-xs">
                <div>
                  <div className="border-b border-gray-300 h-8 mb-2"></div>
                  <p>ลงชื่อพนักงาน</p>
                </div>
                <div>
                  <div className="border-b border-gray-300 h-8 mb-2"></div>
                  <p>ผู้อนุมัติ / ฝ่ายบุคคล</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          aside, nav, button { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .print\\:hidden { display: none !important; }
        }
      `}} />
    </div>
  );
}

function Row({ label, value, highlight = "" }: { label: string; value: string | number; highlight?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight}`}>{value}</span>
    </div>
  );
}

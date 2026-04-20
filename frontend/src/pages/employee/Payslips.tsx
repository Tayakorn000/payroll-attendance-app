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
      <h1 className="text-2xl font-bold text-gray-800 mb-6 font-black">สลิปเงินเดือนของฉัน</h1>
      <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-gray-400 border border-dashed border-gray-200">ยังไม่มีสลิปเงินเดือนในระบบ</div>
    </div>
  );

  return (
    <div className="print:p-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800 font-black tracking-tight">สลิปเงินเดือนของฉัน</h1>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-gray-200">
          <Printer size={16} /> พิมพ์สลิป / บันทึก PDF
        </button>
      </div>

      <div className="space-y-12">
        {slips.map(slip => (
          <div key={slip.id} className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 p-8 md:p-12 border border-gray-100 print:shadow-none print:border-gray-300 print:rounded-none relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600 print:hidden" />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">ใบแจ้งยอดเงินเดือน</h2>
                <p className="text-blue-600 font-bold text-sm mt-1">งวดการจ่าย: {slip.period_id}</p>
              </div>
              <div className="text-left md:text-right w-full md:w-auto">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest print:hidden ${STATUS_COLORS[slip.status]}`}>
                  {STATUS_THAI[slip.status] || slip.status}
                </span>
                <p className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest">ยอดรับสุทธิ (Net Pay)</p>
                <p className="text-5xl font-black text-gray-900 tracking-tighter mt-1">
                  <span className="text-2xl mr-1">฿</span>{slip.net_pay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-sm">
              {/* Attendance Section */}
              <div className="bg-gray-50/50 p-6 rounded-2xl print:bg-white print:p-0">
                <p className="font-black text-gray-900 mb-6 pb-2 border-b-2 border-gray-200 flex justify-between items-center uppercase tracking-wider text-xs">
                  <span>ข้อมูลการเข้างาน</span>
                  <span className="text-gray-400 font-medium">Attendance</span>
                </p>
                <div className="space-y-4 text-gray-600">
                  <Row label="วันทำงานทั้งหมด" value={slip.working_days_in_period} unit="วัน" />
                  <Row label="วันที่มาทำงานจริง" value={slip.days_worked} unit="วัน" />
                  <Row label="วันลาที่อนุมัติ" value={slip.days_leave} unit="วัน" />
                  <Row label="วันขาดงาน" value={slip.days_absent} unit="วัน" highlight={slip.days_absent > 0 ? "text-red-500 font-bold" : ""} />
                  <Row label="มาสายรวม" value={slip.late_minutes_total} unit="นาที" highlight={slip.late_minutes_total > 0 ? "text-orange-600" : ""} />
                  <Row label="OT รวม" value={slip.ot_minutes_total} unit="นาที" highlight="text-blue-600 font-bold" />
                </div>
              </div>

              {/* Earnings Section */}
              <div className="md:col-span-1">
                <p className="font-black text-gray-900 mb-6 pb-2 border-b-2 border-blue-600 flex justify-between items-center uppercase tracking-wider text-xs">
                  <span>รายการรายได้</span>
                  <span className="text-blue-400 font-medium">Earnings</span>
                </p>
                <div className="space-y-4 text-gray-600">
                  <Row label="เงินเดือนพื้นฐาน" value={slip.base_salary_earned.toLocaleString()} prefix="฿" />
                  <Row label="ค่าอาหารกลางวัน" value={slip.lunch_allowance_earned.toLocaleString()} prefix="฿" />
                  <Row label="ค่าล่วงเวลา (OT)" value={slip.ot_pay.toLocaleString()} prefix="฿" />
                  {slip.bonus > 0 && <Row label="โบนัส" value={slip.bonus.toLocaleString()} prefix="฿" highlight="text-green-600 font-bold" />}
                  {slip.commission > 0 && <Row label="คอมมิชชั่น" value={slip.commission.toLocaleString()} prefix="฿" highlight="text-green-600 font-bold" />}
                  {slip.other_earnings > 0 && <Row label="รายได้อื่นๆ" value={slip.other_earnings.toLocaleString()} prefix="฿" />}
                  <div className="border-t-2 border-dashed pt-4 flex justify-between font-black text-gray-900 text-lg mt-6">
                    <span>รวมรายได้</span><span>฿{slip.total_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="md:col-span-1">
                <p className="font-black text-gray-900 mb-6 pb-2 border-b-2 border-red-500 flex justify-between items-center uppercase tracking-wider text-xs">
                  <span>รายการหัก</span>
                  <span className="text-red-400 font-medium">Deductions</span>
                </p>
                <div className="space-y-4 text-gray-600">
                  <Row label="ประกันสังคม" value={slip.social_security_deduction.toLocaleString()} prefix="฿" highlight="text-red-500" />
                  <Row label="กองทุนสำรองฯ (PVD)" value={slip.provident_fund_deduction.toLocaleString()} prefix="฿" highlight="text-red-500" />
                  <Row label="ภาษีหัก ณ ที่จ่าย" value={slip.tax_deduction.toLocaleString()} prefix="฿" highlight="text-red-500" />
                  <Row label="หักเงินเบิกล่วงหน้า" value={slip.advance_deduction.toLocaleString()} prefix="฿" highlight="text-red-500" />
                  <Row label="หักมาสาย/ขาดงาน" value={slip.late_penalty.toLocaleString()} prefix="฿" highlight="text-red-500" />
                  {slip.other_deductions > 0 && <Row label="รายการหักอื่นๆ" value={slip.other_deductions.toLocaleString()} prefix="฿" highlight="text-red-500" />}
                  <div className="border-t-2 border-dashed pt-4 flex justify-between font-black text-red-600 text-lg mt-6">
                    <span>รวมรายการหัก</span><span>฿{slip.total_deductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {slip.notes && (
              <div className="mt-12 p-6 bg-yellow-50/50 rounded-2xl border border-yellow-100 print:bg-white print:border-gray-200">
                <p className="text-[10px] font-black text-yellow-700 uppercase mb-2 tracking-widest">หมายเหตุ (Notes):</p>
                <p className="text-gray-700 text-sm italic leading-relaxed">{slip.notes}</p>
              </div>
            )}
            
            <div className="hidden print:block mt-24 pt-12 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-32 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <div>
                  <div className="border-b border-gray-300 h-12 mb-4"></div>
                  <p>ลงชื่อพนักงาน (Employee Signature)</p>
                  <p className="mt-1 font-medium text-gray-300">วันที่ / Date: ____/____/____</p>
                </div>
                <div>
                  <div className="border-b border-gray-300 h-12 mb-4"></div>
                  <p>ผู้อนุมัติ (Authorized Representative)</p>
                  <p className="mt-1 font-medium text-gray-300">วันที่ / Date: ____/____/____</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; }
          aside, nav, button, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .print\\:hidden { display: none !important; }
          .shadow-xl, .shadow-sm { shadow: none !important; box-shadow: none !important; }
        }
      `}} />
    </div>
  );
}

function Row({ label, value, unit="", prefix="", highlight = "" }: { label: string; value: string | number; unit?: string; prefix?: string; highlight?: string }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className={`font-bold tabular-nums ${highlight}`}>{prefix}{value} <span className="text-[10px] font-medium text-gray-400 ml-0.5">{unit}</span></span>
    </div>
  );
}

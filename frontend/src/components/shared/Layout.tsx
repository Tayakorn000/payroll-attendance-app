import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { LogOut, Users, DollarSign, Clock, Home, CreditCard } from "lucide-react";

const adminNav = [
  { to: "/admin", label: "แผงควบคุม", icon: Home, end: true },
  { to: "/admin/employees", label: "พนักงาน", icon: Users },
  { to: "/admin/attendance", label: "การเข้างาน", icon: Clock },
  { to: "/admin/payroll", label: "เงินเดือน", icon: DollarSign },
  { to: "/admin/advances", label: "เบิกเงินล่วงหน้า", icon: CreditCard },
];

const employeeNav = [
  { to: "/employee", label: "แผงควบคุม", icon: Home, end: true },
  { to: "/employee/payslips", label: "สลิปเงินเดือนของฉัน", icon: DollarSign },
  { to: "/employee/advances", label: "เบิกเงินล่วงหน้าของฉัน", icon: CreditCard },
];

export default function Layout() {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();
  const nav = role === "admin" ? adminNav : employeeNav;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-white shadow-sm flex flex-col">
        <div className="p-5 border-b">
          <p className="font-bold text-gray-800 text-sm">ระบบเงินเดือนพนักงาน</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">{role}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full"
          >
            <LogOut size={16} />
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
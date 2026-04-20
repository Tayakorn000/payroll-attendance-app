import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { LogOut, Users, DollarSign, Clock, Home, CreditCard, Key, Calendar, Megaphone, Menu, X as CloseIcon } from "lucide-react";
import { useState, useEffect } from "react";
import ChangePasswordModal from "./ChangePasswordModal";

const adminNav = [
  { to: "/admin", label: "แผงควบคุม", icon: Home, end: true },
  { to: "/admin/employees", label: "พนักงาน", icon: Users },
  { to: "/admin/attendance", label: "การเข้างาน", icon: Clock },
  { to: "/admin/leaves", label: "การลา", icon: Calendar },
  { to: "/admin/payroll", label: "เงินเดือน", icon: DollarSign },
  { to: "/admin/advances", label: "เบิกเงินล่วงหน้า", icon: CreditCard },
  { to: "/admin/announcements", label: "ประกาศ", icon: Megaphone },
];

const employeeNav = [
  { to: "/employee", label: "แผงควบคุม", icon: Home, end: true },
  { to: "/employee/leaves", label: "แจ้งลา", icon: Calendar },
  { to: "/employee/payslips", label: "สลิปเงินเดือนของฉัน", icon: DollarSign },
  { to: "/employee/advances", label: "เบิกเงินล่วงหน้าของฉัน", icon: CreditCard },
];

export default function Layout() {
  const { role, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const nav = role === "admin" ? adminNav : employeeNav;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [navigate]);

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b flex justify-between items-center bg-white">
        <div>
          <p className="font-bold text-gray-800 text-sm">ระบบเงินเดือนพนักงาน</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">{role}</p>
        </div>
        <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-gray-500">
          <CloseIcon size={20} />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600 hover:bg-gray-100"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t space-y-1 bg-white">
        <button
          onClick={() => { setIsPasswordModalOpen(true); setIsMobileMenuOpen(false); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 w-full transition-colors"
        >
          <Key size={18} />
          เปลี่ยนรหัสผ่าน
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut size={18} />
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white shadow-sm flex-col border-r">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 lg:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header for Mobile */}
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
          <span className="font-bold text-gray-800 text-sm">ระบบเงินเดือน</span>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
}

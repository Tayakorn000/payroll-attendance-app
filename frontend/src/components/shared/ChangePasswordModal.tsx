import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../../services/api";
import { X, Lock } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");

  const mut = useMutation({
    mutationFn: (data: any) => changePassword(data),
    onSuccess: () => {
      alert("เปลี่ยนรหัสผ่านสำเร็จ");
      onClose();
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || "เกิดข้อผิดพลาด");
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.new_password !== form.confirm_password) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    mut.mutate({
      current_password: form.current_password,
      new_password: form.new_password,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 text-gray-800">
            <Lock size={18} className="text-blue-600" />
            <h2 className="font-semibold">เปลี่ยนรหัสผ่าน</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              รหัสผ่านปัจจุบัน
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              รหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              ยืนยันรหัสผ่านใหม่
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-sm"
              value={form.confirm_password}
              onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors text-sm"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={mut.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-sm"
            >
              {mut.isPending ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

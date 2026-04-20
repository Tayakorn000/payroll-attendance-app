import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "../../services/api";
import { Plus, Megaphone, Trash2, X } from "lucide-react";
import { format } from "date-fns";

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["announcements"],
    queryFn: () => getAnnouncements().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createAnnouncement(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); setModal(false); setForm({ title: "", content: "" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">จัดการประกาศ</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          <Plus size={16} /> เพิ่มประกาศ
        </button>
      </div>

      <div className="grid gap-4">
        {announcements.map((ann) => (
          <div key={ann.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
            <div className="flex gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600 h-fit">
                <Megaphone size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{ann.title}</h3>
                <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{ann.content}</p>
                <p className="text-gray-400 text-xs mt-3">{format(new Date(ann.created_at), "dd/MM/yyyy HH:mm")}</p>
              </div>
            </div>
            <button onClick={() => confirm("ลบประกาศนี้?") && deleteMut.mutate(ann.id)} className="text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">ยังไม่มีประกาศ</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-semibold text-gray-800">สร้างประกาศใหม่</h2>
              <button onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">หัวข้อ</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="เช่น แจ้งวันหยุดบริษัท"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เนื้อหา</label>
                <textarea
                  required
                  rows={4}
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="รายละเอียดประกาศ..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600">ยกเลิก</button>
                <button type="submit" disabled={createMut.isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm">ประกาศ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

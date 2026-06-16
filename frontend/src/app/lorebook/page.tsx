"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Database, Search, Tag, X } from "lucide-react";
import { api, Project, LoreEntry } from "@/services/api";

const CATEGORIES = ["Nhân vật", "Địa danh", "Thế lực", "Vật phẩm", "Cảnh giới", "Khác"];
const FILTER_CATEGORIES = ["Tất cả", ...CATEGORIES];

export default function LorebookPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [entries, setEntries] = useState<LoreEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Tất cả");
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LoreEntry | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "Nhân vật", keywords: "", content: "" });

  useEffect(() => {
    api.listProjects().then(data => {
      const validData = data || [];
      setProjects(validData);
      if (validData.length > 0) setSelectedProjectId(validData[0].id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setLoading(true);
      api.getLoreEntries(selectedProjectId)
        .then(data => setEntries(data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setEntries([]);
    }
  }, [selectedProjectId]);

  const filteredEntries = selectedCategory === "Tất cả" 
    ? entries 
    : entries.filter(e => e.category === selectedCategory);

  const handleOpenModal = (entry?: LoreEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({ name: entry.name, category: entry.category, keywords: entry.keywords, content: entry.content });
    } else {
      setEditingEntry(null);
      setFormData({ name: "", category: "Nhân vật", keywords: "", content: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) return;
    try {
      if (editingEntry) {
        const updated = await api.updateLoreEntry(editingEntry.id, formData);
        setEntries(entries.map(e => e.id === updated.id ? updated : e));
      } else {
        const created = await api.createLoreEntry(selectedProjectId, formData);
        setEntries([...entries, created]);
      }
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa thẻ này?")) return;
    try {
      await api.deleteLoreEntry(id);
      setEntries(entries.filter(e => e.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-main relative">
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {selectedProjectId ? (
          <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-text-main whitespace-nowrap">
                  Danh sách thẻ dữ liệu ({entries.length})
                </h2>
                <select 
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="px-4 py-2 bg-bg-input border border-border-soft rounded-lg text-text-main focus:outline-none focus:border-primary min-w-[200px]"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition shadow-lg shadow-primary/20"
              >
                <Plus size={18} />
                Thêm thẻ mới
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20 text-text-muted animate-pulse">Đang tải dữ liệu...</div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-bg-panel rounded-2xl border border-dashed border-border-soft">
                <Database size={48} className="text-text-muted/30 mb-4" />
                <h3 className="text-xl font-medium text-text-muted mb-2">Chưa có dữ liệu nào</h3>
                <p className="text-text-muted text-sm text-center max-w-md">
                  Hãy thêm nhân vật, địa danh, cảnh giới... để AI có thể tham khảo tự động.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-6 pb-2 border-b border-border-soft/50">
                  {FILTER_CATEGORIES.map(cat => {
                    const count = cat === "Tất cả" ? entries.length : entries.filter(e => e.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                          selectedCategory === cat 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-bg-input text-text-muted hover:text-text-main hover:bg-bg-input/80'
                        }`}
                      >
                        {cat}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          selectedCategory === cat 
                            ? 'bg-white/20 text-white' 
                            : 'bg-black/20 text-text-muted'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredEntries.length === 0 ? (
                  <div className="flex justify-center py-10 text-text-muted">Không có thẻ nào trong mục "{selectedCategory}".</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredEntries.map(entry => (
                      <div key={entry.id} className="bg-bg-panel border border-border-soft rounded-xl p-5 hover:border-primary/50 transition-colors group flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-md w-fit mb-2">
                              {entry.category}
                            </span>
                            <h3 className="font-bold text-text-main text-lg line-clamp-1" title={entry.name}>{entry.name}</h3>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenModal(entry)} className="p-1.5 text-text-muted hover:text-primary bg-bg-input rounded-md"><Edit2 size={14} /></button>
                            <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-text-muted hover:text-red-400 bg-bg-input rounded-md"><Trash2 size={14} /></button>
                          </div>
                        </div>
                        
                        {entry.keywords && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-3">
                            <Tag size={12} />
                            <span className="line-clamp-1">{entry.keywords}</span>
                          </div>
                        )}
                        
                        <p className="text-text-muted text-sm line-clamp-4 flex-1 whitespace-pre-wrap mt-auto pt-2 border-t border-border-soft/50">
                          {entry.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex justify-center py-20 text-text-muted">Vui lòng tạo hoặc chọn một dự án trước.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-panel border border-border-soft rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-border-soft shrink-0">
              <h2 className="text-xl font-bold text-text-main">
                {editingEntry ? "Chỉnh sửa Thẻ Lore" : "Tạo Thẻ Lore mới"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-main p-1"><X size={20} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-main">Tên / Tiêu đề <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="VD: Tiêu Viêm"
                    className="w-full px-4 py-2 bg-bg-input border border-border-soft rounded-xl focus:border-primary focus:outline-none text-text-main"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-main">Phân loại</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 bg-bg-input border border-border-soft rounded-xl focus:border-primary focus:outline-none text-text-main"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main flex items-center gap-2">
                  Từ khóa nhận diện (Alias)
                  <span className="text-xs font-normal text-text-muted">Cách nhau bằng dấu phẩy</span>
                </label>
                <input 
                  type="text" 
                  value={formData.keywords} 
                  onChange={e => setFormData({...formData, keywords: e.target.value})}
                  placeholder="VD: Tiểu Viêm tử, Viêm Đế, Viêm ca"
                  className="w-full px-4 py-2 bg-bg-input border border-border-soft rounded-xl focus:border-primary focus:outline-none text-text-main"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">Nội dung thiết lập <span className="text-red-500">*</span></label>
                <textarea 
                  value={formData.content} 
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder="Mô tả chi tiết ngoại hình, tính cách, kỹ năng, quan hệ..."
                  className="w-full px-4 py-3 bg-bg-input border border-border-soft rounded-xl focus:border-primary focus:outline-none text-text-main min-h-[200px] resize-y"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border-soft shrink-0 flex justify-end gap-3 bg-bg-main/50 rounded-b-2xl">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 rounded-xl border border-border-soft text-text-main hover:bg-bg-input transition font-medium"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.content.trim()}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white transition font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                Lưu thẻ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

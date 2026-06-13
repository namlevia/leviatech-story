"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BookOpen, Download, Loader2, FileText, FileDown, BookType, Code, ChevronRight } from "lucide-react";
import { api } from "@/services/api";

export default function ExportPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("epub");

  const { toast } = useToast();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.listProjects();
      const validData = data || [];
      setProjects(validData);
      // Auto-select first project if available and none selected
      if (validData.length > 0 && !selectedProject) {
        setSelectedProject(validData[0]);
      }
    } catch (err) {
      console.error(err);
      toast("Lỗi tải danh sách dự án", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    if (!selectedProject) return;
    setExporting(true);
    try {
      const res = await api.exportProject(selectedProject.id, exportFormat);
      if (res.file_path || res.success) {
        toast("Xuất file thành công: " + (res.file_path || "Đã lưu!"), "success");
      } else {
        toast(res.message || "Xuất file thất bại", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Lỗi xuất dự án", "error");
    } finally {
      setExporting(false);
    }
  };

  const formats = [
    { id: 'epub', label: 'EPUB', icon: BookType, color: 'text-purple-400', desc: 'Định dạng sách điện tử chuẩn, tốt nhất cho máy đọc sách' },
    { id: 'md', label: 'Markdown', icon: FileDown, color: 'text-blue-400', desc: 'Tệp văn bản thuần có đánh dấu, phù hợp cho lập trình viên' },
    { id: 'html', label: 'HTML', icon: Code, color: 'text-orange-400', desc: 'Định dạng web, dễ dàng chia sẻ và xem trên trình duyệt' },
    { id: 'txt', label: 'Text', icon: FileText, color: 'text-text-muted', desc: 'Văn bản thuần túy, tương thích với mọi thiết bị' }
  ];

  return (
    <div className="flex flex-col flex-1 p-4 sm:p-6 lg:p-10 w-full animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex flex-col items-center text-center gap-6 mb-10 mt-4">

        
        {/* Dropdown centered */}
        <div className="flex items-center justify-center gap-3 w-full">
          <select 
            value={selectedProject?.id || ""} 
            onChange={(e) => {
              const proj = projects.find(p => p.id === e.target.value);
              if (proj) setSelectedProject(proj);
            }}
            className="select w-full md:w-[400px] text-center bg-bg-card border-border-soft hover:border-primary/50 focus:border-primary transition-all shadow-sm cursor-pointer"
          >
            <option value="" disabled className="text-center">-- Chọn Dự Án Để Xuất Bản --</option>
            {projects.map(p => <option key={p.id} value={p.id} className="text-center">{p.title}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-primary space-y-4">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm text-text-muted">Đang tải dữ liệu...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card flex-1 flex flex-col items-center justify-center text-text-subtle border-dashed border-border-soft bg-transparent">
          <BookOpen size={48} className="mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-text-main mb-2">Chưa có dự án nào</h2>
          <p className="text-text-muted mb-6 text-center max-w-md">Hãy tạo một dự án mới để bắt đầu xuất bản nhé!</p>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-4xl mx-auto mb-10">
          {selectedProject ? (
            <div className="card w-full flex flex-col p-4 sm:p-6 lg:p-8 border border-border-soft shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-secondary to-brand-primary opacity-50"></div>
              
              <div className="mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border-soft flex flex-col items-center text-center pt-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm justify-center">
                  <span className="px-3 py-1 rounded-full bg-bg-input text-secondary font-medium">
                    {selectedProject.genre || "Chưa phân loại"}
                  </span>
                  <span className="text-text-muted">
                    Đã hoàn thành: <strong className="text-text-main">{selectedProject.completed_chapters || 0}</strong> chương
                  </span>
                </div>
              </div>

              <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-subtle mb-4 text-center">Định dạng xuất file</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {formats.map(fmt => {
                  const Icon = fmt.icon;
                  const isSelected = exportFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id)}
                      className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                          : "bg-bg-input border-border-soft hover:bg-bg-panel hover:border-white/10"
                      }`}
                    >
                      <div className={`p-2 rounded-lg bg-bg-input ${isSelected ? fmt.color : "text-text-muted"}`}>
                        <Icon size={20} className="sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <p className={`font-bold mb-1 text-sm sm:text-base ${isSelected ? "text-text-main" : "text-text-main"}`}>
                          {fmt.label}
                        </p>
                        <p className="text-[10px] sm:text-xs text-text-subtle leading-relaxed">
                          {fmt.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-auto pt-2 sm:pt-4">
                <Button 
                  variant="primary" 
                  className="w-full py-3 sm:py-4 text-base sm:text-lg font-bold shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2 sm:gap-3"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Loader2 size={20} className="animate-spin sm:w-6 sm:h-6" /> Đang xuất {formats.find(f => f.id === exportFormat)?.label}...
                    </>
                  ) : (
                    <>
                      <Download size={20} className="sm:w-6 sm:h-6" /> 
                      Tải Xuống Bản {formats.find(f => f.id === exportFormat)?.label}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 card border-dashed border-2 border-border-soft bg-transparent py-20 text-text-subtle hover:border-primary/30 transition-colors">
              <BookType size={48} className="mb-4 opacity-50" />
              <p className="text-text-muted">Vui lòng chọn một tác phẩm ở menu phía trên để xuất bản.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

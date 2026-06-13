"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BookOpen, Trash2, Play, Loader2, PlusCircle, FileText, BarChart, Server, Settings } from "lucide-react";
import { api } from "@/services/api";
import Link from "next/link";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [backendsCount, setBackendsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  const { toast } = useToast();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [projectsData, backendsData] = await Promise.all([
        api.listProjects().catch(() => []),
        api.getBackends().catch(() => [])
      ]);
      setProjects(projectsData || []);
      setBackendsCount(backendsData?.filter((b: any) => b.enabled)?.length || 0);
    } catch (err) {
      console.error(err);
      toast("Lỗi tải dữ liệu tổng quan", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteClick = (project: any) => {
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await api.deleteProject(projectToDelete.id);
      toast("Đã xoá dự án", "success");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast("Lỗi khi xoá dự án", "error");
    } finally {
      setProjectToDelete(null);
    }
  };

  // Tính toán thống kê
  const totalProjects = projects.length;
  const totalChapters = projects.reduce((sum, p) => sum + (p.completed_chapters || 0), 0);
  const totalWords = totalChapters * 2000; // Giả định trung bình 2000 từ/chương

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 animate-in fade-in duration-500 w-full space-y-8">
      {/* Khu chào mừng */}
      <div className="tinix-card border-l-4 border-l-primary bg-gradient-to-br from-bg-panel to-bg-main relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h1 className="text-xl md:text-3xl font-bold text-text-main mb-2">
            Chào mừng trở lại với LeviaTech Story
          </h1>
          <p className="text-text-muted mb-6 text-sm md:text-lg max-w-2xl">
            Hôm nay anh muốn tạo một thế giới mới, viết tiếp chương cũ hay trau chuốt bản thảo?
          </p>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 sm:gap-3 md:gap-4">
            <Link href="/create" className="flex">
              <button className="button-primary w-full justify-center text-xs sm:text-sm px-2">
                <PlusCircle size={16} className="shrink-0 hidden sm:block" /> <span className="truncate">Tạo truyện mới</span>
              </button>
            </Link>
            {projects.length > 0 && (
              <Link href={`/continue?id=${projects[0].id}`} className="flex">
                <button className="button-secondary w-full justify-center text-xs sm:text-sm px-2">
                  <Play size={16} className="shrink-0 hidden sm:block" /> <span className="truncate">Mở dự án cũ</span>
                </button>
              </Link>
            )}
            <Link href="/projects" className="flex">
              <button className="button-secondary w-full justify-center text-xs sm:text-sm px-2">
                <BookOpen size={16} className="shrink-0 hidden sm:block" /> <span className="truncate">Dự án</span>
              </button>
            </Link>
            <Link href="/settings" className="flex">
              <button className="button-secondary w-full justify-center text-xs sm:text-sm px-2">
                <Settings size={16} className="shrink-0 hidden sm:block" /> <span className="truncate">Cài đặt</span>
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="tinix-card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-text-subtle text-sm font-medium flex items-center gap-2">
            <BookOpen size={16} className="text-primary" /> Tổng dự án
          </p>
          <p className="text-3xl font-bold text-text-main">{loading ? "-" : totalProjects}</p>
        </div>
        <div className="tinix-card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-secondary/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-text-subtle text-sm font-medium flex items-center gap-2">
            <FileText size={16} className="text-secondary" /> Chương đã viết
          </p>
          <p className="text-3xl font-bold text-text-main">{loading ? "-" : totalChapters}</p>
        </div>
        <div className="tinix-card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-success/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-text-subtle text-sm font-medium flex items-center gap-2">
            <BarChart size={16} className="text-success" /> Từ đã tạo
          </p>
          <p className="text-3xl font-bold text-text-main">{loading ? "-" : totalWords.toLocaleString('vi-VN')}</p>
        </div>
        <div className="tinix-card flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-warning/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <p className="text-text-subtle text-sm font-medium flex items-center gap-2">
            <Server size={16} className="text-warning" /> API khả dụng
          </p>
          <p className="text-3xl font-bold text-text-main">{loading ? "-" : backendsCount}</p>
        </div>
      </div>

      {/* Dự án gần đây */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text-main">Dự án gần đây</h2>
          <Link href="/projects" className="text-primary hover:text-primary-hover text-sm font-medium transition-colors">
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center text-primary py-12">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="tinix-card border-dashed bg-transparent flex flex-col items-center justify-center py-16 text-center">
            <BookOpen size={48} className="mb-4 text-text-subtle opacity-50" />
            <h3 className="text-lg font-bold text-text-main mb-2">Chưa có dự án nào</h3>
            <p className="text-text-muted mb-6 max-w-sm">Hãy bắt đầu sáng tác một tác phẩm mới hoặc tải lên file có sẵn để viết tiếp.</p>
            <Link href="/create">
              <button className="button-primary">
                Tạo truyện ngay
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="tinix-card flex flex-col group hover:border-primary/30 transition-colors p-5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-primary/10 rounded-full group-hover:scale-[3] transition-transform duration-500"></div>
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="text-lg font-bold text-text-main truncate" title={project.title}>
                      {project.title || "Dự án không tên"}
                    </h3>
                    <p className="text-primary text-sm font-medium mt-1 truncate">
                      {project.genre || "Chưa phân loại"}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteClick(project)}
                    className="p-1.5 rounded-lg bg-bg-main text-text-subtle hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                    title="Xoá Dự Án"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-sm text-text-muted mb-5">
                  <span>Tiến độ: {project.completed_chapters || 0}/{project.chapter_count || "?"}</span>
                  <span>{project.updated_at ? new Date(project.updated_at).toLocaleDateString("vi-VN") : "Mới đây"}</span>
                </div>

                <div className="mt-auto pt-4 border-t border-border-soft flex gap-2">
                  <Link href={`/continue?id=${project.id}`} className="flex-1">
                    <button className="button-primary w-full text-sm py-2 px-3">
                      Tiếp tục viết
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal xoá */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="tinix-card w-full max-w-md flex flex-col shadow-2xl p-6">
            <h3 className="text-xl font-bold text-text-main mb-2">Xác nhận xoá</h3>
            <p className="text-text-muted mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xoá dự án <strong className="text-text-main">{projectToDelete.title || "không tên"}</strong> không? 
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button onClick={() => setProjectToDelete(null)} className="button-secondary w-full sm:w-auto">Huỷ</button>
              <button 
                onClick={confirmDelete} 
                className="button-danger w-full sm:w-auto"
              >
                Xoá Dự Án
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

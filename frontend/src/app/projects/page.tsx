"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { BookOpen, Trash2, Search, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import Link from "next/link";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<any>(null);

  const { toast } = useToast();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.listProjects();
      setProjects(data || []);
      setFilteredProjects(data || []);
    } catch (err) {
      console.error(err);
      toast("Lỗi tải danh sách dự án", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredProjects(projects);
      return;
    }
    const filtered = projects.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) || 
      (p.genre && p.genre.toLowerCase().includes(q))
    );
    setFilteredProjects(filtered);
  }, [searchQuery, projects]);

  const handleDeleteClick = (project: any) => {
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await api.deleteProject(projectToDelete.id);
      toast("Đã xoá dự án", "success");
      fetchProjects();
    } catch (err) {
      console.error(err);
      toast("Lỗi khi xoá dự án", "error");
    } finally {
      setProjectToDelete(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 md:p-8 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">

        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tên truyện, thể loại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input !pl-10 w-full bg-bg-panel border-border-soft"
            />
          </div>
          <Link href="/create" className="shrink-0">
            <button className="button-primary h-full py-2.5">
              + Tạo mới
            </button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center text-primary py-12">
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="tinix-card border-dashed bg-transparent flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={48} className="mb-4 text-text-subtle opacity-50" />
          <h3 className="text-lg font-bold text-text-main mb-2">Không tìm thấy truyện nào</h3>
          <p className="text-text-muted mb-6 max-w-sm">Chưa có dự án nào hoặc không tìm thấy kết quả phù hợp với từ khoá.</p>
          <Link href="/create">
            <button className="button-primary">
              Tạo truyện ngay
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map((project) => (
            <div key={project.id} className="tinix-card flex flex-col group hover:border-primary/30 transition-colors p-5 relative overflow-hidden shadow-md">
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
                  <button className="button-primary w-full text-sm py-2 px-3 hover:shadow-primary/20">
                    Tiếp tục viết
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

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

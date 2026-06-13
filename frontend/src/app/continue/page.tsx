"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { Loader2, Wand2, FileText, Copy, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { streamCompletion } from "@/lib/api";

export default function ContinuePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const [selectedChapterNum, setSelectedChapterNum] = useState<number | null>(null);
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [streamContent, setStreamContent] = useState<string>("");
  const [editContent, setEditContent] = useState<string>("");
  
  const [memChapters, setMemChapters] = useState<number>(3);
  const [useReflection, setUseReflection] = useState<boolean>(false);
  
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast("Đã copy nội dung!", "success");
  };

  const streamTextRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    api.listProjects().then(data => setProjects(data || [])).catch(console.error);
    
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        handleLoad(id);
      }
    }
  }, []);

  useEffect(() => {
    if (scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [streamContent]);

  const handleLoad = async (id: string) => {
    setSelectedId(id);
    setLoading(true);
    setSelectedChapterNum(null);
    try {
      const data = await api.getProject(id);
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (ch: any) => {
    setGeneratingChapter(ch.num);
    setStreamContent("");
    streamTextRef.current = "";
    
    abortControllerRef.current = new AbortController();

    // Find previous content
    const allPast = project.chapters.filter((c: any) => c.num < ch.num);
    const pastChaptersSubset = allPast.slice(Math.max(allPast.length - memChapters, 0));
    const prevContent = pastChaptersSubset.map((c: any) => c.content || "").join("\n\n");

    try {
      await new Promise<void>((resolve, reject) => {
        streamCompletion(
          `/generator/chapter/stream`,
          {
            project_id: selectedId,
            chapter_num: ch.num,
            chapter_title: ch.title,
            chapter_desc: ch.desc || "",
            novel_title: project.title,
            character_setting: project.character_setting || "",
            world_setting: project.world_setting || "",
            plot_idea: project.plot_idea || "",
            genre: project.genre || "",
            sub_genres: project.sub_genres || [],
            previous_content: prevContent,
            use_reflection: useReflection,
            custom_prompt: ""
          },
          (text) => {
             if (text === "[CLEAR]") {
               streamTextRef.current = "";
               setStreamContent("");
               return;
             }
             streamTextRef.current += text;
             setStreamContent(streamTextRef.current);
          },
          () => resolve(),
          (err) => reject(err),
          abortControllerRef.current?.signal
        );
      });
      
      // Update local state
      const updatedChapters = project.chapters.map((c: any) => 
        c.num === ch.num ? { ...c, content: streamTextRef.current } : c
      );
      setProject({ ...project, chapters: updatedChapters });
      setEditContent(streamTextRef.current);
      
      // Auto-save
      await api.updateProject(selectedId, {
        ...project,
        chapters: updatedChapters
      });
      toast(`Đã sinh xong chương ${ch.num} và tự động lưu.`, "success");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Handled in handleCancel
        return;
      }
      toast(`Lỗi khi sinh chương ${ch.num}`, "error");
    } finally {
      setGeneratingChapter(null);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setGeneratingChapter(null);
    toast("Đã dừng sinh chương. Nội dung sinh dở chưa được lưu.", "info");
  };

  const handleSaveManual = async (chNum: number) => {
    try {
      const updatedChapters = project.chapters.map((c: any) => 
        c.num === chNum ? { ...c, content: editContent } : c
      );
      setProject({ ...project, chapters: updatedChapters });
      await api.updateProject(selectedId, {
        ...project,
        chapters: updatedChapters
      });
      toast(`Đã lưu chương ${chNum}`, "success");
    } catch (err) {
      console.error(err);
      toast(`Lỗi khi lưu chương ${chNum}`, "error");
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col md:flex-row w-full animate-in fade-in duration-500 overflow-hidden bg-bg-main">
      {/* LEFT COLUMN: Chapter List & Project Selector */}
      <div className="w-full md:w-[280px] lg:w-[320px] border-b md:border-b-0 md:border-r border-border-soft bg-bg-panel shrink-0 flex flex-col md:h-full z-10 shadow-md md:shadow-none transition-all">
        <div className="p-4 border-b border-border-soft bg-black/20 sticky top-0 z-10 backdrop-blur-md shrink-0">
          <select 
            value={selectedId} 
            onChange={(e) => handleLoad(e.target.value)}
            className="select w-full bg-bg-card border-border-soft hover:border-primary/50 focus:border-primary transition-all shadow-sm cursor-pointer py-2 text-sm sm:text-base font-bold text-text-main"
          >
            <option value="" disabled>-- Chọn Dự Án --</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {project && (
            <div className="hidden md:flex text-xs text-text-muted mt-3 justify-between">
              <span>{project.chapters?.filter((c: any) => c.content).length || 0} / {project.chapters?.length || 0} chương</span>
              <span>{(project.chapters?.reduce((acc: number, c: any) => acc + (c.content ? c.content.trim().split(/\s+/).length : 0), 0) || 0).toLocaleString()} chữ</span>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center p-10 text-primary animate-pulse flex-1">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : project ? (
          <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-hidden overflow-y-hidden md:overflow-y-auto custom-scrollbar p-2 md:p-0 shrink-0 md:flex-1 items-center md:items-stretch gap-2 md:gap-0">
              {project.chapters?.map((ch: any) => {
                const isSelected = selectedChapterNum === ch.num;
                return (
                  <button 
                    key={ch.num} 
                    id={`chapter-btn-${ch.num}`}
                    onClick={(e) => { 
                      setSelectedChapterNum(ch.num); 
                      setEditContent(ch.content || ""); 
                      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }}
                    className={`shrink-0 flex flex-col justify-center px-3 py-1.5 md:p-4 text-left md:border-b border-border-soft/30 transition-all md:rounded-none rounded-full
                      ${isSelected 
                        ? 'bg-primary text-white md:bg-primary/10 md:border-l-4 md:border-l-primary md:text-primary border md:border-t-0 md:border-r-0 md:border-b-0 border-primary md:border-transparent' 
                        : 'bg-bg-input md:bg-transparent hover:bg-bg-card md:border-l-4 md:border-l-transparent text-text-muted md:text-text-main border md:border-t-0 md:border-r-0 md:border-b-0 border-transparent'}`}
                  >
                    <div className="font-medium whitespace-nowrap md:truncate text-xs md:text-base">C.{ch.num}<span className="hidden md:inline">: {ch.title}</span></div>
                    <div className={`text-[10px] mt-0.5 hidden md:block ${isSelected ? 'text-primary/70' : 'text-text-muted'}`}>{(ch.content ? ch.content.trim().split(/\s+/).length : 0).toLocaleString()} chữ</div>
                  </button>
                )
              })}
            </div>
        ) : null}
      </div>

          {/* RIGHT COLUMN: Editor */}
          <div className="flex-1 flex flex-col overflow-hidden bg-bg-main relative">
            {!project && !loading && (
              <div className="flex flex-col items-center justify-center flex-1 p-10 text-text-muted text-center h-full">
                <FileText size={64} className="mb-4 opacity-20" />
                <p className="text-lg">Vui lòng chọn một dự án ở bên trái để tiếp tục.</p>
              </div>
            )}
            
            {loading && !project && (
              <div className="flex items-center justify-center flex-1 text-primary animate-pulse h-full">
                <Loader2 size={32} className="animate-spin" />
              </div>
            )}

            {project && selectedChapterNum ? (() => {
               const ch = project.chapters.find((c: any) => c.num === selectedChapterNum);
               if (!ch) return null;
               const isGenerating = generatingChapter === ch.num;

               return (
                 <div className="flex flex-col h-full overflow-hidden p-0 sm:p-2 w-full max-w-none">
                   <div className="shrink-0 flex justify-between items-start mb-2">
                     <div className="pr-2">
                       <h2 className="text-lg sm:text-2xl font-bold text-text-main mb-1">C.{ch.num}: {ch.title}</h2>
                       {ch.desc && <p className="text-text-muted text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">{ch.desc}</p>}
                     </div>
                     <button 
                        onClick={() => handleCopy(isGenerating ? streamContent : editContent)}
                        className="group relative p-2 text-text-muted hover:text-primary hover:bg-white/5 rounded-lg transition-colors mt-1"
                     >
                        <Copy size={20} />
                        <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-zinc-800 border border-border-soft text-text-main text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                          Copy tất cả
                        </span>
                     </button>
                   </div>

                   {/* Settings Bar */}
                   <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-4 bg-bg-card border border-border-soft rounded-lg sm:rounded-xl mb-2 sm:mb-6 shadow-sm">
                     <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 sm:gap-2">
                         <label className="text-xs sm:text-sm text-text-muted whitespace-nowrap">Nhớ:</label>
                         <select value={memChapters} onChange={(e) => setMemChapters(Number(e.target.value))} disabled={isGenerating} className="select py-1 px-2 text-xs sm:text-sm bg-bg-input">
                           {[1, 3, 5].map(n => <option key={n} value={n}>{n} chương</option>)}
                         </select>
                       </div>
                       
                       <label className="flex items-center gap-2 cursor-pointer text-text-main text-sm pl-2 border-l border-border-soft">
                          <input 
                            type="checkbox" 
                            checked={useReflection} 
                            onChange={(e) => setUseReflection(e.target.checked)}
                            disabled={isGenerating}
                            className="rounded border-border-soft bg-bg-input text-brand-primary focus:ring-brand-primary"
                          />
                          <div className="flex flex-col leading-tight">
                            <span className="text-xs sm:text-sm">Tự động Tối ưu</span>
                            <span className="text-[10px] text-text-muted">(AI kiểm tra lại)</span>
                          </div>
                       </label>
                     </div>
                     
                     <div className="flex items-center w-full sm:w-auto">
                        {isGenerating ? (
                          <button onClick={handleCancel} className="btn bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 w-full sm:w-auto py-1.5 sm:py-2 text-sm sm:text-base">
                            Dừng Sinh
                          </button>
                        ) : (
                          <button onClick={() => handleGenerate(ch)} className="btn btn-primary flex items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto py-1.5 sm:py-2 text-sm sm:text-base">
                            <Wand2 size={14} className="sm:w-4 sm:h-4" /> {ch.content ? "Sinh Lại" : "Sinh Chương"}
                          </button>
                        )}
                     </div>
                   </div>

                   {/* Editor/Stream Area */}
                   <div className="flex-1 flex flex-col min-h-0 w-full">
                      {isGenerating ? (
                        <div className="h-full w-full p-3 sm:p-5 bg-bg-panel border border-border-soft rounded-xl overflow-y-auto custom-scrollbar whitespace-pre-wrap text-[15px] leading-relaxed text-text-main shadow-inner relative max-w-none">
                          {streamContent || "Đang khởi tạo AI, vui lòng chờ..."}<span className="animate-pulse">|</span>
                          <div ref={scrollEndRef} />
                        </div>
                      ) : (
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="h-full w-full p-3 sm:p-5 bg-bg-input border border-border-soft rounded-xl text-[15px] leading-relaxed text-text-main custom-scrollbar overflow-y-auto focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none shadow-inner max-w-none"
                          placeholder="Chương này chưa có nội dung. Bạn có thể tự gõ vào đây hoặc dùng AI sinh chương..."
                        />
                      )}
                   </div>

                   {/* Footer Save */}
                   <div className="shrink-0 mt-2 sm:mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 bg-bg-panel p-2 sm:p-4 rounded-lg sm:rounded-xl border border-border-soft">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-text-muted hidden sm:flex">
                        {isGenerating ? (
                           <><Loader2 size={16} className="animate-spin text-primary" /> Hệ thống tự động lưu khi sinh xong.</>
                        ) : (
                           editContent === (ch.content || "") ? "Đã lưu." : "Chưa lưu."
                        )}
                      </div>
                      <button 
                        onClick={() => handleSaveManual(ch.num)}
                        disabled={isGenerating || editContent === (ch.content || "")}
                        className="btn btn-secondary py-1.5 px-4 sm:py-2 sm:px-8 w-full sm:w-auto text-sm sm:text-base"
                      >
                        {editContent === (ch.content || "") ? "Đã Lưu" : "Lưu Chỉnh Sửa"}
                      </button>
                   </div>
                 </div>
               );
            })() : null}
            
            {!selectedChapterNum && (
               <div className="flex flex-col items-center justify-center h-full text-text-muted p-10 text-center opacity-50">
                 <FileText size={64} className="mb-4" />
                 <p className="text-lg">Chọn một chương ở cột bên trái để bắt đầu sáng tác.</p>
               </div>
            )}
          </div>
    </div>
  );
}
 

"use client";

import { useState, useEffect, useRef } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Sparkles, Loader2, Play, ChevronDown, ChevronUp, StopCircle, Wand2, Info, Search, X, Users, FileText, PlayCircle, Globe, Lightbulb, FolderOpen, Copy } from "lucide-react";
import { api } from "@/services/api";
import { streamCompletion, parseOutline, getProjects, getProject } from "@/lib/api";

import SelectionModal from "@/components/ui/SelectionModal";

export default function CreatePage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const tabElement = document.getElementById(`tab-${activeStep}`);
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeStep]);

  const { toast } = useToast();

  // Reference Data
  const [genres, setGenres] = useState<any[]>([]);
  const [subGenres, setSubGenres] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [tones, setTones] = useState<any[]>([]);
  const [povs, setPovs] = useState<any[]>([]);
  const [pronounsList, setPronounsList] = useState<any[]>([]);

  // Form State
  const [genre, setGenre] = useState<string>("");
  const [selectedSubGenres, setSelectedSubGenres] = useState<string[]>([]);
  const [style, setStyle] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [pov, setPov] = useState<string>("");
  const [pronouns, setPronouns] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [characterSetting, setCharacterSetting] = useState<string>("");
  const [worldSetting, setWorldSetting] = useState<string>("");
  const [plotIdea, setPlotIdea] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  
  // Suggestion specific prompts
  const [charPrompt, setCharPrompt] = useState<string>("");
  const [worldPrompt, setWorldPrompt] = useState<string>("");
  const [plotPrompt, setPlotPrompt] = useState<string>("");
  const [numMainChars, setNumMainChars] = useState<number>(2);
  const [numSubChars, setNumSubChars] = useState<number>(3);
  
  // Modal State
  const [modalType, setModalType] = useState<"genre" | "sub_genre" | "style" | "tone" | "pov" | "pronouns" | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProjects, setImportProjects] = useState<any[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);

  // Title Suggestions
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [suggestingTitle, setSuggestingTitle] = useState(false);

  // Content Suggestions
  const [suggestingChar, setSuggestingChar] = useState(false);
  const [suggestingWorld, setSuggestingWorld] = useState(false);
  const [suggestingPlot, setSuggestingPlot] = useState(false);
  const [isSuggestingStyleTone, setIsSuggestingStyleTone] = useState(false);
  const [isStyleSuggested, setIsStyleSuggested] = useState(false);

  const createTabs = [
    { id: 1, label: "Thông Tin Cơ Bản", icon: Info },
    { id: 2, label: "Hệ Thống Nhân Vật", icon: Users },
    { id: 3, label: "Bối Cảnh Thế Giới", icon: Globe },
    { id: 4, label: "Ý Tưởng Cốt Truyện", icon: Lightbulb },
    { id: 5, label: "Dàn Ý Truyện", icon: FileText },
    { id: 6, label: "Sinh Chương Tự Động", icon: PlayCircle },
  ];

  // Outline
  const [outline, setOutline] = useState<string>("");
  const [totalChapters, setTotalChapters] = useState<number>(20);
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);

  // Generation State
  const [projectId, setProjectId] = useState<string | null>(null);
  const [memChapters, setMemChapters] = useState<number>(3);
  const [useReflection, setUseReflection] = useState<boolean>(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number | null>(null);
  const [streamContent, setStreamContent] = useState<string>("");
  const [viewingChapter, setViewingChapter] = useState<any>(null);
  
  const stopRequested = useRef(false);
  const streamTextRef = useRef("");
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeStep === 6 && scrollEndRef.current) {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [streamContent, activeStep]);

  useEffect(() => {
    if (activeStep === 6 && currentChapterIdx !== null) {
      const el = document.getElementById(`chapter-item-${currentChapterIdx}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentChapterIdx, activeStep]);

  useEffect(() => {
    // Load metadata
    Promise.all([
      api.getDataItems('genres').catch(() => []),
      api.getDataItems('sub_genres').catch(() => []),
      api.getDataItems('styles').catch(() => []),
      api.getDataItems('tones').catch(() => []),
      api.getDataItems('pov').catch(() => []),
      api.getDataItems('pronouns').catch(() => []),
      api.getGenerationConfig().catch(() => null)
    ]).then(([g, sg, st, tn, povData, proData, genCfg]) => {
      setGenres(g);
      if (g.length > 0) setGenre(g[0].name);
      setSubGenres(sg);
      
      setStyles(st);
      if (genCfg && genCfg.writing_style) {
        setStyle(genCfg.writing_style);
      } else if (st.length > 0) {
        setStyle(st[0].name);
      }

      setTones(tn);
      if (genCfg && genCfg.writing_tone) {
        setTone(genCfg.writing_tone);
      } else if (tn.length > 0) {
        setTone(tn[0].name);
      }

      setPovs(povData);
      if (povData.length > 0) setPov(povData[0].name);
      
      setPronounsList(proData);
      if (proData.length > 0) setPronouns(proData[0].name);
    });
  }, []);

  // Keyboard navigation for steps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        isImportModalOpen ||
        modalType
      ) {
        return;
      }
      
      if (e.key === "ArrowLeft") {
        setActiveStep(prev => Math.max(1, prev - 1));
      } else if (e.key === "ArrowRight") {
        setActiveStep(prev => Math.min(6, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImportModalOpen, modalType]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast("Đã copy nội dung!", "success");
  };

  // --- Helpers ---
  const handleOpenImportModal = async () => {
    setIsImportModalOpen(true);
    setLoadingImport(true);
    try {
      const pList = await getProjects();
      setImportProjects(pList || []);
    } catch(err) {
      toast("Lỗi tải danh sách dự án", "error");
    } finally {
      setLoadingImport(false);
    }
  };

  const handleImportProject = async (id: string) => {
    try {
      const p = await getProject(id);
      setTitle(p.title || "");
      if (p.genre) setGenre(p.genre);
      if (p.sub_genres && p.sub_genres.length > 0) setSelectedSubGenres(p.sub_genres);
      if (p.pov) setPov(p.pov);
      if (p.pronouns) setPronouns(p.pronouns);
      if (p.character_setting) setCharacterSetting(p.character_setting);
      if (p.world_setting) setWorldSetting(p.world_setting);
      if (p.plot_idea) setPlotIdea(p.plot_idea);
      if (p.chapters && p.chapters.length > 0) {
        const clearedChapters = p.chapters.map((c: any) => ({ ...c, content: "" }));
        setChapters(clearedChapters);
        setTotalChapters(clearedChapters.length);
        const outlineText = clearedChapters.map((c: any) => `Chương ${c.num}: ${c.title}\n${c.desc}`).join("\n\n");
        setOutline(outlineText);
      }
      setIsImportModalOpen(false);
      toast("Đã nhập thiết lập thành công", "success");
    } catch(err) {
      toast("Lỗi khi tải chi tiết dự án", "error");
    }
  };

  const handleSelectModalItem = (name: string) => {
    if (modalType === "genre") {
      setGenre(name);
      setModalType(null); // auto close on single select
    } else if (modalType === "style") {
      setStyle(name);
      setIsStyleSuggested(false);
      setModalType(null);
    } else if (modalType === "tone") {
      setTone(name);
      setIsStyleSuggested(false);
      setModalType(null);
    } else if (modalType === "sub_genre") {
      setSelectedSubGenres(prev => 
        prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
      );
    } else if (modalType === "pov") {
      setPov(name);
      setModalType(null);
    } else if (modalType === "pronouns") {
      setPronouns(name);
      setModalType(null);
    }
  };

  const handleSuggestStyleTone = async () => {
    setIsSuggestingStyleTone(true);
    try {
      const res = await api.suggestStyleTone({ genre, sub_genres: selectedSubGenres });
      if (res.style) setStyle(res.style);
      if (res.tone) setTone(res.tone);
      setIsStyleSuggested(true);
      toast("Văn phong và Giọng điệu đã được tự động chọn theo thể loại.", "success");
    } catch (e: any) {
      toast("Không thể gợi ý: " + e.message, "error");
    } finally {
      setIsSuggestingStyleTone(false);
    }
  };

  const handleSuggestTitle = async () => {
    setSuggestingTitle(true);
    setSuggestedTitles([]);
    try {
      const res = await api.suggestTitle({ genre, sub_genres: selectedSubGenres, custom_prompt: customPrompt });
      try {
        const parsed = JSON.parse(res.titles.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, ''));
        const list = parsed.suggestions?.map((item: any) => `${item.title} - ${item.description}`) || [];
        setSuggestedTitles(list);
      } catch (e) {
        const text = res.titles || "";
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0 && !l.startsWith('```') && !l.startsWith('{') && !l.startsWith('}') && !l.startsWith('[') && !l.startsWith(']'));
        
        const list = lines.map((line: string) => {
          let cleanLine = line.replace(/^[\d\.\-\*\s]+/, '');
          let parts = cleanLine.split(/[:\-]/);
          if (parts.length > 1) {
             const t = parts[0].trim();
             const d = parts.slice(1).join("-").trim();
             return `${t} - ${d}`;
          }
          return `${cleanLine} - Không có mô tả`;
        });
        
        if (list.length > 0) {
          setSuggestedTitles(list);
        } else {
          setSuggestedTitles([text]);
        }
      }
    } catch (err) {
      toast("Lỗi gợi ý tên truyện", "error");
    } finally {
      setSuggestingTitle(false);
    }
  };

  const handleSuggestContent = async (type: 'char' | 'world' | 'plot') => {
    const setters = {
      'char': { setLoad: setSuggestingChar, setVal: setCharacterSetting },
      'world': { setLoad: setSuggestingWorld, setVal: setWorldSetting },
      'plot': { setLoad: setSuggestingPlot, setVal: setPlotIdea }
    };
    
    setters[type].setLoad(true);
    try {
      const res = await api.suggestContent({
        content_type: type,
        title, genre, sub_genres: selectedSubGenres,
        character_setting: characterSetting,
        world_setting: worldSetting,
        custom_prompt: type === 'char' ? charPrompt : type === 'world' ? worldPrompt : plotPrompt,
        num_main_chars: numMainChars,
        num_sub_chars: numSubChars
      });
      setters[type].setVal(res.content);
    } catch (err: any) {
      toast(`Lỗi gợi ý ${type}: ${err.message}`, "error");
    } finally {
      setters[type].setLoad(false);
    }
  };

  const handleGenerateOutline = async () => {
    setGeneratingOutline(true);
    try {
      const res = await api.generateOutline({
        title, genre, sub_genres: selectedSubGenres, pov, pronouns,
        total_chapters: totalChapters,
        character_setting: characterSetting,
        world_setting: worldSetting,
        plot_idea: plotIdea,
        custom_outline_prompt: customPrompt
      });
      setOutline(res.outline);
      toast("Đã tạo dàn ý thô. Hãy chỉnh sửa nếu cần rồi ấn 'Phân Tích Dàn Ý'!", "success");
    } catch (err) {
      toast("Lỗi tạo dàn ý", "error");
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleManualParseOutline = async () => {
    try {
      const parseRes = await parseOutline(outline);
      if (parseRes.chapters) {
        setChapters(parseRes.chapters);
        toast("Đã cập nhật dàn ý", "success");
        setActiveStep(6);
      }
    } catch (err) {
      toast("Lỗi phân tích dàn ý", "error");
    }
  };



  const startGenerationLoop = async () => {
    if (!title || chapters.length === 0) return toast("Thiếu tên truyện hoặc dàn ý", "error");
    
    let pid = projectId;
    if (!pid) {
      try {
        const pRes = await api.createProject({
          title, genre, sub_genres: selectedSubGenres, pov, pronouns,
          character_setting: characterSetting,
          world_setting: worldSetting, plot_idea: plotIdea
        });
        pid = pRes.id;
        setProjectId(pid);
      } catch (err) {
        return toast("Lỗi tạo Project", "error");
      }
    }

    setIsGenerating(true);
    stopRequested.current = false;
    let localChapters = [...chapters];
    
    for (let i = 0; i < localChapters.length; i++) {
      if (stopRequested.current) break;
      if (localChapters[i].content && localChapters[i].content.length > 50) continue; 
      
      setCurrentChapterIdx(i);
      setStreamContent("");
      streamTextRef.current = "";
      
      const startIdx = Math.max(0, i - memChapters);
      const pastChapters = localChapters.slice(startIdx, i);
      const prevContent = pastChapters.map(c => c.content || "").join("\n\n");

      try {
        await new Promise<void>((resolve, reject) => {
          streamCompletion(
            `/generator/chapter/stream`,
            {
              chapter_num: localChapters[i].num,
              chapter_title: localChapters[i].title,
              chapter_desc: localChapters[i].desc,
              novel_title: title,
              character_setting: characterSetting,
              world_setting: worldSetting,
              plot_idea: plotIdea,
              genre: genre,
              sub_genres: selectedSubGenres,
              pov: pov,
              pronouns: pronouns,
              previous_content: prevContent,
              use_reflection: useReflection,
              custom_prompt: customPrompt
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
            (err) => reject(err)
          );
        });
        
        // Save the result for the next iteration's context
        localChapters[i].content = streamTextRef.current;
        setChapters([...localChapters]);
        
        // Auto-save to backend
        try {
          await api.updateProject(pid as string, {
            title, genre, sub_genres: selectedSubGenres, pov, pronouns,
            character_setting: characterSetting,
            world_setting: worldSetting,
            plot_idea: plotIdea,
            chapters: localChapters
          });
        } catch (err) {
          console.error("Failed to auto-save project:", err);
        }
        
      } catch (e) {
        toast(`Lỗi sinh chương ${localChapters[i].num}`, "error");
        break; 
      }
    }
    
    setIsGenerating(false);
    setCurrentChapterIdx(null);
    if (!stopRequested.current) {
      toast("Hoàn tất sinh truyện thành công!", "success");
    } else {
      toast("Đã dừng sinh truyện.", "info");
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden w-full">
      {/* Top Stepper */}
      <div className="w-full flex flex-row items-center gap-2 border-b border-border-soft p-2 md:p-4 bg-bg-panel shrink-0 z-10 overflow-x-auto custom-scrollbar">
        <Button variant="secondary" onClick={handleOpenImportModal} className="h-8 text-xs flex items-center gap-1.5 shrink-0 px-3">
          <FolderOpen size={14} /> Nhập Truyện Cũ
        </Button>
        <div className="w-px h-5 bg-border-soft shrink-0 mx-1 hidden sm:block"></div>
        {createTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStep === tab.id;
          return (
            <button
              id={`tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveStep(tab.id)}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl transition-all duration-300 w-auto whitespace-nowrap shrink-0 ${
                isActive 
                  ? "bg-brand-primary/20 text-secondary border border-brand-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]" 
                  : "text-text-muted hover:text-text-main hover:bg-white/5"
              }`}
            >
              <Icon size={14} className={isActive ? "text-secondary" : "text-text-subtle"} />
              <span className="font-medium text-xs md:text-sm">{tab.id}. {tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-0 lg:px-10 lg:pt-0 lg:pb-10 overflow-y-auto relative bg-bg-main w-full">
        
      {/* Category Modals */}
      <SelectionModal 
        isOpen={modalType === "genre"} 
        onClose={() => setModalType(null)} 
        title="Chọn Thể Loại Chính" 
        items={genres} 
        selectedItems={genre} 
        onSelect={handleSelectModalItem} 
        multiSelect={false} 
      />
      <SelectionModal 
        isOpen={modalType === "sub_genre"} 
        onClose={() => setModalType(null)} 
        title="Chọn Các Chủ Đề Con" 
        items={subGenres} 
        selectedItems={selectedSubGenres} 
        onSelect={handleSelectModalItem} 
        multiSelect={true} 
      />
      <SelectionModal 
        isOpen={modalType === "style"} 
        onClose={() => setModalType(null)} 
        title="Chọn Văn Phong" 
        items={styles} 
        selectedItems={style} 
        onSelect={handleSelectModalItem} 
        multiSelect={false} 
      />
      <SelectionModal 
        isOpen={modalType === "tone"} 
        onClose={() => setModalType(null)} 
        title="Chọn Giọng Điệu" 
        items={tones} 
        selectedItems={tone} 
        onSelect={handleSelectModalItem} 
        multiSelect={false} 
      />
      <SelectionModal 
        isOpen={modalType === "pov"} 
        onClose={() => setModalType(null)} 
        title="Chọn Góc Nhìn (POV)" 
        items={povs} 
        selectedItems={pov} 
        onSelect={handleSelectModalItem} 
        multiSelect={false} 
      />
      <SelectionModal 
        isOpen={modalType === "pronouns"} 
        onClose={() => setModalType(null)} 
        title="Chọn Cách Xưng Hô" 
        items={pronounsList} 
        selectedItems={pronouns} 
        onSelect={handleSelectModalItem} 
        multiSelect={false} 
      />

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-bg-card border border-border-soft rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-border-soft flex justify-between items-center bg-bg-panel rounded-t-2xl">
              <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                <FolderOpen className="text-primary" size={20} /> Nhập Thiết Lập Từ Truyện Khác
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {loadingImport ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" size={32} /></div>
              ) : importProjects.length === 0 ? (
                <div className="text-center p-8 text-text-subtle">Không có truyện nào trong hệ thống.</div>
              ) : (
                importProjects.map(p => (
                  <div key={p.id} className="p-4 border border-border-soft rounded-xl hover:border-primary cursor-pointer bg-black/40 hover:bg-bg-panel transition-all" onClick={() => handleImportProject(p.id)}>
                    <h3 className="text-lg font-bold text-text-main">{p.title || "Truyện Không Tên"}</h3>
                    <p className="text-sm text-text-muted line-clamp-1">{p.genre} {p.sub_genres?.length > 0 ? `- ${p.sub_genres.join(', ')}` : ''}</p>
                    <p className="text-xs text-text-subtle mt-2">Cập nhật: {new Date(p.updated_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

        <div className="w-full h-full">
          
          {/* STEP 1: Basic Info */}
          {activeStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-3">
                <p className="text-text-muted">Thiết lập các thông số cơ bản cho tác phẩm của bạn.</p>
              </div>
              <GlassCard className="space-y-8">
                
                {/* Full Width Info Selection */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  {/* Genre Box */}
                  <div 
                    onClick={() => setModalType('genre')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-primary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-xs text-text-muted mb-1 block cursor-pointer">Thể loại chính</label>
                    <div className="text-base font-semibold text-primary flex items-center justify-between">
                      <span className="truncate pr-2">{genre || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>

                  {/* Sub Genre Box */}
                  <div 
                    onClick={() => setModalType('sub_genre')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-primary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-xs text-text-muted mb-1 block cursor-pointer">Chủ đề con</label>
                    <div className="text-base font-semibold text-secondary flex items-center justify-between">
                      <span className="truncate pr-2">
                        {selectedSubGenres.length > 0 ? selectedSubGenres.join(", ") : "Chưa chọn"}
                      </span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-secondary transition-colors shrink-0" />
                    </div>
                  </div>

                  {/* Style Box */}
                  <div 
                    onClick={() => setModalType('style')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-primary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-xs text-text-muted mb-1 flex justify-between items-center cursor-pointer">
                      <span>Văn phong {isStyleSuggested && <span className="text-primary italic">(Gợi ý)</span>}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleSuggestStyleTone(); }}
                        disabled={isSuggestingStyleTone || !genre}
                        className="hover:text-primary transition-colors text-zinc-500 disabled:opacity-50"
                        title="Gợi ý Văn phong và Giọng điệu bằng AI"
                      >
                        {isSuggestingStyleTone ? <Loader2 size={14} className="animate-spin text-primary" /> : <div className="flex items-center gap-1 hover:text-primary"><Sparkles size={12} className="text-primary/70" /> AI</div>}
                      </button>
                    </label>
                    <div className="text-base font-semibold text-primary flex items-center justify-between">
                      <span className="truncate pr-2">{style || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>

                  {/* Tone Box */}
                  <div 
                    onClick={() => setModalType('tone')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-brand-secondary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-xs text-text-muted mb-1 flex justify-between items-center cursor-pointer">
                      <span>Giọng điệu {isStyleSuggested && <span className="text-secondary italic">(Gợi ý)</span>}</span>
                    </label>
                    <div className="text-base font-semibold text-secondary flex items-center justify-between">
                      <span className="truncate pr-2">{tone || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-secondary transition-colors shrink-0" />
                    </div>
                  </div>

                  {/* POV Box */}
                  <div 
                    onClick={() => setModalType('pov')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-primary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-xs text-text-muted mb-1 block cursor-pointer">Góc nhìn (POV)</label>
                    <div className="text-base font-semibold text-primary flex items-center justify-between">
                      <span className="truncate pr-2">{pov || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>

                  {/* Pronouns Box */}
                  <div 
                    onClick={() => setModalType('pronouns')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-secondary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-xs text-text-muted mb-1 block cursor-pointer">Xưng hô</label>
                    <div className="text-base font-semibold text-secondary flex items-center justify-between">
                      <span className="truncate pr-2">{pronouns || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-secondary transition-colors shrink-0" />
                    </div>
                  </div>

                </div>
                  
                {/* Title and Generation area */}
                <div className="space-y-4 p-6 bg-bg-card rounded-2xl border border-border-soft">
                  <div>
                    <label className="text-sm text-text-muted mb-2 block">Tên truyện</label>
                    <input 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      className="w-full bg-bg-input border border-border-soft rounded-xl px-4 py-3 text-lg text-text-main outline-none focus:border-brand-primary/50" 
                      placeholder="Nhập tên truyện của bạn..." 
                    />
                  </div>
                  <div className="p-4 bg-bg-input rounded-xl border border-border-soft">
                    <p className="text-sm text-text-muted mb-3 flex items-center gap-2"><Wand2 size={16}/> Chưa nghĩ ra tên? Để AI giúp bạn:</p>
                    <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
                      <input 
                        value={customPrompt} 
                        onChange={e => setCustomPrompt(e.target.value)} 
                        className="flex-1 input min-w-[200px]" 
                        placeholder="Yêu cầu riêng (ví dụ: tên có chữ Kiếm, 4 chữ...)" 
                      />
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="secondary" onClick={handleSuggestTitle} disabled={suggestingTitle} className="flex-1 sm:flex-none">
                          {suggestingTitle ? <Loader2 size={16} className="animate-spin" /> : "Gợi ý AI"}
                        </Button>
                        <Button variant="glow" onClick={() => setActiveStep(2)} disabled={!title} className="flex-1 sm:flex-none px-6">
                          Tiếp tục
                        </Button>
                      </div>
                    </div>
                    {suggestedTitles.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border-soft">
                        {suggestedTitles.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 p-2 hover:bg-bg-panel rounded-lg cursor-pointer transition-colors" onClick={() => setTitle(t.split(" - ")[0])}>
                            <input type="radio" name="titleSuggestion" id={`t-${i}`} checked={title === t.split(" - ")[0]} readOnly className="mt-1 accent-brand-primary" />
                            <label htmlFor={`t-${i}`} className="text-sm text-text-main cursor-pointer flex-1">
                              <strong className="text-text-main block mb-1">{t.split(" - ")[0]}</strong>
                              <span className="text-text-subtle">{t.split(" - ")[1]}</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
              </GlassCard>
            </div>
          )}

          {/* STEP 2: Characters */}
          {activeStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-3">
                <p className="text-text-muted">Xây dựng hệ thống nhân vật chính và phụ.</p>
              </div>
              <GlassCard className="space-y-8">
                <div className="space-y-3">
                  <div className="p-4 bg-bg-input rounded-xl border border-border-soft space-y-3 mb-4">
                    <p className="text-sm text-text-muted flex items-center gap-2"><Wand2 size={16}/> Để AI gợi ý thiết lập nhân vật:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-text-subtle mb-1 block">Số lượng nhân vật chính</label>
                        <input type="number" value={numMainChars} onChange={e => setNumMainChars(Number(e.target.value))} min={1} max={10} className="w-full input" />
                      </div>
                      <div>
                        <label className="text-xs text-text-subtle mb-1 block">Số lượng nhân vật phụ</label>
                        <input type="number" value={numSubChars} onChange={e => setNumSubChars(Number(e.target.value))} min={0} max={20} className="w-full input" />
                      </div>
                    </div>
                    <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                      <input 
                        value={charPrompt} 
                        onChange={e => setCharPrompt(e.target.value)} 
                        className="flex-1 input min-w-[200px]" 
                        placeholder="Yêu cầu riêng (VD: Nữ chính lạnh lùng, nam chính bá đạo...)" 
                      />
                      <Button variant="secondary" onClick={() => handleSuggestContent('char')} disabled={suggestingChar} className="flex-1 sm:flex-none">
                        {suggestingChar ? <Loader2 size={16} className="animate-spin" /> : "Gợi ý AI"}
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea 
                      value={characterSetting} 
                      onChange={e => setCharacterSetting(e.target.value)}
                      rows={10} 
                      className={`textarea ${suggestingChar ? 'opacity-50' : ''}`} 
                      placeholder="Mô tả các nhân vật chính, phụ, tính cách..."
                      disabled={suggestingChar}
                    />
                    {suggestingChar && (
                      <div className="absolute inset-0 bg-zinc-950/50 flex flex-col justify-center items-center rounded-xl p-6 backdrop-blur-[2px]">
                        <div className="w-full max-w-sm space-y-4">
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-3/4"></div>
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-full"></div>
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-5/6"></div>
                        </div>
                        <p className="mt-4 text-sm text-secondary animate-pulse">AI đang thiết lập nhân vật...</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-border-soft">
                  <Button variant="secondary" onClick={() => setActiveStep(1)} className="px-8">Quay lại</Button>
                  <Button variant="glow" onClick={() => setActiveStep(3)} disabled={!characterSetting.trim()} className="px-8">Tiếp tục</Button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* STEP 3: World Building */}
          {activeStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-3">
                <p className="text-text-muted">Xây dựng thế giới, luật lệ, và bối cảnh lịch sử.</p>
              </div>
              <GlassCard className="space-y-8">
                <div className="space-y-3">
                  <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
                    <input 
                      value={worldPrompt} 
                      onChange={e => setWorldPrompt(e.target.value)} 
                      className="flex-1 input min-w-[200px]" 
                      placeholder="Yêu cầu riêng về bối cảnh (VD: Tu tiên kết hợp khoa học kỹ thuật)" 
                    />
                    <Button variant="secondary" onClick={() => handleSuggestContent('world')} disabled={suggestingWorld} className="flex-1 sm:flex-none">
                      {suggestingWorld ? <Loader2 size={16} className="animate-spin" /> : <><Wand2 size={16} className="mr-2 inline"/> Gợi ý AI</>}
                    </Button>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={worldSetting} 
                      onChange={e => setWorldSetting(e.target.value)}
                      rows={10} 
                      className={`textarea ${suggestingWorld ? 'opacity-50' : ''}`} 
                      placeholder="Luật lệ thế giới, bối cảnh lịch sử..."
                      disabled={suggestingWorld}
                    />
                    {suggestingWorld && (
                      <div className="absolute inset-0 bg-zinc-950/50 flex flex-col justify-center items-center rounded-xl p-6 backdrop-blur-[2px]">
                        <div className="w-full max-w-sm space-y-4">
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-full"></div>
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-5/6"></div>
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-4/6"></div>
                        </div>
                        <p className="mt-4 text-sm text-secondary animate-pulse">AI đang xây dựng bối cảnh...</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-border-soft">
                  <Button variant="secondary" onClick={() => setActiveStep(2)} className="px-8">Quay lại</Button>
                  <Button variant="glow" onClick={() => setActiveStep(4)} disabled={!worldSetting.trim()} className="px-8">Tiếp tục</Button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* STEP 4: Plot Idea */}
          {activeStep === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-3">
                <p className="text-text-muted">Mô tả tóm tắt nội dung chính và cao trào của truyện.</p>
              </div>
              <GlassCard className="space-y-8">
                <div className="space-y-3">
                  <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
                    <input 
                      value={plotPrompt} 
                      onChange={e => setPlotPrompt(e.target.value)} 
                      className="flex-1 input min-w-[200px]" 
                      placeholder="Yêu cầu riêng về cốt truyện (VD: Kết thúc bất ngờ, nam chính bị phản bội)" 
                    />
                    <Button variant="secondary" onClick={() => handleSuggestContent('plot')} disabled={suggestingPlot} className="flex-1 sm:flex-none">
                      {suggestingPlot ? <Loader2 size={16} className="animate-spin" /> : <><Wand2 size={16} className="mr-2 inline"/> Gợi ý AI</>}
                    </Button>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={plotIdea} 
                      onChange={e => setPlotIdea(e.target.value)}
                      rows={10} 
                      className={`textarea ${suggestingPlot ? 'opacity-50' : ''}`} 
                      placeholder="Tóm tắt nội dung chính, cao trào, diễn biến..."
                      disabled={suggestingPlot}
                    />
                    {suggestingPlot && (
                      <div className="absolute inset-0 bg-zinc-950/50 flex flex-col justify-center items-center rounded-xl p-6 backdrop-blur-[2px]">
                        <div className="w-full max-w-sm space-y-4">
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-5/6"></div>
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-full"></div>
                          <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-3/4"></div>
                        </div>
                        <p className="mt-4 text-sm text-secondary animate-pulse">AI đang triển khai cốt truyện...</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between pt-4 border-t border-border-soft">
                  <Button variant="secondary" onClick={() => setActiveStep(3)} className="px-8">Quay lại</Button>
                  <Button variant="glow" onClick={() => setActiveStep(5)} disabled={!plotIdea.trim()} className="px-8">Tiếp tục</Button>
                </div>
              </GlassCard>
            </div>
          )}

          {/* STEP 5: Outline */}
          {activeStep === 5 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-3">
                <p className="text-text-muted">Lên khung sườn và tinh chỉnh nội dung chi tiết trước khi bắt đầu viết chương.</p>
              </div>
              <GlassCard className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-end bg-bg-panel p-4 rounded-xl border border-white/10">
                  <div className="flex-1 w-full">
                     <label className="text-sm text-text-muted mb-2 block">Yêu cầu bổ sung (Tùy chọn)</label>
                     <input 
                        value={customPrompt} 
                        onChange={e => setCustomPrompt(e.target.value)} 
                        className="w-full input" 
                        placeholder="Ví dụ: Truyện buồn, kết cục mở..." 
                      />
                  </div>
                  <div className="w-full sm:w-40">
                    <label className="text-sm text-text-muted mb-2 block">Số chương dự kiến</label>
                    <input type="number" value={totalChapters} onChange={e => setTotalChapters(parseInt(e.target.value)||20)} className="w-full input" />
                  </div>
                  <Button variant="glow" onClick={handleGenerateOutline} disabled={generatingOutline} className="w-full sm:w-auto px-8 py-3 h-auto">
                    {generatingOutline ? <Loader2 size={18} className="animate-spin" /> : "Tạo Khung Truyện"}
                  </Button>
                </div>
                
                <div className="relative">
                  <textarea 
                    value={outline}
                    onChange={e => setOutline(e.target.value)}
                    className={`w-full h-80 bg-bg-input border border-border-soft rounded-xl p-6 text-text-main font-mono text-sm outline-none focus:border-brand-primary/50 leading-relaxed ${generatingOutline ? 'opacity-50' : ''}`}
                    placeholder="Khung sườn cốt truyện sẽ hiển thị tại đây. Bạn có thể tự do chỉnh sửa..."
                    disabled={generatingOutline}
                  />
                  {generatingOutline && (
                    <div className="absolute inset-0 bg-zinc-950/50 flex flex-col justify-center items-center rounded-xl p-6 backdrop-blur-[2px]">
                      <div className="w-full max-w-md space-y-5">
                        <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-1/4 mb-6"></div>
                        <div className="space-y-3">
                          <div className="h-3 bg-white/10 rounded animate-pulse w-3/4"></div>
                          <div className="h-3 bg-white/10 rounded animate-pulse w-full"></div>
                          <div className="h-3 bg-white/10 rounded animate-pulse w-5/6"></div>
                        </div>
                        <div className="h-4 bg-brand-primary/20 rounded animate-pulse w-1/3 mt-6 mb-3"></div>
                        <div className="space-y-3">
                          <div className="h-3 bg-white/10 rounded animate-pulse w-full"></div>
                          <div className="h-3 bg-white/10 rounded animate-pulse w-4/6"></div>
                        </div>
                      </div>
                      <p className="mt-6 text-sm text-secondary animate-pulse font-bold">AI đang phân chia cấu trúc...</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-border-soft">
                  <p className="text-sm text-text-subtle">Hệ thống sẽ tự động nhận diện các chương khi ấn Tiếp tục.</p>
                  <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                    <Button variant="secondary" onClick={() => setActiveStep(4)} className="flex-1 sm:flex-none px-6">Quay lại</Button>
                    <Button variant="glow" onClick={handleManualParseOutline} disabled={!outline.trim()} className="flex-1 sm:flex-none px-6 sm:ml-2">Tiếp tục</Button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* STEP 6: Auto Generation Sidebar */}
          {activeStep === 6 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100dvh-180px)]">
              {/* Left Column: Progress & Controls */}
              <div className="w-full lg:w-[350px] xl:w-[450px] flex flex-col gap-4 shrink-0 min-h-0">
                <div className="mb-3">
                  <p className="text-text-muted">Điều khiển AI tiến hành sáng tác dựa trên thiết lập.</p>
                </div>
                <GlassCard className={`flex-1 flex flex-col p-0 overflow-hidden relative border-border-soft/50 shadow-2xl lg:h-auto ${chapters.length === 0 ? 'h-auto' : 'h-[350px] sm:h-[500px]'}`}>
                  <div className="p-5 border-b border-border-soft bg-bg-input">
                    <h2 className="text-xl font-bold text-text-main mb-3">Tiến Trình Sáng Tác</h2>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted mb-5">
                      <span className="font-bold">Nhớ:</span>
                      <select value={memChapters} onChange={e => setMemChapters(parseInt(e.target.value))} className="select">
                        <option value={1}>1 chương</option>
                        <option value={3}>3 chương</option>
                        <option value={5}>5 chương</option>
                      </select>
                      <label className="flex items-center gap-2 ml-2 cursor-pointer hover:text-text-main w-full sm:w-auto mt-2 sm:mt-0">
                        <input type="checkbox" checked={useReflection} onChange={e => setUseReflection(e.target.checked)} className="w-4 h-4 accent-brand-primary" />
                        Tự động Tối ưu (AI kiểm tra lại)
                      </label>
                    </div>
                    
                    <div className="flex gap-3">
                      {!isGenerating ? (
                        <Button variant="glow" className="flex-1 py-3 h-auto text-base font-bold shadow-lg shadow-brand-primary/20" onClick={startGenerationLoop} disabled={chapters.length === 0}>
                          <Play size={18} className="mr-2" /> Bắt Đầu Sinh Truyện
                        </Button>
                      ) : (
                        <Button variant="secondary" className="flex-1 py-3 h-auto text-base font-bold text-red-400 border-red-900/50 hover:bg-red-900/20" onClick={() => stopRequested.current = true}>
                          <StopCircle size={18} className="mr-2" /> Dừng Lại
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-black/10">
                    {chapters.map((chapter, idx) => {
                      const isCurrent = currentChapterIdx === idx;
                      const isDone = !!chapter.content;
                      return (
                        <div 
                          key={idx} 
                          id={`chapter-item-${idx}`}
                          onClick={() => isDone && setViewingChapter(chapter)}
                          className={`p-4 rounded-xl border transition-all duration-300 ${isCurrent ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.02]' : isDone ? 'border-green-500/30 bg-green-500/5 cursor-pointer hover:bg-green-500/10' : 'border-border-soft bg-bg-panel opacity-70'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h4 className={`font-bold text-sm ${isCurrent ? 'text-primary' : isDone ? 'text-green-400' : 'text-text-muted'}`}>
                              Chương {chapter.num}
                            </h4>
                            {isCurrent && <Loader2 size={16} className="animate-spin text-primary" />}
                          </div>
                          <p className={`text-sm line-clamp-1 ${isCurrent ? 'text-text-main' : 'text-text-subtle'}`}>{chapter.title}</p>
                        </div>
                      );
                    })}
                    {chapters.length === 0 && (
                      <div className="h-full py-10 flex flex-col items-center justify-center text-text-subtle space-y-4">
                        <div className="w-16 h-16 rounded-full bg-bg-panel flex items-center justify-center">
                          <Wand2 size={24} className="opacity-50" />
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>

              {/* Right Column: Preview Output */}
              <div className="flex-1 flex flex-col pt-4 lg:pt-[72px] min-h-[400px] lg:min-h-0">
                {isGenerating || streamContent ? (
                  <GlassCard className="flex-1 flex flex-col border-brand-primary/50 shadow-[0_0_40px_rgba(139,92,246,0.15)] animate-in fade-in slide-in-from-bottom-8 duration-500 relative overflow-hidden min-h-0">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10 shrink-0">
                      <h2 className="text-xl font-bold text-text-main flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-brand-primary animate-pulse" />
                        Đang viết: Chương {chapters[currentChapterIdx || 0]?.num}
                      </h2>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleCopy(streamContent)} 
                          className="group relative p-1.5 text-text-muted hover:text-text-main hover:bg-white/10 rounded-md transition-colors" 
                        >
                          <Copy size={18} />
                          <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-zinc-800 border border-border-soft text-text-main text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                            Copy tất cả
                          </span>
                        </button>
                        <div className="text-sm text-secondary/80 font-medium px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                          AI Generator
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                      <div className="prose prose-invert max-w-none text-base text-text-main leading-relaxed whitespace-pre-wrap">
                        {streamContent}
                        <span className="inline-block w-2 h-5 bg-brand-primary ml-1 animate-blink align-middle"></span>
                      </div>
                      <div ref={scrollEndRef} className="h-4" />
                    </div>
                  </GlassCard>
                ) : (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-border-soft rounded-2xl bg-bg-input text-text-subtle p-6 text-center">
                    <p className="text-sm sm:text-lg">Bấm "Bắt Đầu Sinh Truyện" để AI tiến hành viết.<br/>Nội dung chương đang viết sẽ hiển thị trực tiếp tại đây.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Read Chapter Modal */}
      {viewingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-card border border-border-soft rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-border-soft">
              <h3 className="text-xl font-bold text-text-main">Chương {viewingChapter.num}: {viewingChapter.title}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopy(viewingChapter.content)} 
                  className="group relative p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors" 
                >
                  <Copy size={20} />
                  <span className="absolute top-full right-0 mt-2 px-2 py-1 bg-zinc-800 border border-border-soft text-text-main text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                    Copy tất cả
                  </span>
                </button>
                <button onClick={() => setViewingChapter(null)} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="prose prose-invert max-w-none text-base leading-relaxed text-text-main whitespace-pre-wrap">
                {viewingChapter.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

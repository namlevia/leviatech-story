"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Sparkles, Loader2, ArrowRightLeft, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { rewriteParagraph, polishText } from "@/lib/api";
import { api } from "@/services/api";
import SelectionModal from "@/components/ui/SelectionModal";

export default function RewritePage() {
  const [originalText, setOriginalText] = useState("");
  const [resultText, setResultText] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Options
  const [mode, setMode] = useState<"rewrite" | "polish">("rewrite");
  const [instruction, setInstruction] = useState("Làm văn phong bay bổng hơn, miêu tả chi tiết cảm xúc");
  const [targetStyle, setTargetStyle] = useState("Tiên Hiệp");
  const [tone, setTone] = useState("Bi tráng, trầm lắng");
  const [useReflection, setUseReflection] = useState(true);

  // Modal and Data
  const [modalType, setModalType] = useState<"style" | "tone" | null>(null);
  const [styles, setStyles] = useState<any[]>([]);
  const [tones, setTones] = useState<any[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    // Load styles and tones
    Promise.all([
      api.getDataItems('styles').catch(() => []),
      api.getDataItems('tones').catch(() => [])
    ]).then(([stData, tnData]) => {
      setStyles(stData);
      setTones(tnData);
    });
  }, []);

  const handleProcess = async () => {
    if (!originalText.trim()) {
      toast("Vui lòng nhập văn bản cần xử lý", "info");
      return;
    }
    setLoading(true);
    try {
      if (mode === "rewrite") {
        const res = await rewriteParagraph(originalText, instruction, useReflection);
        setResultText(res.content);
        toast("Viết lại thành công!", "success");
      } else {
        const res = await polishText(originalText, targetStyle, tone, useReflection);
        setResultText(res.content);
        toast("Trau chuốt thành công!", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Có lỗi xảy ra khi xử lý văn bản", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden w-full">
      <SelectionModal 
        isOpen={modalType === "style"} 
        onClose={() => setModalType(null)} 
        title="Chọn Phong Cách" 
        items={styles} 
        selectedItems={targetStyle} 
        onSelect={(val: string) => setTargetStyle(val)} 
        multiSelect={false} 
      />
      <SelectionModal 
        isOpen={modalType === "tone"} 
        onClose={() => setModalType(null)} 
        title="Chọn Văn Phong (Tone)" 
        items={tones} 
        selectedItems={tone} 
        onSelect={(val: string) => setTone(val)} 
        multiSelect={false} 
      />
      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto relative bg-bg-main w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[600px] w-full">
        {/* Left Column: Input & Options */}
        <div className="flex flex-col gap-6 h-full">
          <div className="card flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-text-main">Văn Bản Gốc</h2>
              <div className="flex bg-bg-input rounded-lg p-1 gap-1">
                <button
                  onClick={() => setMode("rewrite")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === "rewrite" ? "bg-primary text-white shadow" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Viết Lại
                </button>
                <button
                  onClick={() => setMode("polish")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === "polish" ? "bg-primary text-white shadow" : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Trau Chuốt
                </button>
              </div>
            </div>
            
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              placeholder="Nhập đoạn văn bạn muốn sửa..."
              className="flex-1 w-full bg-bg-input border border-border-soft rounded-xl p-4 text-text-main placeholder-zinc-500 focus:outline-none focus:border-primary/50 resize-none transition-colors mb-4 min-h-[200px]"
            />

            {/* Options */}
            <div className="space-y-4 p-4 rounded-xl bg-bg-panel border border-border-soft">
              {mode === "rewrite" ? (
                <div>
                  <label className="block text-sm font-medium text-text-main mb-1">Yêu Cầu Viết Lại</label>
                  <input
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="w-full bg-bg-input border border-border-soft rounded-lg px-3 py-2 text-text-main focus:outline-none focus:border-primary/50"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setModalType('style')}
                    className="px-4 py-3 bg-bg-input border border-border-soft rounded-xl cursor-pointer hover:border-primary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-sm font-medium text-text-main mb-1 block cursor-pointer">Phong Cách</label>
                    <div className="text-base font-semibold text-primary flex items-center justify-between">
                      <span className="truncate pr-2">{targetStyle || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                  <div 
                    onClick={() => setModalType('tone')}
                    className="px-4 py-3 bg-black/40 border border-border-soft rounded-xl cursor-pointer hover:border-brand-secondary/50 hover:bg-bg-panel transition-all group"
                  >
                    <label className="text-sm font-medium text-text-main mb-1 block cursor-pointer">Văn Phong (Tone)</label>
                    <div className="text-base font-semibold text-secondary flex items-center justify-between">
                      <span className="truncate pr-2">{tone || "Chưa chọn"}</span>
                      <ChevronDown size={16} className="text-zinc-600 group-hover:text-secondary transition-colors shrink-0" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="reflection" 
                  checked={useReflection}
                  onChange={(e) => setUseReflection(e.target.checked)}
                  className="rounded border-zinc-500 text-primary focus:ring-brand-primary"
                />
                <label htmlFor="reflection" className="text-sm text-text-main cursor-pointer">
                  Bật AI Reflection (Tự kiểm tra & Tối ưu kết quả)
                </label>
              </div>
            </div>

            <Button 
              className="mt-4 w-full" 
              variant="glow" 
              onClick={handleProcess}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <><ArrowRightLeft size={18} /> Bắt Đầu Xử Lý</>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Result */}
        <div className="card flex flex-col h-full relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand-secondary to-transparent opacity-50" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-main">Kết Quả</h2>
            {resultText && (
              <Button size="sm" variant="secondary">Sao chép</Button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto bg-bg-input rounded-xl p-6 border border-border-soft">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-primary space-y-4">
                <Loader2 size={32} className="animate-spin" />
                <p className="text-sm text-text-muted">Đang dùng ma thuật AI để trau chuốt...</p>
              </div>
            ) : !resultText ? (
              <p className="text-text-subtle italic text-center mt-10">Kết quả sẽ hiển thị tại đây...</p>
            ) : (
              <div className="prose prose-invert max-w-none text-text-main whitespace-pre-wrap font-serif leading-relaxed">
                {resultText}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

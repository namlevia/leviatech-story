"use client";

import { useState, useEffect } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const SelectionModal = ({ 
  isOpen, onClose, title, items, selectedItems, onSelect, multiSelect = false 
}: any) => {
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");

  // Tự động focus vào ô search khi mở, và nhận phím bấm nếu gõ ký tự
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      setLetterFilter("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const removeAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D");
  };

  const availableLetters = Array.from(new Set(items.map((item: any) => {
    const rawName = item.name || "";
    const cleanName = removeAccents(rawName).toUpperCase();
    return cleanName.charAt(0);
  })));

  const activeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => availableLetters.includes(l));

  const filtered = items.filter((item: any) => {
    const rawName = item.name || "";
    const cleanName = removeAccents(rawName).toLowerCase();
    
    if (letterFilter) {
      const cleanLetter = removeAccents(letterFilter).toLowerCase();
      if (!cleanName.startsWith(cleanLetter)) return false;
    }
    
    if (search) {
      const cleanSearch = removeAccents(search).toLowerCase();
      // Match if the string starts with the search term or contains it as a word
      if (!cleanName.includes(cleanSearch)) return false;
    }
    
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-bg-card border border-border-soft rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-border-soft flex justify-between items-center bg-bg-panel rounded-t-2xl">
          <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Sparkles className="text-primary" size={24} /> {title}
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Alphabet Filter Bar */}
        <div className="p-3 border-b border-border-soft bg-bg-panel flex overflow-x-auto gap-2 custom-scrollbar items-center">
            <button 
              onClick={(e) => { 
                setLetterFilter(""); setSearch(""); 
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
              }} 
              className={`shrink-0 px-3 h-7 md:px-4 md:h-9 rounded-full text-[10px] md:text-xs font-bold transition-colors ${!letterFilter ? 'bg-brand-primary text-text-main shadow-lg shadow-brand-primary/20' : 'text-text-subtle hover:bg-white/10 hover:text-text-main'}`}
            >
              Tất cả
            </button>
            {activeAlphabet.map(l => (
              <button 
                key={l} 
                onClick={(e) => { 
                  setLetterFilter(letterFilter === l ? "" : l); setSearch(""); 
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className={`shrink-0 w-7 h-7 md:w-9 md:h-9 rounded-full text-[10px] md:text-sm font-bold transition-colors ${letterFilter === l ? 'bg-brand-primary text-text-main shadow-lg shadow-brand-primary/20' : 'text-text-subtle hover:bg-white/10 hover:text-text-main'}`}
              >
                {l}
              </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden bg-zinc-900/50">
          
          {/* Grid View */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {filtered.map((item: any) => {
                 const isSelected = multiSelect ? selectedItems.includes(item.name) : selectedItems === item.name;
                 return (
                   <div 
                     key={item.name}
                     onClick={() => onSelect(item.name)}
                     className={`relative overflow-hidden p-4 rounded-xl border cursor-pointer transition-all duration-200 group ${isSelected ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'border-border-soft bg-black/40 hover:border-zinc-500 hover:bg-bg-panel'}`}
                   >
                     <div className="absolute -right-4 -top-4 w-16 h-16 bg-brand-primary/10 rounded-full group-hover:scale-[3] transition-transform duration-500 pointer-events-none"></div>
                     <div className={`relative z-10 font-bold text-base mb-1 ${isSelected ? 'text-primary' : 'text-text-main group-hover:text-text-main'}`}>
                       {item.name}
                     </div>
                     <div className="relative z-10 text-xs text-text-subtle line-clamp-3 leading-relaxed">
                       {item.description || "Mô tả đang cập nhật..."}
                     </div>
                   </div>
                 )
               })}
             </div>
             {filtered.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-text-subtle space-y-4">
                 <Search size={48} className="opacity-20" />
                 <p className="text-lg">Không tìm thấy kết quả phù hợp</p>
               </div>
             )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-soft bg-bg-panel rounded-b-2xl flex justify-between items-center">
          <div className="text-text-muted text-sm">
            {multiSelect ? (
              <span>Đã chọn: <strong className="text-text-main">{selectedItems.length}</strong> mục</span>
            ) : (
              <span>Đã chọn: <strong className="text-text-main">{selectedItems || "Chưa chọn"}</strong></span>
            )}
          </div>
          <Button variant="glow" onClick={onClose} className="px-8">Hoàn Tất</Button>
        </div>
      </div>
    </div>
  );
};

export default SelectionModal;

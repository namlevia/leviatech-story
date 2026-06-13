"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Loader2, Plus, Edit2, Trash2, Save, X, Server, Settings, Book, LayoutList, PenTool, Eye, EyeOff, Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

type Tab = "general" | "backends" | "genres" | "sub_genres" | "styles" | "tones" | "prompts";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-card border border-border-soft rounded-2xl w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Trash2 size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-text-main">{title}</h2>
          <p className="text-text-muted">{message}</p>
        </div>
        <div className="p-5 border-t border-border-soft bg-bg-panel rounded-b-2xl flex justify-center gap-3">
           <Button variant="secondary" onClick={onClose} className="px-6">Hủy</Button>
           <Button variant="glow" onClick={() => { onConfirm(); onClose(); }} className="px-6 bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 hover:text-red-300">Xác nhận Xóa</Button>
        </div>
      </div>
    </div>
  );
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("general");

  // States
  const [config, setConfig] = useState<any>(null);
  const [backends, setBackends] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [subGenres, setSubGenres] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);

  const [tones, setTones] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any>(null);
  const { toast } = useToast();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bData, cfgData, gData, sgData, stData, tnData, pData] = await Promise.all([
        api.getBackends().catch(() => []),
        api.getGenerationConfig().catch(() => ({
          temperature: 0.7,
          chapter_target_words: 2000,
          writing_style: "Tiên Hiệp",
          writing_tone: "Bi tráng"
        })),
        api.getDataItems('genres').catch(() => []),
        api.getDataItems('sub_genres').catch(() => []),
        api.getDataItems('styles').catch(() => []),
        api.getDataItems('tones').catch(() => []),
        api.getPrompts().catch(() => ({}))
      ]);
      setBackends(bData);
      setConfig(cfgData);
      setGenres(gData);
      setSubGenres(sgData);
      setStyles(stData);
      setTones(tnData);
      setPrompts(pData);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const tabElement = document.getElementById(`setting-tab-${activeTab}`);
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeTab]);

  const tabs = [
    { id: "general", label: "Cấu Hình Chung", icon: Settings },
    { id: "backends", label: "Kết Nối AI (Backends)", icon: Server },
    { id: "genres", label: "Thể Loại", icon: Book },
    { id: "sub_genres", label: "Chủ Đề Con", icon: LayoutList },
    { id: "styles", label: "Văn Phong", icon: PenTool },
    { id: "tones", label: "Giọng Điệu", icon: PenTool },
    { id: "prompts", label: "Prompt Hệ Thống", icon: Edit2 },
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden w-full">
      {/* Top Stepper */}
      <div className="w-full flex flex-col md:flex-row items-center gap-4 border-b border-border-soft p-4 md:px-8 bg-bg-panel shrink-0 z-10">

        <div className="flex flex-row gap-2 flex-1 overflow-x-auto custom-scrollbar pb-1 scroll-smooth w-full md:w-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`setting-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 w-auto whitespace-nowrap shrink-0 ${
                  isActive 
                    ? "bg-brand-primary/20 text-secondary border border-brand-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]" 
                    : "text-text-muted hover:text-text-main hover:bg-white/5"
                }`}
              >
                <Icon size={16} className={isActive ? "text-secondary" : "text-text-subtle"} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto relative bg-bg-main w-full">
        <div className="w-full h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full text-primary">
              <Loader2 className="animate-spin" size={32} />
            </div>
          ) : (
            <div className="min-h-full">
              {activeTab === "general" && <GeneralConfig config={config} styles={styles} tones={tones} refresh={loadData} />}
              {activeTab === "backends" && <BackendConfig backends={backends} refresh={loadData} />}
              {activeTab === "genres" && <DataConfig type="genres" title="Thể Loại Truyện" data={genres} refresh={loadData} />}
              {activeTab === "sub_genres" && <DataConfig type="sub_genres" title="Chủ Đề Con" data={subGenres} refresh={loadData} />}
              {activeTab === "styles" && <DataConfig type="styles" title="Văn Phong (Styles)" data={styles} refresh={loadData} />}
              {activeTab === "tones" && <DataConfig type="tones" title="Giọng Điệu (Tones)" data={tones} refresh={loadData} />}
              {activeTab === "prompts" && <PromptsConfig prompts={prompts} refresh={loadData} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 1. General Config Component
function GeneralConfig({ config, styles, tones, refresh }: { config: any, styles: any[], tones: any[], refresh: (silent?: boolean) => void }) {
  const [form, setForm] = useState(config || {
    temperature: 0.7,
    chapter_target_words: 2000,
    writing_style: "Tiên Hiệp",
    writing_tone: "Bi tráng",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Parse numbers
      const payload = {
        ...form,
        temperature: parseFloat(form.temperature),
        chapter_target_words: parseInt(form.chapter_target_words, 10)
      };
      await api.updateGenerationConfig(payload);
      refresh(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      toast("Lỗi khi lưu cấu hình!", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-main">Thông số mặc định (Generation Defaults)</h2>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-green-400 animate-in fade-in slide-in-from-right-2">
              Đã lưu thành công!
            </span>
          )}
          <Button size="sm" variant="glow" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu Cấu Hình
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2 p-4 bg-bg-input rounded-xl border border-border-soft">
          <label className="text-sm font-medium text-text-muted">Temperature (Độ sáng tạo)</label>
          <input 
            type="number"
            step="0.1"
            value={form.temperature}
            onChange={e => setForm({...form, temperature: e.target.value})}
            className="input w-full"
          />
        </div>
        <div className="space-y-2 p-4 bg-bg-input rounded-xl border border-border-soft">
          <label className="text-sm font-medium text-text-muted">Độ dài chương mục tiêu (Words)</label>
          <input 
            type="number"
            value={form.chapter_target_words}
            onChange={e => setForm({...form, chapter_target_words: e.target.value})}
            className="input w-full"
          />
        </div>
        <div className="space-y-2 p-4 bg-bg-input rounded-xl border border-border-soft">
          <label className="text-sm font-medium text-text-muted">Văn phong mặc định</label>
          <select
            value={form.writing_style}
            onChange={e => setForm({...form, writing_style: e.target.value})}
            className="select w-full"
          >
            {styles?.map((s, i) => (
              <option key={i} value={s.name} className="bg-zinc-900 text-text-main">{s.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2 p-4 bg-bg-input rounded-xl border border-border-soft">
          <label className="text-sm font-medium text-text-muted">Giọng điệu (Tone)</label>
          <select
            value={form.writing_tone}
            onChange={e => setForm({...form, writing_tone: e.target.value})}
            className="select w-full"
          >
            {tones?.map((t, i) => (
              <option key={i} value={t.name} className="bg-zinc-900 text-text-main">{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-text-subtle mt-4 italic">
        * Các thông số này được sử dụng làm mặc định khi tạo truyện mới nếu không có tùy chỉnh riêng.
      </p>
    </div>
  );
}

// 2. Backend Config Component
function BackendConfig({ backends, refresh }: { backends: any[], refresh: (silent?: boolean) => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingBackend, setEditingBackend] = useState<any>(null);
  const [form, setForm] = useState({ name: '', type: 'ollama', base_url: '', api_key: '', model: '', enabled: true, timeout: 120 });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const { toast } = useToast();

  const openAdd = () => {
    setForm({ name: '', type: 'ollama', base_url: '', api_key: '', model: '', enabled: true, timeout: 120 });
    setEditingBackend(null);
    setModalOpen(true);
  };

  const openEdit = (b: any) => {
    setForm({ name: b.name, type: b.type, base_url: b.base_url, api_key: b.api_key, model: b.model, enabled: b.enabled, timeout: b.timeout || 120 });
    setEditingBackend(b);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingBackend) {
        await api.updateBackend(editingBackend.name, form);
      } else {
        await api.addBackend(form);
      }
      refresh();
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast("Lỗi khi lưu Backend!", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    setFetchedModels([]);
    try {
      const res = await api.fetchModels({ type: form.type, base_url: form.base_url, api_key: form.api_key });
      if (res.data && res.data.length > 0) {
        setFetchedModels(res.data);
        toast(`Đã lấy danh sách ${res.data.length} models thành công!`, "success");
      } else {
        toast("Không tìm thấy model nào.", "error");
      }
    } catch (err: any) {
      toast(`Lỗi lấy models: ${err.message}`, "error");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await api.deleteBackend(name);
      refresh();
      setConfirmDelete(null);
      toast("Đã xóa Backend", "success");
    } catch (err) {
      toast("Lỗi khi xóa Backend!", "error");
    }
  };

  const handleToggle = async (name: string) => {
    try {
      await api.toggleBackend(name);
      refresh(true);
    } catch (err) {
      toast("Lỗi!", "error");
    }
  };

  const handleSetDefault = async (name: string) => {
    try {
      await api.setDefaultBackend(name);
      refresh(true);
    } catch (err) {
      toast("Lỗi!", "error");
    }
  };

  const handleTest = async (name: string) => {
    setTesting(name);
    try {
      await api.testBackend(name);
      toast(`Kết nối tới ${name} thành công!`, "success");
    } catch (err: any) {
      toast(`Lỗi: ${err.message}`, "error");
    } finally {
      setTesting(null);
    }
  };

  const urlPlaceholder = form.type === 'openai' ? 'https://api.openai.com/v1' : form.type === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : form.type === 'openrouter' ? 'https://openrouter.ai/api/v1' : form.type === 'anthropic' ? 'Nhập URL proxy (nếu có)' : form.type === 'groq' ? 'https://api.groq.com/openai/v1' : form.type === 'deepseek' ? 'https://api.deepseek.com/v1' : form.type === 'together' ? 'https://api.together.xyz/v1' : form.type === 'mistral' ? 'https://api.mistral.ai/v1' : 'http://localhost:11434/v1';
  const modelPlaceholder = form.type === 'openai' ? 'vd: gpt-4o' : form.type === 'gemini' ? 'vd: gemini-1.5-pro' : form.type === 'anthropic' ? 'vd: claude-3-5-sonnet-20240620' : form.type === 'openrouter' ? 'vd: anthropic/claude-3-opus' : form.type === 'groq' ? 'vd: llama3-70b-8192' : form.type === 'deepseek' ? 'vd: deepseek-coder' : form.type === 'together' ? 'vd: meta-llama/Llama-3-70b-chat-hf' : form.type === 'mistral' ? 'vd: mistral-large-latest' : 'vd: llama3';

  return (
    <div className="space-y-6 animate-in fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-main">Kết nối Mô hình AI (Backends)</h2>
        <Button size="sm" variant="glow" onClick={openAdd}><Plus size={16} /> Thêm Mới</Button>
      </div>

      <div className="space-y-4">
        {backends.length === 0 ? (
          <p className="text-text-subtle italic">Chưa có backend nào được cấu hình.</p>
        ) : (
          backends.map((b, i) => (
            <div key={i} className={`p-5 bg-bg-input border ${b.is_default ? 'border-primary' : 'border-border-soft'} rounded-xl flex flex-col sm:flex-row sm:items-center justify-between group hover:border-primary/50 transition-colors`}>
              <div className="mb-3 sm:mb-0">
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-bold text-lg text-text-main">{b.name}</h4>
                  <button onClick={() => handleToggle(b.name)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.enabled ? 'bg-green-500' : 'bg-zinc-600'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${b.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs ${b.enabled ? 'text-green-400' : 'text-text-subtle'}`}>{b.enabled ? "Bật" : "Tắt"}</span>
                  {b.is_default && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">Mặc định</span>}
                </div>
                <p className="text-sm text-text-muted">Loại: <span className="text-secondary">{b.type}</span> | Model: <span className="text-secondary">{b.model}</span> | Timeout: <span className="text-secondary">{b.timeout || 120}s</span> | URL: {b.base_url}</p>
              </div>
              <div className="flex gap-2 mt-3 sm:mt-0 flex-wrap">
                 {!b.is_default && <Button variant="secondary" size="sm" onClick={() => handleSetDefault(b.name)}>Chọn Mặc Định</Button>}
                 <Button variant="secondary" size="sm" onClick={() => handleTest(b.name)} disabled={testing === b.name}>{testing === b.name ? <Loader2 size={16} className="animate-spin" /> : "Test"}</Button>
                 <Button variant="secondary" size="sm" onClick={() => openEdit(b)}>Sửa</Button>
                 <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(b.name)} className="text-red-400 hover:text-red-300">Xóa</Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-border-soft rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-text-main mb-4">{editingBackend ? "Sửa Backend" : "Thêm Backend Mới"}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-muted mb-1 block">Tên hiển thị (Name)</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!!editingBackend} className="input w-full disabled:opacity-50" />
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">Loại AI (Provider Type)</label>
                <select 
                  value={form.type} 
                  onChange={e => {
                    const newType = e.target.value;
                    let defaultUrl = "";
                    if (newType === "openai") defaultUrl = "https://api.openai.com/v1";
                    else if (newType === "gemini") defaultUrl = "https://generativelanguage.googleapis.com/v1beta/openai/";
                    else if (newType === "openrouter") defaultUrl = "https://openrouter.ai/api/v1";
                    else if (newType === "ollama") defaultUrl = "http://localhost:11434/v1";
                    else if (newType === "groq") defaultUrl = "https://api.groq.com/openai/v1";
                    else if (newType === "deepseek") defaultUrl = "https://api.deepseek.com/v1";
                    else if (newType === "together") defaultUrl = "https://api.together.xyz/v1";
                    else if (newType === "mistral") defaultUrl = "https://api.mistral.ai/v1";
                    
                    const knownUrls = ["", "http://localhost:11434/v1", "https://api.openai.com/v1", "https://generativelanguage.googleapis.com/v1beta/openai/", "https://openrouter.ai/api/v1", "https://api.groq.com/openai/v1", "https://api.deepseek.com/v1", "https://api.together.xyz/v1", "https://api.mistral.ai/v1"];
                    if (knownUrls.includes(form.base_url)) {
                      setForm({...form, type: newType, base_url: defaultUrl});
                    } else {
                      setForm({...form, type: newType});
                    }
                  }} 
                  className="select w-full"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="groq">Groq</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="together">Together AI</option>
                  <option value="mistral">Mistral AI</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">Base URL</label>
                <input value={form.base_url} onChange={e => setForm({...form, base_url: e.target.value})} className="input w-full" placeholder={urlPlaceholder} />
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">API Key {form.type === 'ollama' ? '(Tùy chọn)' : '(Bắt buộc)'}</label>
                <div className="relative">
                  <input type={showApiKey ? "text" : "password"} value={form.api_key} onChange={e => setForm({...form, api_key: e.target.value})} className="input w-full pr-10" placeholder="sk-..." />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main">
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-sm text-text-muted block">Model Name</label>
                    <Button variant="ghost" size="sm" onClick={handleFetchModels} disabled={fetchingModels} className="h-6 text-xs px-2 py-0 text-brand-primary hover:text-brand-primary/80">
                      {fetchingModels ? <Loader2 size={12} className="animate-spin mr-1" /> : <Search size={12} className="mr-1" />}
                      Lấy danh sách
                    </Button>
                  </div>
                  <input list="model-suggestions" value={form.model} onChange={e => setForm({...form, model: e.target.value})} className="input w-full" placeholder={modelPlaceholder} />
                  <datalist id="model-suggestions">
                    {fetchedModels.length > 0 ? fetchedModels.map((m, idx) => (
                      <option key={idx} value={m} />
                    )) : (
                      <>
                        {form.type === 'openai' && <><option value="gpt-4o" /><option value="gpt-4-turbo" /><option value="gpt-3.5-turbo" /></>}
                        {form.type === 'gemini' && <><option value="gemini-1.5-pro" /><option value="gemini-1.5-flash" /><option value="gemini-1.0-pro" /></>}
                        {form.type === 'anthropic' && <><option value="claude-3-5-sonnet-20240620" /><option value="claude-3-opus-20240229" /><option value="claude-3-haiku-20240307" /></>}
                        {form.type === 'groq' && <><option value="llama3-70b-8192" /><option value="llama3-8b-8192" /><option value="mixtral-8x7b-32768" /></>}
                        {form.type === 'ollama' && <><option value="llama3" /><option value="qwen2" /><option value="phi3" /></>}
                      </>
                    )}
                  </datalist>
                </div>
                <div className="w-1/3">
                  <label className="text-sm text-text-muted mb-1 block">Timeout (giây)</label>
                  <input type="number" value={form.timeout} onChange={e => setForm({...form, timeout: parseInt(e.target.value) || 120})} className="input w-full" placeholder="120" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button variant="glow" onClick={handleSave} disabled={saving || !form.name || !form.model || (form.type !== 'ollama' && !form.api_key)}>{saving ? "Đang lưu..." : "Lưu Backend"}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={!!confirmDelete} 
        onClose={() => setConfirmDelete(null)} 
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)} 
        title="Xác nhận Xóa Backend" 
        message={`Bạn có chắc muốn xóa backend "${confirmDelete}" không?`} 
      />
    </div>
  );
}

// 3. Data Config Component (Genres, Sub-genres, Styles)
function DataConfig({ type, title, data, refresh }: { type: 'genres' | 'sub_genres' | 'styles' | 'tones', title: string, data: any[], refresh: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState("");
  const [letterFilter, setLetterFilter] = useState("");
  
  const { toast } = useToast();

  const removeAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D");
  };

  const availableLetters = Array.from(new Set(data.map((item: any) => {
    const rawName = item.name || "";
    const cleanName = removeAccents(rawName).toUpperCase();
    return cleanName.charAt(0);
  })));

  const activeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(l => availableLetters.includes(l));

  const filteredData = data.filter((item: any) => {
    const rawName = item.name || "";
    const cleanName = removeAccents(rawName).toLowerCase();
    
    if (letterFilter) {
      const cleanLetter = removeAccents(letterFilter).toLowerCase();
      if (!cleanName.startsWith(cleanLetter)) return false;
    }
    
    if (search) {
      const cleanSearch = removeAccents(search).toLowerCase();
      if (!cleanName.includes(cleanSearch)) return false;
    }
    
    return true;
  });

  const handleSave = async (oldName?: string) => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      if (oldName) {
        await api.updateDataItem(type, oldName, editForm);
      } else {
        await api.addDataItem(type, editForm);
      }
      refresh();
      setEditingId(null);
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      toast("Lỗi khi lưu dữ liệu", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await api.deleteDataItem(type, name);
      refresh();
      setConfirmDelete(null);
      toast("Đã xóa thành công", "success");
    } catch (err) {
      console.error(err);
      toast("Lỗi khi xóa", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-xl font-bold text-text-main">Quản lý {title}</h2>
        <Button 
          size="sm" 
          variant="glow" 
          onClick={() => {
            setIsAdding(true);
            setEditForm({ name: '', description: '' });
            setEditingId(null);
          }}
        >
          <Plus size={16} /> Thêm {title}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Edit / Add Modal */}
        {(isAdding || editingId !== null) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-bg-card border border-border-soft rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-border-soft flex justify-between items-center bg-bg-panel rounded-t-2xl">
                <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                  <Edit2 size={20} className="text-primary" /> {isAdding ? `Thêm ${title} Mới` : `Sửa ${title}`}
                </h2>
                <button onClick={() => { setEditingId(null); setIsAdding(false); }} className="p-2 text-text-muted hover:text-text-main hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                 <input 
                   value={editForm.name} 
                   onChange={e => setEditForm({...editForm, name: e.target.value})} 
                   placeholder="Tên..." 
                   className="input w-full text-lg font-medium"
                   autoFocus
                 />
                 <textarea 
                   value={editForm.description} 
                   onChange={e => setEditForm({...editForm, description: e.target.value})} 
                   placeholder="Mô tả chi tiết..." 
                   className="input w-full leading-relaxed"
                   rows={5}
                 />
              </div>
              <div className="p-5 border-t border-border-soft bg-bg-panel rounded-b-2xl flex justify-end gap-3">
                 <Button variant="secondary" onClick={() => { setEditingId(null); setIsAdding(false); }} className="px-6">Hủy</Button>
                 <Button variant="glow" onClick={() => handleSave(editingId || undefined)} disabled={saving || !editForm.name} className="px-6">{saving ? "Đang lưu..." : "Lưu Thay Đổi"}</Button>
              </div>
            </div>
          </div>
        )}

        {/* Alphabet Filter Bar */}
        <div className="flex overflow-x-auto py-2 gap-2 custom-scrollbar items-center border border-border-soft rounded-xl bg-bg-panel px-3 mb-6 shrink-0 w-full">
            <button onClick={(e) => { setLetterFilter(""); setSearch(""); e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }} className={`shrink-0 px-3 h-7 md:px-4 md:h-8 flex items-center justify-center rounded-full text-[10px] md:text-xs font-bold transition-colors ${!letterFilter ? 'bg-brand-primary text-text-main shadow-lg shadow-brand-primary/20' : 'text-text-subtle hover:bg-white/10 hover:text-text-main'}`}>Tất cả</button>
            {activeAlphabet.map(l => (
              <button key={l} onClick={(e) => { setLetterFilter(letterFilter === l ? "" : l); setSearch(""); e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }} className={`shrink-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[10px] md:text-xs font-bold transition-colors ${letterFilter === l ? 'bg-brand-primary text-text-main shadow-lg shadow-brand-primary/20' : 'text-text-subtle hover:bg-white/10 hover:text-text-main'}`}>{l}</button>
            ))}
        </div>

        <div className="flex flex-col gap-6">
          {/* List Data */}
          <div className="flex-1">
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              {filteredData.map((item, i) => (
                <div key={i} className="p-4 bg-bg-input border border-border-soft rounded-xl group hover:border-primary/30 transition-colors flex flex-col relative h-full">
                    <div className="flex flex-col h-full group-hover:-translate-y-1 transition-transform duration-300">
                      <h4 className="font-bold text-text-main text-base line-clamp-1 pr-12">{item.name}</h4>
                      <p className="text-text-muted text-sm mt-2 flex-1 line-clamp-4">{item.description}</p>
                      
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingId(item.name);
                            setEditForm({ name: item.name, description: item.description });
                            setIsAdding(false);
                          }}
                          className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                          title="Sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setConfirmDelete(item.name)}
                          className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors rounded-md"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                </div>
              ))}
              {filteredData.length === 0 && (
                <div className="col-span-full py-10 flex flex-col items-center justify-center text-text-subtle space-y-4 bg-bg-panel/30 rounded-xl border border-dashed border-border-soft">
                  <Search size={40} className="opacity-30" />
                  <p>Không tìm thấy mục nào.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!confirmDelete} 
        onClose={() => setConfirmDelete(null)} 
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)} 
        title={`Xác nhận xóa ${title}`} 
        message={`Bạn có chắc muốn xóa "${confirmDelete}" không? Thao tác này không thể hoàn tác.`} 
      />
    </div>
  );
}

function PromptsConfig({ prompts, refresh }: { prompts: any, refresh: (silent?: boolean) => void }) {
  const [form, setForm] = useState(prompts || {});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeField, setActiveField] = useState("chapter_system");
  const { toast } = useToast();

  useEffect(() => {
    if (prompts) setForm(prompts);
  }, [prompts]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const tabElement = document.getElementById(`prompt-tab-${activeField}`);
      if (tabElement) {
        tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [activeField]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updatePrompts(form);
      refresh(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      toast("Lỗi khi lưu prompts!", "error");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: "chapter_system", label: "Prompt Viết Chương Mới" },
    { key: "continue_system", label: "Prompt Viết Tiếp Chương" },
    { key: "outline_system", label: "Prompt Sinh Dàn Ý" },
    { key: "polish_system", label: "Prompt Trau Chuốt" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-text-main">Tuỳ chỉnh System Prompts</h2>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-green-400 animate-in fade-in slide-in-from-right-2">
              Đã lưu thành công!
            </span>
          )}
          <Button size="sm" variant="glow" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu Prompts
          </Button>
        </div>
      </div>
      
      <div className="flex flex-row gap-2 overflow-x-auto custom-scrollbar pb-2 mb-4">
        {fields.map(field => (
          <button
            key={field.key}
            id={`prompt-tab-${field.key}`}
            onClick={() => setActiveField(field.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeField === field.key 
                ? "bg-brand-primary/20 text-secondary border border-brand-primary/30 shadow-[0_0_10px_rgba(139,92,246,0.1)]" 
                : "bg-bg-input text-text-muted hover:text-text-main hover:bg-white/5 border border-border-soft"
            }`}
          >
            {field.label}
          </button>
        ))}
      </div>
      
      <div className="space-y-2 p-4 bg-bg-input rounded-xl border border-border-soft">
        <textarea 
          value={form[activeField] || ""} 
          onChange={e => setForm({...form, [activeField]: e.target.value})} 
          className="w-full bg-bg-main border border-border-soft rounded-lg px-4 py-3 text-sm text-text-main focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-y min-h-[300px] custom-scrollbar"
          placeholder={`Nhập nội dung prompt ở đây...`}
        />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Loader2, Server } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

export default function LogsPage() {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getLogs();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      toast("Lỗi khi tải nhật ký", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col flex-1 p-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="text-brand-primary" /> Nhật Ký Hệ Thống
          </h1>
          <p className="text-zinc-400 mt-2">Theo dõi mọi hoạt động và lỗi từ máy chủ API.</p>
        </div>
        <Button size="sm" variant="glow" onClick={fetchLogs} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Làm Mới"}
        </Button>
      </div>
      <div className="flex-1 bg-black/50 border border-border-glass rounded-xl overflow-hidden relative shadow-2xl">
        <div className="absolute inset-0 overflow-y-auto p-6 flex flex-col-reverse">
          <pre className="text-sm text-green-400/90 font-mono whitespace-pre-wrap leading-relaxed">
            {logs || "Đang tải nhật ký..."}
          </pre>
        </div>
      </div>
    </div>
  );
}

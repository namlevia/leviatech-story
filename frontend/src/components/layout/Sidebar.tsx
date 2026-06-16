"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, PlusCircle, 
  PenTool, Sparkles, Download, Settings, Library, BookOpen, Menu, X
} from "lucide-react";

const navigation = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Quản lý truyện", href: "/projects", icon: BookOpen },
  { name: "Tạo truyện mới", href: "/create", icon: PlusCircle },
  { name: "Tiếp tục viết", href: "/continue", icon: PenTool },
  { name: "Trau chuốt", href: "/rewrite", icon: Sparkles },
  { name: "Kho Dữ Liệu", href: "/lorebook", icon: Library },
  { name: "Xuất bản thảo", href: "/export", icon: Download },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Close mobile menu when pathname changes
    setIsMenuOpen(false);

    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      const activeItem = navigation.find(item => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
      if (activeItem) {
        // Encode the href to make it a valid ID without slashes breaking querySelectors if ever used
        const id = `nav-${activeItem.href.replace(/\//g, "-")}`;
        const tabElement = document.getElementById(id);
        if (tabElement) {
          tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
      }
    }
  }, [pathname]);

  return (
    <header className="w-full flex flex-col items-center justify-between border-b border-border-soft bg-bg-panel shrink-0 z-50 sticky top-0 md:px-6 relative">
      <div className="w-full flex items-center justify-between p-2 md:p-0 md:h-16">
        
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 md:flex-1 justify-start">
          <button 
            className="md:hidden p-2 text-text-muted hover:text-text-main rounded-lg hover:bg-white/5 transition-colors shrink-0"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/" className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#c084fc] flex items-center gap-2 shrink-0">
            LeviaTech Story
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-row gap-2 items-center justify-center shrink-0 w-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const id = `nav-${item.href.replace(/\//g, "-")}`;
            return (
              <Link
                key={item.name}
                id={id}
                href={item.href}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 w-auto whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-brand-primary/20 text-secondary border border-brand-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    : "text-text-muted hover:text-text-main hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex flex-1 justify-end"></div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden w-full flex flex-col absolute top-full left-0 bg-bg-panel border-b border-border-soft shadow-xl z-50 animate-in slide-in-from-top-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-4 px-6 py-4 border-t border-border-soft/30 transition-all ${
                  isActive ? "bg-brand-primary/10 text-secondary border-l-4 border-l-brand-primary" : "text-text-muted hover:text-text-main hover:bg-white/5 border-l-4 border-l-transparent"
                }`}
              >
                <Icon size={20} className={isActive ? "text-secondary" : ""} />
                <span className="font-medium text-base">{item.name}</span>
              </Link>
            )
          })}
        </div>
      )}
    </header>
  );
}

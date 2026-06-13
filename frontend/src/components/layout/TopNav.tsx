"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/projects" },
  { name: "Create New", href: "/create" },
  { name: "Continue Story", href: "/continue" },
  { name: "Rewrite", href: "/rewrite" },
  { name: "Export", href: "/export" },
  { name: "Settings", href: "/settings" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between px-6 h-16 bg-background-card border-b border-border-glass sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
          LeviaTech Story
        </h1>
        <nav className="flex items-center space-x-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/projects" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? "bg-brand-primary/20 text-brand-secondary border border-brand-primary/30"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-xs text-zinc-500">v1.0</div>
      </div>
    </div>
  );
}

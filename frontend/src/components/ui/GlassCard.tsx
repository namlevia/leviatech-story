import { ReactNode, HTMLAttributes } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: boolean;
}

export function GlassCard({ children, className, glow = false, ...props }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "card",
        glow ? "shadow-[0_0_20px_rgba(139,92,246,0.15)] border-primary/30" : "",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

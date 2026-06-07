"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  Clock,
  Image,
  Settings,
  Radio,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Job History", icon: Clock },
  { href: "/jobs/new", label: "New Job", icon: Video },
  { href: "/watermarks", label: "Watermarks", icon: Image },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen flex flex-col bg-[#111111] border-r border-[#1f1f1f]">
      {/* ─── Logo / Brand ───────────────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#F59E0B] flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#e8e8e8] leading-tight tracking-tight">
              StreamCap
            </p>
            <p className="text-[10px] text-[#555] font-mono uppercase tracking-widest">
              Studio
            </p>
          </div>
        </div>
      </div>

      {/* ─── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard" || pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors group",
                isActive
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-[#888] hover:text-[#e8e8e8] hover:bg-[#1a1a1a]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-[#F59E0B]" : "text-[#555] group-hover:text-[#888]"
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span>{label}</span>
              {isActive && (
                <ChevronRight className="w-3 h-3 ml-auto text-[#F59E0B]/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-[#1f1f1f]">
        <p className="text-[10px] text-[#333] font-mono">v1.0.0</p>
      </div>
    </aside>
  );
}

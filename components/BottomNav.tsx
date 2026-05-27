"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, FileSearch, History, Radar, Search, Settings } from "lucide-react";

const items = [
  { href: "/", label: "總覽", icon: Radar },
  { href: "/targets", label: "目標", icon: Activity },
  { href: "/history", label: "紀錄", icon: History },
  { href: "/manual-parse", label: "手動解析", icon: FileSearch },
  { href: "/discovery", label: "搜尋", icon: Search },
  { href: "/settings", label: "設定", icon: Settings }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/96 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-6">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                active ? "text-teal-700" : "text-slate-500"
              }`}
              title={label}
            >
              <Icon aria-hidden size={21} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

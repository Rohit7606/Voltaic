"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Map, LayoutDashboard, Settings, Info, Zap } from "lucide-react";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/plan", label: "Route Planner", icon: Map },
    { href: "/charging", label: "Chargers", icon: Zap },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-6 top-6 bottom-6 w-64 flex flex-col rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/5 shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex h-20 items-center px-8 font-bold text-xl tracking-tight uppercase bg-white/5">
                <Zap className="mr-3 h-5 w-5 text-primary fill-primary" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">Voltaic</span>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 space-y-2 p-4 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 group relative overflow-hidden",
                                isActive
                                    ? "text-primary bg-primary/5"
                                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {/* Active Glow Bar */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_var(--primary)]" />
                            )}

                            <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-neutral-500 group-hover:text-white")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-6 bg-gradient-to-t from-black/50 to-transparent">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-neutral-500 bg-white/5 border border-white/5">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_var(--primary)]"></div>
                    <span className="tracking-widest uppercase">System Online</span>
                </div>
            </div>
        </aside>
    );
}

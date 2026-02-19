"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map as MapIcon, Zap, Settings, Command, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
    { name: "Journey", href: "/", icon: MapIcon },
    { name: "Chargers", href: "/chargers", icon: Zap },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <header className="absolute top-0 left-0 right-0 z-50 h-16 px-6 flex items-center justify-between border-b border-white/5 bg-black/95 backdrop-blur-xl supports-[backdrop-filter]:bg-black/80">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20">
                    <Zap className="w-5 h-5 text-primary fill-primary" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight text-white leading-none">VOLTAIC</span>
                </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-sm">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href === "/" && pathname === "/planner");
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive ? "fill-current" : "")} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-white/5 rounded-full w-9 h-9">
                    <Search className="w-4 h-4" />
                </Button>
                <div className="relative">
                    <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white hover:bg-white/5 rounded-full w-9 h-9">
                        <Bell className="w-4 h-4" />
                    </Button>
                    <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-black"></span>
                </div>

                <div className="h-4 w-px bg-white/10 mx-1"></div>

                <div className="flex items-center gap-2 pl-1 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">JD</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

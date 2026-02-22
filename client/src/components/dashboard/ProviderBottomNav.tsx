"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Calendar,
    Scissors,
    Users,
    Settings,
    BarChart3,
    Store,
    MoreHorizontal,
    ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const primaryNavItems = [
    {
        label: "Home",
        href: "/dashboard/provider",
        icon: LayoutDashboard,
        matchExact: true
    },
    {
        label: "Bookings",
        href: "/dashboard/provider/bookings",
        icon: Calendar,
        matchExact: false
    },
    {
        label: "Services",
        href: "/dashboard/provider/services",
        icon: Scissors,
        matchExact: false
    }
];

const moreMenuLinks = [
    {
        label: "Customers",
        href: "/dashboard/provider/customers",
        icon: Users,
        description: "View history & send reminders"
    },
    {
        label: "Analytics",
        href: "/dashboard/provider/analytics",
        icon: BarChart3,
        description: "Check your performance"
    },
    {
        label: "Staff",
        href: "/dashboard/provider/staff",
        icon: Users,
        description: "Manage team & schedules"
    },
    {
        label: "My Profile",
        href: "/dashboard/provider/profile/edit",
        icon: Store,
        description: "Edit salon details"
    },
    {
        label: "Settings",
        href: "/dashboard/provider/settings",
        icon: Settings,
        description: "App preferences"
    }
];

export function ProviderBottomNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isActive = (href: string, matchExact?: boolean) => {
        if (matchExact) {
            return pathname === href;
        }
        return pathname?.startsWith(href);
    };

    const isMoreActive = moreMenuLinks.some(link => isActive(link.href));

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Gradient fade effect on top */}
            <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

            {/* Main nav container with glassmorphism */}
            <div className="bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
                    {/* Primary Links */}
                    {primaryNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href, item.matchExact);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground active:scale-95"
                                )}
                            >
                                <div className={cn(
                                    "relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-300",
                                    active && "bg-primary/10"
                                )}>
                                    <Icon
                                        className={cn(
                                            "w-5 h-5 transition-transform duration-200",
                                            active && "scale-110"
                                        )}
                                        strokeWidth={active ? 2.5 : 2}
                                    />
                                    {active && (
                                        <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium transition-all duration-200",
                                    active ? "font-semibold" : "font-normal"
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* "More" Drawer Trigger */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <button
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                                    isMoreActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground active:scale-95"
                                )}
                            >
                                <div className={cn(
                                    "relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-300",
                                    isMoreActive && "bg-primary/10"
                                )}>
                                    <MoreHorizontal
                                        className={cn(
                                            "w-5 h-5 transition-transform duration-200",
                                            isMoreActive && "scale-110"
                                        )}
                                        strokeWidth={isMoreActive ? 2.5 : 2}
                                    />
                                    {isMoreActive && (
                                        <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary animate-in zoom-in duration-200" />
                                    )}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium transition-all duration-200",
                                    isMoreActive ? "font-semibold" : "font-normal"
                                )}>
                                    More
                                </span>
                            </button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-3xl border-t border-border/50 px-4 pb-8 pt-6">
                            <SheetHeader className="mb-6 text-left">
                                <SheetTitle className="text-xl font-bold">More Options</SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col gap-2">
                                {moreMenuLinks.map((link) => {
                                    const Icon = link.icon;
                                    const active = isActive(link.href, false);

                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-2xl transition-all",
                                                active ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                                    active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                                                )}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className={cn(
                                                        "text-sm font-semibold",
                                                        active ? "text-primary" : "text-foreground"
                                                    )}>
                                                        {link.label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {link.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className={cn(
                                                "w-4 h-4",
                                                active ? "text-primary" : "text-muted-foreground/50"
                                            )} />
                                        </Link>
                                    );
                                })}
                            </div>
                        </SheetContent>
                    </Sheet>

                </div>
            </div>

            {/* Safe area for devices with home indicator */}
            <div className="h-[env(safe-area-inset-bottom)] bg-background/95" />
        </nav>
    );
}

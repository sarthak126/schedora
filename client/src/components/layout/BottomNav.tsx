"use client";

import { Home, Search, Calendar, User, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    // Check for user role to determine if we should show this nav
    // Requirement: "for customer pages only"
    // We will show this for public pages (if not provider/admin) and customer dashboard
    const [showNav, setShowNav] = useState(false);

    useEffect(() => {
        const checkUser = () => {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    // Show if user is customer or not logged in
                    setShowNav(!parsedUser.role || parsedUser.role === 'customer');
                } catch (e) {
                    setShowNav(true); // Default to showing if parse fails (assume guest)
                }
            } else {
                setUser(null);
                setShowNav(true); // Show for guests
            }
        };

        checkUser();
        window.addEventListener('storage', checkUser);
        window.addEventListener('auth-change', checkUser);

        return () => {
            window.removeEventListener('storage', checkUser);
            window.removeEventListener('auth-change', checkUser);
        };
    }, []);

    // Don't show on admin or provider dashboard pages if we managed to catch that state
    // Also don't show on auth pages? User didn't specify, but usually bottom nav is for main app nav.
    // Let's hide on auth pages to be clean.
    if (!showNav || pathname?.startsWith('/dashboard/provider') || pathname?.startsWith('/dashboard/admin') || pathname?.startsWith('/auth')) {
        return null;
    }

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-[0_-5px_10px_rgba(0,0,0,0.02)] pb-safe-area-inset-bottom">
            <div className="flex justify-around items-center h-16">
                <Link
                    href="/"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1",
                        isActive("/") && pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Home className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                <Link
                    href="/explore"
                    className={cn(
                        "flex flex-col items-center justify-center w-full h-full space-y-1",
                        isActive("/explore") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Search className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Explore</span>
                </Link>

                {user ? (
                    <>
                        {/* Customer Dashboard Link */}
                        <Link
                            href="/dashboard/customer/bookings"
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive("/dashboard/customer") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Calendar className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Bookings</span>
                        </Link>

                        <Link
                            href="/dashboard/customer/settings"
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full space-y-1",
                                isActive("/dashboard/customer/settings") ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <User className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Profile</span>
                        </Link>
                    </>
                ) : (
                    <Link
                        href="/auth/login"
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <User className="h-5 w-5" />
                        <span className="text-[10px] font-medium">Login</span>
                    </Link>
                )}
            </div>
        </div>
    );
}

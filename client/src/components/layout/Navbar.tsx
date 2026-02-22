"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { User, LogOut, Menu } from "lucide-react";

export function Navbar() {
    const [user, setUser] = useState<any>(null);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Simple auth check via localStorage for now
        // In a real app, use a proper AuthContext or hook
        const checkUser = () => {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (e) {
                    console.error("Failed to parse user", e);
                }
            } else {
                setUser(null);
            }
        };

        checkUser();
        // Allow other components to trigger update via event
        window.addEventListener('storage', checkUser);
        window.addEventListener('auth-change', checkUser);

        return () => {
            window.removeEventListener('storage', checkUser);
            window.removeEventListener('auth-change', checkUser);
        };
    }, []);

    const performLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-change'));
        setUser(null);
        setShowLogoutDialog(false);
        router.push('/');
        router.refresh();
    };

    const getDashboardLink = () => {
        if (!user) return "/auth/login";
        if (user.role === 'admin') return "/dashboard/admin";
        return user.role === 'provider' ? "/dashboard/provider" : "/dashboard/customer/bookings";
    };

    const isAuthPage = pathname?.startsWith('/auth');

    return (
        <header className="sticky top-0 z-50 w-full border-b border-black/5 bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="mr-6 flex flex-col justify-center gap-0.5 group">
                    <span className="text-2xl font-extrabold tracking-tighter leading-none group-hover:text-primary transition-colors">Schedora</span>
                    <span className="text-[10px] font-medium text-muted-foreground/80 tracking-wide group-hover:text-muted-foreground transition-colors">
                        Book services without waiting
                    </span>
                </Link>
                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    {/* <Link href="/pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">
                        Pricing
                    </Link> */}
                </nav>

                {/* Desktop Auth Buttons */}
                <div className="hidden md:flex items-center space-x-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">
                                Hi, {user.name}
                            </span>
                            <Link href={getDashboardLink()}>
                                <Button variant="ghost" size="sm">Dashboard</Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => setShowLogoutDialog(true)} title="Logout">
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        !isAuthPage && (
                            <>
                                <Link href="/auth/login">
                                    <Button variant="ghost" size="sm">Login</Button>
                                </Link>
                                <Link href="/auth/signup?role=customer">
                                    <Button size="sm" className="rounded-full">Get Started</Button>
                                </Link>
                            </>
                        )
                    )}
                </div>

                {/* Mobile Actions */}
                <div className="flex md:hidden items-center gap-3">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium max-w-[100px] truncate">
                                {user.name?.split(' ')[0]}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full w-8 h-8 bg-primary/10 hover:bg-primary/20"
                                onClick={() => setShowLogoutDialog(true)}
                                title="Account"
                            >
                                <User className="h-4 w-4 text-primary" />
                            </Button>
                        </div>
                    ) : (
                        !isAuthPage && (
                            <Link href="/auth/login">
                                <Button size="sm" className="rounded-full h-8 px-4 text-xs">
                                    Login
                                </Button>
                            </Link>
                        )
                    )}
                </div>
            </div>

            <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Logout</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to log out of your account?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={performLogout}>Logout</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </header>
    )
}

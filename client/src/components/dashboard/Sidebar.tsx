"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, Settings, Scissors, History, Heart, LogOut, Store, Users, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null);
    const [hasSalon, setHasSalon] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    useEffect(() => {
        // Simple role check from localStorage for MVP
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setRole(parsed.role);

                // If provider, check if they have a salon
                if (parsed.role === 'provider') {
                    // We need to import api here, or move this logic up. 
                    // Importing api inside component file is fine.
                    // But we need to make sure 'api' is imported.
                    import("@/lib/api").then(({ default: api }) => {
                        api.get('/salons/me')
                            .then(res => {
                                if (res.data) setHasSalon(true);
                            })
                            .catch(err => console.error("Sidebar salon check failed", err));
                    });
                }
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
    }, []);

    const providerItems = [
        { label: "Overview", href: "/dashboard/provider", icon: LayoutDashboard, color: "text-sky-500" },
        { label: "My Salon", href: "/dashboard/provider/profile/edit", icon: Store, color: "text-violet-500" },
        { label: "Customers", href: "/dashboard/provider/customers", icon: Users, color: "text-blue-500" },
        { label: "Staff", href: "/dashboard/provider/staff", icon: Users, color: "text-green-500" },
        { label: "Services", href: "/dashboard/provider/services", icon: Scissors, color: "text-pink-700" },
        { label: "Bookings", href: "/dashboard/provider/bookings", icon: Calendar, color: "text-orange-700" },
        { label: "Analytics", href: "/dashboard/provider/analytics", icon: BarChart3, color: "text-neutral-600" },
        { label: "Settings", href: "/dashboard/provider/settings", icon: Settings },
    ];

    const customerItems = [
        { label: "My Bookings", href: "/dashboard/customer/bookings", icon: History, color: "text-sky-500" },
        { label: "Favorites", href: "/dashboard/customer/favorites", icon: Heart, color: "text-pink-500" },
        { label: "Settings", href: "/dashboard/customer/settings", icon: Settings },
    ];

    const adminItems = [
        { label: "Overview", href: "/dashboard/admin", icon: LayoutDashboard, color: "text-red-500" },
        { label: "Providers", href: "/dashboard/admin/providers", icon: Store, color: "text-orange-500" },
        { label: "Users", href: "/dashboard/admin/users", icon: Users, color: "text-neutral-500" },
    ];

    const staffItems = [
        { label: "My Appointments", href: "/dashboard/staff", icon: Calendar, color: "text-teal-500" },
        { label: "Settings", href: "/dashboard/staff/settings", icon: Settings },
    ];

    let items = customerItems;
    if (role === 'provider') {
        if (hasSalon) {
            items = providerItems;
        } else {
            // Restricted access for new providers
            items = [
                { label: "Overview", href: "/dashboard/provider", icon: LayoutDashboard, color: "text-sky-500" },
                { label: "Settings", href: "/dashboard/provider/settings", icon: Settings },
            ];
        }
    }
    if (role === 'admin') items = adminItems;
    if (role === 'staff') items = staffItems;

    const performLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token'); // Clear token if any
        window.dispatchEvent(new Event('auth-change'));
        setShowLogoutDialog(false);
        router.push('/');
        router.refresh();
    };

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-secondary/10 border-r border-white/10">
            {user && (
                <div className="px-6 pb-2 pt-1 mb-2">
                    <h2 className="text-xl font-bold tracking-tight">{user.name}</h2>
                    <p className="text-xs text-muted-foreground">{role === 'provider' ? 'Business Account' : 'Customer Account'}</p>
                </div>
            )}
            <div className="px-3 py-2 flex-1 pt-0 overflow-y-auto overflow-x-hidden">
                <div className="space-y-2 md:space-y-3 pt-4">
                    {items.map((route) => {
                        const Icon = route.icon;
                        const isActive = pathname === route.href;
                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "text-sm group flex p-3 md:py-3.5 w-full justify-start font-medium cursor-pointer rounded-xl transition-all duration-200 items-center",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold"
                                        : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                                )}
                            >
                                <div className="flex items-center flex-1">
                                    <Icon className={cn("h-5 w-5 mr-3 stroke-[2] transition-transform duration-200 group-hover:scale-105",
                                        isActive ? "text-primary-foreground" : "text-muted-foreground/70 group-hover:text-foreground"
                                    )} />
                                    {route.label}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
            <div className="px-3">
                <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => setShowLogoutDialog(true)}>
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                </Button>
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
        </div>
    );
}

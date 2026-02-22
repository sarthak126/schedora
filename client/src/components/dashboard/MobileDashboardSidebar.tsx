"use client";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export function MobileDashboardSidebar() {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    const [userRole, setUserRole] = useState<string | null>(null);

    // Close sidebar when pathname changes
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUserRole(parsed.role);
            } catch (e) {
                console.error("Failed to parse user role", e);
            }
        }
    }, []);

    // If customer, hide this hamburger menu because they have BottomNav
    if (userRole === 'customer') {
        return null;
    }

    return (
        <div className="flex items-center mb-4">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Menu className="h-4 w-4" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[250px] sm:w-[300px] p-0">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <Sidebar />
                </SheetContent>
            </Sheet>
        </div>
    );
}

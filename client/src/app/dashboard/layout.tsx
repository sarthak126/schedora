"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { ProviderBottomNav } from "@/components/dashboard/ProviderBottomNav";
import { useEffect, useState } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [userRole, setUserRole] = useState<string | null>(null);

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

    const isProvider = userRole === 'provider';
    const isAdmin = userRole === 'admin';

    return (
        <div className="flex min-h-screen flex-col space-y-0 md:space-y-6">
            <div className="container grid flex-1 gap-0 md:gap-12 md:grid-cols-[200px_1fr] py-0 md:py-6">
                <aside className="hidden w-[200px] flex-col md:flex h-[calc(100vh-8rem)] sticky top-20">
                    <Sidebar />
                </aside>
                <main className="flex w-full flex-1 flex-col overflow-hidden pb-24 md:pb-0">
                    {children}
                </main>
            </div>

            {/* Provider Bottom Navigation - Only on mobile */}
            {isProvider && <ProviderBottomNav />}
        </div>
    )
}

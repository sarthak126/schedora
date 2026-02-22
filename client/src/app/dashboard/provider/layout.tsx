"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ProviderLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [status, setStatus] = useState<'loading' | 'active' | 'expired'>('loading');
    const router = useRouter();

    useEffect(() => {
        // 1. Initial Access Check
        const validateAccess = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const user = JSON.parse(storedUser);
                    if (user.role !== 'provider') {
                        console.warn('ProviderLayout: Role mismatch (found ' + user.role + '), redirecting.');
                        router.push('/');
                        return false;
                    }
                } catch (e) { console.error(e); }
            } else {
                router.push('/auth/login');
                return false;
            }
            return true;
        };

        if (!validateAccess()) return;

        // 2. Subscription Check
        const checkSub = async () => {
            try {
                const { data } = await api.get("/subscriptions/current");
                if (data.status === 'active' && new Date(data.endDate) > new Date()) {
                    setStatus('active');
                } else {
                    setStatus('expired');
                }
            } catch (error: any) {
                console.error("Sub check failed", error);
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    router.push("/auth/login");
                    return;
                }
                setStatus('active');
            }
        };
        checkSub();

        // 3. Listen for Storage Changes (Tab Switching)
        const handleStorageChange = () => {
            const storedUser = localStorage.getItem('user');
            if (!storedUser) {
                router.push('/auth/login');
                return;
            }
            try {
                const user = JSON.parse(storedUser);
                if (user.role !== 'provider') {
                    window.location.href = '/';
                }
            } catch (e) { }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [router]);

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground animate-pulse">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (status === 'expired') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
                <h1 className="text-3xl font-bold mb-2">Subscription Expired</h1>
                <p className="text-muted-foreground mb-6 max-w-md">
                    Your plan has expired. Please renew your subscription to continue accessing your dashboard and managing bookings.
                </p>
                <div className="flex gap-4">
                    <Button onClick={() => router.push("/pricing")}>Renew Now</Button>
                    <Button variant="outline" onClick={() => router.push("/")}>Back to Home</Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {children}
        </>
    );
}


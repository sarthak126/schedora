"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Store, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get("/admin/stats");
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch admin stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-[200px] w-full" />
        </div>
    }

    if (!stats) return <div>Failed to load stats</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Users</h3>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">Active customers</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Salons</h3>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{stats.totalSalons}</div>
                    <p className="text-xs text-muted-foreground">{stats.totalProviders} providers</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Pending Approvals</h3>
                        <CheckCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-500">{stats.pendingSalons}</div>
                    <Link href="/dashboard/admin/providers">
                        <Button variant="link" className="p-0 h-auto text-xs">View Pending &rarr;</Button>
                    </Link>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Platform Revenue</h3>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-500">₹{stats.revenue}</div>
                    <p className="text-xs text-muted-foreground">Total earnings</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="flex flex-col gap-2">
                        <Link href="/dashboard/admin/providers">
                            <Button variant="outline" className="w-full justify-start">Manage Providers</Button>
                        </Link>
                        <Link href="/dashboard/admin/users">
                            <Button variant="outline" className="w-full justify-start">Manage Users</Button>
                        </Link>
                        <Link href="/dashboard/admin/payments">
                            <Button variant="outline" className="w-full justify-start">💳 Payment Monitoring</Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

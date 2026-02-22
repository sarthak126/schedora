"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Crown, Clock, Check, X, Users, TrendingUp, TrendingDown,
    Calendar, Plus, Filter, MoreHorizontal, ArrowUpRight, ArrowDownRight,
    Search, Bell, Download, Settings
} from "lucide-react";
import { socket } from "@/lib/socket";
import { BookingLinkCard } from "@/components/dashboard/provider/BookingLinkCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isSameDay, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, subWeeks } from "date-fns";

export default function ProviderDashboard() {
    const [salon, setSalon] = useState<any>(null);
    const [subscription, setSubscription] = useState<any>(null);
    const [servicesCount, setServicesCount] = useState(0);
    const [stats, setStats] = useState({ bookings: 0, revenue: 0, views: 0 });
    const [allBookings, setAllBookings] = useState<any[]>([]);
    const [pendingBookings, setPendingBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'today'>('7d');

    // Computed Trends
    const [revenueTrend, setRevenueTrend] = useState({ value: 0, direction: 'up', percentage: 0 });
    const [chartData, setChartData] = useState<any[]>([]);

    const router = useRouter();

    const handleBookingAction = async (id: string, action: 'approve' | 'reject') => {
        if (!confirm(`Are you sure you want to ${action} this booking?`)) return;
        try {
            const newStatus = action === 'approve' ? 'confirmed' : 'cancelled';
            await api.put(`/bookings/${id}/status`, { status: newStatus });

            // Optimistic update
            setPendingBookings(prev => prev.filter(b => b._id !== id));
            // Reload data to update charts/revenue
            fetchDashboardData();
        } catch (error) {
            console.error("Action failed", error);
            alert("Failed to update booking status");
        }
    };

    const fetchDashboardData = async () => {
        try {
            // Fetch Salon
            const { data: salonData } = await api.get("/salons/me");
            if (!salonData) {
                setSalon(null);
                setLoading(false);
                return;
            }
            setSalon(salonData);

            // Fetch Subscription
            const { data: subData } = await api.get("/subscriptions/current");
            setSubscription(subData);

            // Fetch Services Count
            const { data: servicesData } = await api.get("/services");
            setServicesCount(servicesData.length);

            // Fetch Analytics Stats (Backend total values)
            const { data: statsData } = await api.get("/salons/stats");
            setStats(statsData);

            // Fetch All Bookings for Grid & Charts
            const { data: bookingsData } = await api.get("/bookings/my");
            setAllBookings(bookingsData);
            setPendingBookings(bookingsData.filter((b: any) => b.status === "pending_approval"));

            // --- Compute Trends & Chart Data ---
            processChartData(bookingsData);

        } catch (error: any) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (bookings: any[]) => {
        const now = new Date();
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');

        // 1. Calculate Weekly Revenue Trend
        const thisWeekStart = startOfWeek(now);
        const lastWeekStart = startOfWeek(subWeeks(now, 1));
        const lastWeekEnd = endOfWeek(subWeeks(now, 1));

        let thisWeekRevenue = 0;
        let lastWeekRevenue = 0;

        confirmedBookings.forEach(b => {
            const bookingDate = new Date(b.date);
            if (bookingDate >= thisWeekStart) {
                thisWeekRevenue += (b.price || 0);
            } else if (bookingDate >= lastWeekStart && bookingDate <= lastWeekEnd) {
                lastWeekRevenue += (b.price || 0);
            }
        });

        const diff = thisWeekRevenue - lastWeekRevenue;
        const percentage = lastWeekRevenue > 0 ? Math.round((diff / lastWeekRevenue) * 100) : 100;

        setRevenueTrend({
            value: thisWeekRevenue,
            direction: diff >= 0 ? 'up' : 'down',
            percentage: Math.abs(percentage)
        });

        // 2. Generate Daily Revenue Chart
        const days = timeRange === '30d' ? 30 : (timeRange === 'today' ? 1 : 7);
        const chartData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = subDays(now, i);
            const dateStr = format(date, 'yyyy-MM-dd');

            // Sum revenue for this day
            const dayRevenue = confirmedBookings
                .filter(b => b.date && b.date.startsWith(dateStr))
                .reduce((sum, b) => sum + (b.price || 0), 0);

            chartData.push({
                name: format(date, 'EEE'), // Mon, Tue
                revenue: dayRevenue,
                bookings: bookings.filter(b => b.date && b.date.startsWith(dateStr)).length // Booking count
            });
        }
        setChartData(chartData);
    };

    useEffect(() => {
        if (allBookings.length > 0) {
            processChartData(allBookings);
        }
    }, [timeRange, allBookings]);

    useEffect(() => {
        // Auth Check Logic
        const userStr = localStorage.getItem("user");
        if (!userStr) { router.push("/auth/login"); return; }

        fetchDashboardData();
    }, [router]);

    // Listen for new appointment to refresh data
    useEffect(() => {
        const handleRefresh = () => {
            fetchDashboardData();
        };
        socket.on("new_appointment", handleRefresh);
        return () => {
            socket.off("new_appointment", handleRefresh);
        };
    }, []);

    // Notifications are now handled globally in ProviderLayout

    if (loading) {
        return <div className="space-y-4">
            <Skeleton className="h-12 w-[250px]" />
            <Skeleton className="h-[200px] w-full" />
        </div>
    }

    if (!salon) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <h2 className="text-3xl font-bold">Welcome, Partner!</h2>
                <p className="text-muted-foreground max-w-md">
                    To start accepting bookings and managing your services, you need to set up your business profile first.
                </p>
                <Link href="/dashboard/provider/onboarding">
                    <Button size="lg" className="mt-4">🚀 Setup Your Profile</Button>
                </Link>
            </div>
        );
    }

    const isPro = subscription?.plan === 'pro' || subscription?.plan === 'business';
    const trendColor = revenueTrend.direction === 'up' ? 'text-green-500' : 'text-red-500';
    const TrendIcon = revenueTrend.direction === 'up' ? TrendingUp : TrendingDown;

    return (
        <div className="space-y-6 md:space-y-8 p-4 md:p-0 max-w-[1600px] mx-auto animate-in fade-in duration-500">



            {/* 1. Motivational Header (Product Thinking) */}
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 md:p-6 rounded-2xl border border-primary/10 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                        Welcome back, {salon.name}
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        You earned <span className="font-bold text-foreground mx-1">₹{revenueTrend.value}</span> this week —
                        <span className={`mx-1 font-medium ${trendColor}`}>
                            {revenueTrend.percentage}% {revenueTrend.direction === 'up' ? 'more' : 'less'}
                        </span>
                        than last week. Keep it up. 🚀
                    </p>
                </div>
                {/* Decoration */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
            </div>

            {/* 2. Controls & Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold">Overview</h2>
                    {isPro && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 gap-1">
                            <Crown className="w-3 h-3" /> PRO
                        </Badge>
                    )}
                </div>

                <div className="flex items-center bg-secondary/50 p-1 rounded-lg border border-border/50">
                    <button
                        onClick={() => setTimeRange('today')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === 'today' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Today
                    </button>
                    <button
                        onClick={() => setTimeRange('7d')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === '7d' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setTimeRange('30d')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${timeRange === '30d' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            {/* 3. Stats Grid (Highlight Revenue) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue Card (Main Focus) */}
                <div className="glass-card p-6 border-l-4 border-l-green-500 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                            <h3 className="text-3xl font-bold mt-2">₹{stats.revenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded-lg text-green-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className={`flex items-center text-xs font-medium ${revenueTrend.direction === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                        {revenueTrend.direction === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {revenueTrend.direction === 'up' ? '+' : '-'}{revenueTrend.percentage}% from last week
                    </div>
                </div>

                {/* Total Bookings */}
                <div className="glass-card p-6 border-l-4 border-l-blue-500 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                            <h3 className="text-3xl font-bold mt-2">{stats.bookings}</h3>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                        <span className="text-green-500 flex items-center mr-1"><ArrowUpRight className="w-3 h-3" /> 5%</span> this week
                    </div>
                </div>

                {/* Active Services */}
                <div className="glass-card p-6 border-l-4 border-l-purple-500 hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Services</p>
                            <h3 className="text-3xl font-bold mt-2">{servicesCount}</h3>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                            <MoreHorizontal className="w-5 h-5" />
                        </div>
                    </div>
                    <Link href="/dashboard/provider/services" className="text-xs text-primary hover:underline">Manage Services →</Link>
                </div>

                {/* Profile Views (De-emphasized) */}
                <div className="glass-card p-6 border-l-4 border-l-gray-400 opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Profile Views</p>
                            <h3 className="text-3xl font-bold mt-2">{stats.views}</h3>
                        </div>
                        <div className="p-2 bg-gray-500/10 rounded-lg text-gray-600">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Total visibility</p>
                </div>
            </div>

            {/* 4. Charts & Operations Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Revenue Chart (Takes 2 columns) */}
                <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold">Revenue Trend</h3>
                            <p className="text-sm text-muted-foreground">Daily revenue performance</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                            <Download className="w-4 h-4" /> Export
                        </Button>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#888' }}
                                        tickFormatter={(value) => `₹${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value: any) => [`₹${value}`, 'Revenue']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorRevenue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No revenue data yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Operations & Booking Link Stack */}
                <div className="space-y-6 flex flex-col">

                    {/* Control Center (New "Luxe Studio" Card) */}
                    <div className="glass-card p-6 flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {salon.name.substring(0, 1)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{salon.name}</h3>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${salon.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                        {salon.status === 'approved' ? 'Online' : 'Pending'}
                                    </div>
                                </div>
                            </div>
                            <Link href="/dashboard/provider/profile/edit">
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>

                        {/* Today's Snapshot */}
                        <div className="bg-muted/30 rounded-xl p-4 mb-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Today's Bookings</span>
                                <span className="font-bold">{allBookings.filter(b => isSameDay(new Date(b.date), new Date())).length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pending Requests</span>
                                <span className="font-bold text-yellow-600">{pendingBookings.length}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <Link href="/dashboard/provider/bookings" className="w-full">
                                <Button variant="outline" className="w-full justify-start h-auto py-3 px-3 border-dashed hover:border-primary/50 hover:bg-primary/5">
                                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                                    <div className="text-left">
                                        <div className="text-xs font-semibold">Calendar</div>
                                        <div className="text-[10px] text-muted-foreground">View schedule</div>
                                    </div>
                                </Button>
                            </Link>
                            <Link href="/dashboard/provider/services" className="w-full">
                                <Button variant="outline" className="w-full justify-start h-auto py-3 px-3 border-dashed hover:border-primary/50 hover:bg-primary/5">
                                    <Plus className="w-4 h-4 mr-2 text-primary" />
                                    <div className="text-left">
                                        <div className="text-xs font-semibold">Add Service</div>
                                        <div className="text-[10px] text-muted-foreground">Expand menu</div>
                                    </div>
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Improved Booking Link Card */}
                    <div>
                        {salon.status === 'approved' && (
                            <BookingLinkCard salonId={salon._id} salonName={salon.name} />
                        )}
                    </div>
                </div>
            </div>

            {/* 5. Pending Approvals (Kept mostly same but cleaner) */}
            {pendingBookings.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            Needs Attention
                            <Badge variant="destructive" className="ml-1 rounded-full px-2">{pendingBookings.length}</Badge>
                        </h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingBookings.map((booking) => (
                            <div key={booking._id} className="bg-background border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                                <div className="flex justify-between items-start mb-3 pl-2">
                                    <div>
                                        <p className="font-bold text-sm truncate">{booking.service?.name || "Service"}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <Users className="w-3 h-3" /> {booking.user?.name || booking.customerName || "Customer"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-xs bg-muted px-2 py-1 rounded">{booking.time}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(booking.date), 'MMM d')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pl-2">
                                    <Button size="sm" className="h-8 text-xs flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleBookingAction(booking._id, 'approve')}>
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 text-xs flex-1 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" onClick={() => handleBookingAction(booking._id, 'reject')}>
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

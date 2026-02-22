"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, CalendarCheck, DollarSign } from "lucide-react";

export function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [timeRange, setTimeRange] = useState("30"); // days

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Calculate Dates
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - parseInt(timeRange));

            const res = await api.get('/analytics/provider', {
                params: {
                    startDate: start.toISOString(),
                    endDate: end.toISOString()
                }
            });
            setData(res.data);
        } catch (error) {
            console.error("Failed to fetch analytics", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) return null;

    const { stats, charts } = data;

    // Formatting currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500 p-4 md:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight">Analytics</h2>
                    <p className="text-muted-foreground text-xs md:text-sm">Track growth & efficiency</p>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-full sm:w-[140px] md:w-[180px] h-8 md:h-10 text-xs md:text-sm">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 Days</SelectItem>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="90">Last 3 Months</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stat Cards - 2x2 on mobile, 4 across on desktop */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <Card className="glass-card border-none bg-secondary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                        <CardTitle className="text-xs md:text-sm font-medium">Revenue</CardTitle>
                        <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0">
                        <div className="text-lg md:text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">This period</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-none bg-secondary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                        <CardTitle className="text-xs md:text-sm font-medium">Bookings</CardTitle>
                        <CalendarCheck className="h-3 w-3 md:h-4 md:w-4 text-neutral-500" />
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0">
                        <div className="text-lg md:text-2xl font-bold">{stats.totalBookings}</div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">{stats.completedBookings} Done</p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-none bg-secondary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                        <CardTitle className="text-xs md:text-sm font-medium">Top Staff</CardTitle>
                        <Users className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0">
                        <div className="text-base md:text-2xl font-bold truncate">
                            {charts.staffStats[0]?.name || "N/A"}
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                            {charts.staffStats[0] ? formatCurrency(charts.staffStats[0].revenue) : "No data"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="glass-card border-none bg-secondary/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                        <CardTitle className="text-xs md:text-sm font-medium">Cancelled</CardTitle>
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0">
                        <div className="text-lg md:text-2xl font-bold">
                            {stats.totalBookings > 0
                                ? Math.round((stats.cancelledBookings / stats.totalBookings) * 100)
                                : 0}%
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground">{stats.cancelledBookings} Total</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section - Stack on mobile, side by side on desktop */}
            <div className="grid gap-3 md:gap-4 lg:grid-cols-7">

                {/* Revenue Overview (Bar Chart) */}
                <Card className="lg:col-span-4 glass-card">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-sm md:text-base">Daily Revenue</CardTitle>
                        <CardDescription className="text-xs">Revenue over selected period</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 md:pl-2 md:pr-4">
                        <div className="h-[200px] md:h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={charts.dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric' })}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `₹${value}`}
                                        width={45}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                        labelStyle={{ color: '#aaa' }}
                                    />
                                    <Bar dataKey="revenue" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Staff Performance */}
                <Card className="lg:col-span-3 glass-card">
                    <CardHeader className="p-3 md:p-6">
                        <CardTitle className="text-sm md:text-base">Staff Performance</CardTitle>
                        <CardDescription className="text-xs">Revenue by staff</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6 pt-0">
                        <div className="space-y-3 md:space-y-4">
                            {charts.staffStats.map((staff: any, index: number) => (
                                <div key={index} className="flex items-center">
                                    <div className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center font-bold text-xs mr-4">
                                        {staff.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">{staff.name}</p>
                                        <p className="text-xs text-muted-foreground">{staff.bookings} Bookings</p>
                                    </div>
                                    <div className="font-bold">
                                        {formatCurrency(staff.revenue)}
                                    </div>
                                </div>
                            ))}
                            {charts.staffStats.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">No staff data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

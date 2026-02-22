"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
    CreditCard,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    CheckCircle,
    Clock,
    RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Payment {
    _id: string;
    type: 'subscription' | 'booking' | 'refund';
    amount: number;
    currency: string;
    status: string;
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    payer?: {
        name: string;
        email: string;
    };
    createdAt: string;
}

interface SubscriptionStats {
    active?: number;
    cancelled?: number;
    pending?: number;
    halted?: number;
    created?: number;
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<SubscriptionStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'subscription' | 'booking' | 'refund'>('all');

    const fetchData = async () => {
        try {
            setRefreshing(true);
            const [paymentsRes, subsRes] = await Promise.all([
                api.get('/payments/admin/all', { params: { type: filter === 'all' ? undefined : filter } }),
                api.get('/payments/admin/subscriptions')
            ]);
            setPayments(paymentsRes.data.payments || []);
            setStats(subsRes.data.stats || {});
        } catch (error) {
            console.error("Failed to fetch payment data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
            captured: { variant: "default", icon: CheckCircle },
            active: { variant: "default", icon: CheckCircle },
            created: { variant: "secondary", icon: Clock },
            pending: { variant: "secondary", icon: Clock },
            failed: { variant: "destructive", icon: AlertCircle },
            halted: { variant: "destructive", icon: AlertCircle },
            refunded: { variant: "outline", icon: RefreshCw },
            cancelled: { variant: "outline", icon: AlertCircle }
        };

        const config = statusConfig[status] || { variant: "secondary" as const, icon: Clock };
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {status}
            </Badge>
        );
    };

    const getTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            subscription: "bg-purple-100 text-purple-800",
            booking: "bg-blue-100 text-blue-800",
            refund: "bg-orange-100 text-orange-800"
        };

        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || 'bg-gray-100'}`}>
                {type}
            </span>
        );
    };

    const formatAmount = (amount: number, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount / 100);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Payment Monitoring</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Subscription Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Active Subscriptions</h3>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{stats?.active || 0}</div>
                    <p className="text-xs text-muted-foreground">Currently billing</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
                    <p className="text-xs text-muted-foreground">Awaiting payment</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Halted</h3>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="text-2xl font-bold text-red-600">{stats?.halted || 0}</div>
                    <p className="text-xs text-muted-foreground">Payment failed</p>
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Cancelled</h3>
                        <TrendingDown className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-600">{stats?.cancelled || 0}</div>
                    <p className="text-xs text-muted-foreground">User cancelled</p>
                </div>
            </div>

            {/* Payments Table */}
            <div className="glass-card">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Recent Payments</h3>
                    <div className="flex gap-2">
                        {(['all', 'subscription', 'booking', 'refund'] as const).map((type) => (
                            <Button
                                key={type}
                                variant={filter === type ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilter(type)}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Payer</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Payment ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment._id} className="hover:bg-muted/50">
                                        <td className="px-4 py-3">{getTypeBadge(payment.type)}</td>
                                        <td className="px-4 py-3 font-medium">
                                            {payment.type === 'refund' ? '-' : ''}
                                            {formatAmount(payment.amount, payment.currency)}
                                        </td>
                                        <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm">{payment.payer?.name || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{payment.payer?.email || ''}</div>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                            {payment.razorpay_payment_id?.slice(0, 16) || payment.razorpay_order_id?.slice(0, 16) || '—'}...
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {formatDate(payment.createdAt)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminProvidersPage() {
    const [salons, setSalons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');

    const fetchSalons = async (status: string) => {
        setLoading(true);
        setStatusFilter(status);
        try {
            const { data } = await api.get(`/admin/salons?status=${status === 'all' ? '' : status}`);
            setSalons(data);
        } catch (error) {
            console.error("Failed to fetch salons", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalons('pending');
    }, []);

    const handleAction = async (id: string, newStatus: 'approved' | 'rejected') => {
        if (!confirm(`Are you sure you want to mark this salon as ${newStatus}?`)) return;

        try {
            await api.put(`/admin/salons/${id}/status`, { status: newStatus });
            // Refresh list or remove
            fetchSalons(statusFilter);
        } catch (error) {
            alert("Action failed");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Manage Providers</h2>
            </div>

            <Tabs defaultValue="pending" className="space-y-4" onValueChange={(val) => fetchSalons(val)}>
                <TabsList>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                    {loading ? (
                        <div>Loading...</div>
                    ) : salons.length === 0 ? (
                        <div className="text-muted-foreground p-4 text-center">No providers found in this category.</div>
                    ) : (
                        salons.map((salon) => (
                            <div key={salon._id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold">{salon.name}</h3>
                                        <Badge variant={
                                            salon.status === 'approved' ? 'default' :
                                                salon.status === 'rejected' ? 'destructive' : 'outline'
                                        }>
                                            {salon.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{salon.address}, {salon.city}</p>
                                    <p className="text-xs mt-1 text-muted-foreground">Owner: {salon.owner?.name} ({salon.owner?.email})</p>

                                    {/* Subscription Badge */}
                                    <div className="flex gap-2 mt-2">
                                        <Badge variant="secondary" className="text-xs uppercase">
                                            {salon.subscription?.plan || 'Free'} Plan
                                        </Badge>
                                        {salon.subscription?.status === 'expired' && (
                                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                                        )}
                                        {salon.subscription?.endDate && (
                                            <span className="text-xs text-muted-foreground self-center">
                                                Expires: {new Date(salon.subscription.endDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {/* Show Approve button if not already approved */}
                                    {salon.status !== 'approved' && (
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction(salon._id, 'approved')}>
                                            <Check className="w-4 h-4 mr-1" /> Approve
                                        </Button>
                                    )}

                                    {/* Show Reject button if not already rejected */}
                                    {salon.status !== 'rejected' && (
                                        <Button size="sm" variant="destructive" onClick={() => handleAction(salon._id, 'rejected')}>
                                            <X className="w-4 h-4 mr-1" /> Reject
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Tabs>
        </div>
    );
}

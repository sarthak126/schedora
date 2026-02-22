"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Calendar, Clock, User, Phone, Scissors, Badge as BadgeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function StaffDashboardPage() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Get staff profile from localStorage
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            setStaff(user);

            // Fetch appointments
            const { data } = await api.get("/staff/me/appointments");
            setAppointments(data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            setStatusUpdating(true);
            await api.put("/staff/me/status", { availabilityStatus: newStatus });

            // Update local state
            const updatedUser = { ...staff, availabilityStatus: newStatus };
            setStaff(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));

            alert("Status updated successfully!");
        } catch (error: any) {
            console.error("Failed to update status", error);
            alert(error.response?.data?.message || "Failed to update status");
        } finally {
            setStatusUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'on-break': return 'bg-yellow-500';
            case 'on-leave': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return '🟢 Active';
            case 'on-break': return '🟡 On Break';
            case 'on-leave': return '🔴 On Leave';
            default: return 'Unknown';
        }
    };

    const todayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        const today = new Date();
        const isToday = aptDate.toDateString() === today.toDateString();
        const isActive = ['pending', 'confirmed', 'in-progress'].includes(apt.status);
        return isToday && isActive;
    });

    const upcomingAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        aptDate.setHours(0, 0, 0, 0);
        const isActive = ['pending', 'confirmed', 'in-progress'].includes(apt.status);
        return aptDate > today && isActive;
    });

    const historyAppointments = appointments.filter(apt => {
        return ['completed', 'cancelled', 'no-show'].includes(apt.status);
    }).slice(0, 10); // Show last 10 history items

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Welcome, {staff?.name || "Staff"}!</h1>
                        <p className="text-muted-foreground mt-1">{staff?.role || "Staff Member"}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground">Your Status</div>
                            <Select
                                value={staff?.availabilityStatus || "active"}
                                onValueChange={handleStatusChange}
                                disabled={statusUpdating}
                            >
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span>Active</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="on-break">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                            <span>On Break</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="on-leave">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span>On Leave</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Appointments */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">Today's Appointments ({todayAppointments.length})</h2>
                {todayAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No appointments for today</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todayAppointments.map((appointment) => (
                            <AppointmentCard
                                key={appointment._id}
                                appointment={appointment}
                                onStatusUpdate={fetchData}
                                currentStaffId={staff?._id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Upcoming Appointments */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">Upcoming Appointments ({upcomingAppointments.length})</h2>
                {upcomingAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No upcoming appointments</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {upcomingAppointments.map((appointment) => (
                            <AppointmentCard
                                key={appointment._id}
                                appointment={appointment}
                                onStatusUpdate={fetchData}
                                currentStaffId={staff?._id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* History */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">History ({historyAppointments.length})</h2>
                {historyAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No appointment history</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {historyAppointments.map((appointment) => (
                            <AppointmentCard
                                key={appointment._id}
                                appointment={appointment}
                                onStatusUpdate={fetchData}
                                currentStaffId={staff?._id}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AppointmentCard({ appointment, onStatusUpdate, currentStaffId }: { appointment: any; onStatusUpdate?: () => void; currentStaffId?: string }) {
    const [updating, setUpdating] = useState(false);

    const getStatusBadge = (status: string) => {
        const variants: any = {
            'pending': 'secondary',
            'confirmed': 'default',
            'in-progress': 'default',
            'completed': 'outline',
            'cancelled': 'destructive',
            'no-show': 'destructive',
        };
        return variants[status] || 'secondary';
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            setUpdating(true);
            await api.put(`/bookings/${appointment._id}/status`, { status: newStatus });
            alert(`Appointment marked as ${newStatus}!`);
            if (onStatusUpdate) onStatusUpdate();
        } catch (error: any) {
            console.error("Failed to update status", error);
            alert(error.response?.data?.message || "Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const canStart = ['confirmed', 'pending'].includes(appointment.status);
    const canComplete = ['confirmed', 'in-progress', 'pending'].includes(appointment.status);
    const canNoShow = ['confirmed', 'in-progress', 'pending'].includes(appointment.status);

    // Check if this appointment is unclaimed (available to claim)
    const isUnclaimed = !appointment.staff || (appointment.staff && appointment.staff._id !== currentStaffId);
    const isAvailable = !appointment.staff;

    return (
        <div className={`border rounded-lg p-4 hover:bg-white/5 transition-colors ${isAvailable ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/10'
            }`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                    {/* Time and Service */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Clock className="w-5 h-5 text-primary" />
                            <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-muted-foreground" />
                            <span>{appointment.service?.name || "Unknown Service"}</span>
                        </div>
                        <Badge variant={getStatusBadge(appointment.status)}>
                            {appointment.status}
                        </Badge>
                        {appointment.type && (
                            <Badge variant="outline">
                                {appointment.type === 'online' ? '🌐 Online' : '🚶 Walk-in'}
                            </Badge>
                        )}
                        {isAvailable && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                                ⚡ Available to Claim
                            </Badge>
                        )}
                        {appointment.staff && appointment.staff._id !== currentStaffId && (
                            <Badge variant="outline" className="border-neutral-500 text-neutral-500">
                                👤 {appointment.staff.name}
                            </Badge>
                        )}
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>{appointment.customerName || appointment.user?.name || "Guest"}</span>
                        </div>
                        {(appointment.customerPhone || appointment.user?.phone) && (
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{appointment.customerPhone || appointment.user?.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <BadgeIcon className="w-4 h-4" />
                            <span>₹{appointment.price || appointment.service?.price || 0}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{appointment.service?.duration || 0} mins</span>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        {format(new Date(appointment.date), 'PPP')}
                    </div>
                </div>

                {/* Action Buttons */}
                {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                    <div className="flex flex-col gap-2">
                        {canStart && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange('in-progress')}
                                disabled={updating}
                                className="w-24"
                            >
                                {isAvailable ? 'Claim & Start' : 'Start'}
                            </Button>
                        )}
                        {canComplete && (
                            <Button
                                size="sm"
                                onClick={() => handleStatusChange('completed')}
                                disabled={updating}
                                className="w-24"
                            >
                                Complete
                            </Button>
                        )}
                        {canNoShow && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleStatusChange('no-show')}
                                disabled={updating}
                                className="w-24"
                            >
                                No-show
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

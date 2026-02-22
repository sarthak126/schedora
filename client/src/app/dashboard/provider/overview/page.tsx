"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, Scissors, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ProviderOverviewPage() {
    const [salon, setSalon] = useState<any>(null);
    const [staffStatus, setStaffStatus] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // Get salon
            const { data: salonData } = await api.get("/salons/me");
            setSalon(salonData);

            if (salonData) {
                // Get live staff status
                const { data: staffData } = await api.get(`/staff/salon/${salonData._id}/live-status`);
                setStaffStatus(staffData);

                // Get all appointments (providers get salon appointments via /bookings/my)
                const { data: appointmentsData } = await api.get("/bookings/my");
                setAppointments(appointmentsData);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (displayStatus: string) => {
        switch (displayStatus) {
            case 'busy': return 'bg-red-500';
            case 'active': return 'bg-green-500';
            case 'on-break': return 'bg-yellow-500';
            case 'on-leave': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (displayStatus: string) => {
        switch (displayStatus) {
            case 'busy': return '🔴 Busy';
            case 'active': return '🟢 Free';
            case 'on-break': return '🟡 On Break';
            case 'on-leave': return '⚫ On Leave';
            default: return 'Unknown';
        }
    };

    // Filter appointments by selected staff
    const filteredAppointments = selectedStaff
        ? appointments.filter(apt => apt.staff?._id === selectedStaff)
        : appointments;

    // Separate into active and history
    const activeAppointments = filteredAppointments.filter(apt =>
        ['pending', 'confirmed', 'in-progress'].includes(apt.status)
    );

    const historyAppointments = filteredAppointments.filter(apt =>
        ['completed', 'cancelled', 'no-show'].includes(apt.status)
    ).slice(0, 10);

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Appointments Overview</h1>
                        <p className="text-muted-foreground mt-1">Monitor staff and manage appointments</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Live Staff Status Panel */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">Live Staff Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {staffStatus.map((staff) => (
                        <div
                            key={staff._id}
                            onClick={() => setSelectedStaff(selectedStaff === staff._id ? null : staff._id)}
                            className={cn(
                                "border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
                                selectedStaff === staff._id ? "border-primary bg-primary/10" : "border-white/10"
                            )}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold">{staff.name}</h3>
                                    <p className="text-sm text-muted-foreground">{staff.role}</p>
                                </div>
                                <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    getStatusColor(staff.displayStatus)
                                )} title={getStatusLabel(staff.displayStatus)} />
                            </div>

                            <Badge variant={staff.displayStatus === 'busy' ? 'destructive' : 'outline'} className="mb-2">
                                {getStatusLabel(staff.displayStatus)}
                            </Badge>

                            {staff.currentAppointment && (
                                <div className="mt-3 p-2 bg-white/5 rounded text-xs space-y-1">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{staff.currentAppointment.time}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Scissors className="w-3 h-3" />
                                        <span>{staff.currentAppointment.service}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        <span>{staff.currentAppointment.customerName}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {selectedStaff && (
                    <div className="mt-4 text-sm text-muted-foreground">
                        Showing appointments for: <strong>{staffStatus.find(s => s._id === selectedStaff)?.name}</strong>
                        <button onClick={() => setSelectedStaff(null)} className="ml-2 text-primary hover:underline">
                            Clear filter
                        </button>
                    </div>
                )}
            </div>

            {/* Active Appointments */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">
                    Active Appointments ({activeAppointments.length})
                </h2>
                {activeAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No active appointments</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeAppointments.map((appointment) => (
                            <AppointmentCard key={appointment._id} appointment={appointment} />
                        ))}
                    </div>
                )}
            </div>

            {/* History */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">
                    Recent History ({historyAppointments.length})
                </h2>
                {historyAppointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No appointment history</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {historyAppointments.map((appointment) => (
                            <AppointmentCard key={appointment._id} appointment={appointment} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function AppointmentCard({ appointment }: { appointment: any }) {
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

    return (
        <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                    {/* Time and Service */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 font-semibold">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>{appointment.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Scissors className="w-4 h-4 text-muted-foreground" />
                            <span>{appointment.service?.name || "Unknown Service"}</span>
                        </div>
                        <Badge variant={getStatusBadge(appointment.status)}>
                            {appointment.status}
                        </Badge>
                    </div>

                    {/* Customer and Staff Info */}
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
                        {appointment.staff && (
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                    👤 {appointment.staff.name}
                                </Badge>
                            </div>
                        )}
                        {!appointment.staff && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                                ⚡ Unassigned
                            </Badge>
                        )}
                    </div>

                    {/* Date */}
                    <div className="text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 inline mr-2" />
                        {format(new Date(appointment.date), 'PPP')}
                    </div>
                </div>

                {/* Price */}
                <div className="text-right">
                    <div className="text-xl font-bold">₹{appointment.price}</div>
                    <div className="text-xs text-muted-foreground">{appointment.service?.duration || 0} mins</div>
                </div>
            </div>
        </div>
    );
}

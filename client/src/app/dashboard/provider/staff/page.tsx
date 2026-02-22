"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { AddStaffModal } from "@/components/staff/AddStaffModal";
import { AssignServicesModal } from "@/components/staff/AssignServicesModal";
import { ScheduleModal } from "@/components/staff/ScheduleModal";
import { StaffCard } from "@/components/staff/StaffCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function StaffManagementPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [salon, setSalon] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // New Pro State
    const [isPro, setIsPro] = useState(true);

    const fetchData = async () => {
        try {
            // Get provider's salon
            const { data: salonData } = await api.get("/salons/me");
            if (salonData) {
                setSalon(salonData);
                // Check if salon has 'pro' plan (mock check for now)
                if (salonData.subscriptionPlan === 'pro') {
                    setIsPro(true);
                }

                // Get staff for this salon
                const { data: staffData } = await api.get(`/staff/salon/${salonData._id}`);
                setStaff(staffData);
            }

            // Get services
            const { data: servicesData } = await api.get("/services");
            setServices(servicesData);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddStaff = () => {
        setIsAddModalOpen(true);
    };

    const handleAssignServices = (staffMember: any) => {
        setSelectedStaff(staffMember);
        setIsServicesModalOpen(true);
    };

    const handleEditSchedule = (staffMember: any) => {
        setSelectedStaff(staffMember);
        setIsScheduleModalOpen(true);
    };

    const handleDeleteStaff = async (staffId: string) => {
        if (!confirm("Are you sure you want to remove this staff member?")) return;

        try {
            await api.delete(`/staff/${staffId}`);
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Failed to delete staff", error);
            alert("Failed to remove staff member");
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 md:space-y-6 p-4 md:p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-9 w-28" />
                </div>
                <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 md:h-64" />)}
                </div>
            </div>
        );
    }

    if (!salon) {
        return (
            <div className="text-center py-12 p-4">
                <p className="text-muted-foreground text-sm md:text-base">Please create a salon first to manage staff</p>
            </div>
        );
    }

    if (!isPro) {
        return (
            <div className="space-y-4 md:space-y-6 relative min-h-[70vh] md:min-h-[80vh] p-4 md:p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-50 pointer-events-none select-none filter blur-sm">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                            Staff
                        </h1>
                        <p className="text-muted-foreground mt-1 text-xs md:text-sm">
                            Manage team members
                        </p>
                    </div>
                    <Button size="sm" className="text-xs md:text-sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Staff
                    </Button>
                </div>

                {/* Pro Lock Overlay */}
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 md:p-6 text-center">
                    <div className="bg-background/80 backdrop-blur-md border border-border/50 p-6 md:p-12 rounded-xl md:rounded-2xl shadow-xl max-w-lg w-full space-y-6 md:space-y-8 relative overflow-hidden">

                        <div className="w-14 h-14 md:w-20 md:h-20 bg-primary rounded-xl md:rounded-2xl flex items-center justify-center mx-auto shadow-lg rotate-3">
                            <Users className="w-7 h-7 md:w-10 md:h-10 text-primary-foreground" />
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold tracking-tight">
                                Upgrade to Schedora Pro
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Unlock advanced staff management, specific working hours, and multi-staff scheduling capabilities.
                            </p>
                        </div>

                        <ul className="text-sm space-y-4 text-left bg-secondary/50 p-6 rounded-xl border border-border/50">
                            <li className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="font-medium">Unlimited Staff Members</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="font-medium">Individual Staff Schedules</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="font-medium">Performance Analytics</span>
                            </li>
                        </ul>

                        <Button size="lg" className="w-full font-semibold shadow-md">
                            Get Pro Access
                        </Button>
                    </div>
                </div>

                {/* Blurred Content Background */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 opacity-20 pointer-events-none filter blur-md select-none">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-card rounded-xl border border-border/50" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 p-4 md:p-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                        Staff
                    </h1>
                    <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">
                        Manage team members
                    </p>
                </div>
                <Button onClick={handleAddStaff} size="sm" className="text-xs md:text-sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Staff
                </Button>
            </div>

            {staff.length === 0 ? (
                <div className="glass-card p-8 md:p-12 text-center">
                    <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto text-muted-foreground mb-3 md:mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2">No Staff Yet</h3>
                    <p className="text-muted-foreground mb-4 md:mb-6 text-sm">
                        Add your first team member
                    </p>
                    <Button onClick={handleAddStaff} size="sm" className="text-xs md:text-sm">
                        <Plus className="w-4 h-4 mr-1.5" />
                        Add Staff
                    </Button>
                </div>
            ) : (
                <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {staff.map((member) => (
                        <StaffCard
                            key={member._id}
                            staff={member}
                            onAssignServices={() => handleAssignServices(member)}
                            onEditSchedule={() => handleEditSchedule(member)}
                            onDelete={() => handleDeleteStaff(member._id)}
                        />
                    ))}
                </div>
            )}

            <AddStaffModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                salonId={salon?._id}
                onSuccess={fetchData}
            />

            {selectedStaff && (
                <>
                    <AssignServicesModal
                        open={isServicesModalOpen}
                        onOpenChange={setIsServicesModalOpen}
                        staff={selectedStaff}
                        services={services}
                        onSuccess={fetchData}
                    />

                    <ScheduleModal
                        open={isScheduleModalOpen}
                        onOpenChange={setIsScheduleModalOpen}
                        staff={selectedStaff}
                        onSuccess={fetchData}
                    />
                </>
            )}
        </div>
    );
}

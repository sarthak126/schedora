"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Scissors, Settings, Trash2, User } from "lucide-react";
import Image from "next/image";

interface StaffCardProps {
    staff: any;
    onAssignServices: () => void;
    onEditSchedule: () => void;
    onDelete: () => void;
}

export function StaffCard({ staff, onAssignServices, onEditSchedule, onDelete }: StaffCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500/20 text-green-400 border-green-500/50';
            case 'on-leave':
                return 'bg-red-500/20 text-red-400 border-red-500/50';
            case 'on-break':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
            default:
                return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active':
                return '🟢 Available';
            case 'on-leave':
                return '🔴 On Leave';
            case 'on-break':
                return '🟡 On Break';
            default:
                return '⚪ Inactive';
        }
    };

    return (
        <div className="glass-card p-6 space-y-4 hover:border-primary/50 transition-all group">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                    {staff.profilePhoto ? (
                        <Image
                            src={staff.profilePhoto}
                            alt={staff.name}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/20">
                            <User className="w-8 h-8 text-primary" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{staff.name}</h3>
                    <p className="text-sm text-muted-foreground">{staff.role}</p>
                    {staff.experience > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {staff.experience} {staff.experience === 1 ? 'year' : 'years'} exp.
                        </p>
                    )}
                </div>

                <Badge className={getStatusColor(staff.availabilityStatus)}>
                    {getStatusLabel(staff.availabilityStatus)}
                </Badge>
            </div>

            {/* Services */}
            <div>
                <div className="text-xs text-muted-foreground mb-2">Services Offered:</div>
                <div className="flex flex-wrap gap-1.5">
                    {staff.servicesOffered && staff.servicesOffered.length > 0 ? (
                        staff.servicesOffered.map((service: any) => (
                            <Badge key={service._id} variant="outline" className="text-xs">
                                {service.name}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground italic">No services assigned</span>
                    )}
                </div>
            </div>

            {/* Working Days */}
            <div>
                <div className="text-xs text-muted-foreground mb-1">Working Days:</div>
                <div className="text-sm">
                    {staff.workingDays && staff.workingDays.length > 0 ? (
                        <span>{staff.workingDays.join(', ')}</span>
                    ) : (
                        <span className="italic text-muted-foreground">Not set</span>
                    )}
                </div>
            </div>

            {/* Working Hours */}
            {staff.workingHours && (
                <div className="text-sm">
                    <span className="text-muted-foreground">Hours: </span>
                    <span className="font-medium">
                        {staff.workingHours.start} - {staff.workingHours.end}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAssignServices}
                    className="flex-1"
                >
                    <Scissors className="w-3 h-3 mr-1" />
                    Services
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditSchedule}
                    className="flex-1"
                >
                    <Calendar className="w-3 h-3 mr-1" />
                    Schedule
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

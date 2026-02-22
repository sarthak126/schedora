"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Star, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Staff {
    _id: string;
    name: string;
    role: string;
    experience: number;
    profilePhoto?: string;
    servicesOffered: any[];
}

interface StaffSelectorProps {
    staff: Staff[];
    selectedStaffId: string | null;
    onSelectStaff: (staffId: string | null) => void;
    loading?: boolean;
}

export function StaffSelector({ staff, selectedStaffId, onSelectStaff, loading }: StaffSelectorProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (staff.length === 0) {
        return (
            <div className="text-center py-8">
                <User className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No staff available for this service</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
            {/* Any Available Option */}
            <button
                onClick={() => onSelectStaff(null)}
                className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    selectedStaffId === null
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Star className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="font-semibold">Any Available Staff</div>
                        <div className="text-sm text-muted-foreground">System will assign automatically</div>
                    </div>
                    {selectedStaffId === null && (
                        <div className="flex-shrink-0">
                            <Badge>Selected</Badge>
                        </div>
                    )}
                </div>
            </button>

            {/* Individual Staff */}
            {staff.map((member) => (
                <button
                    key={member._id}
                    onClick={() => onSelectStaff(member._id)}
                    className={cn(
                        "w-full p-4 rounded-lg border-2 transition-all text-left",
                        selectedStaffId === member._id
                            ? "border-primary bg-primary/10"
                            : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                            {member.profilePhoto ? (
                                <Image
                                    src={member.profilePhoto}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/20">
                                    <User className="w-6 h-6 text-primary" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-semibold">{member.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <span>{member.role}</span>
                                {member.experience > 0 && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Briefcase className="w-3 h-3" />
                                            {member.experience} yrs
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        {selectedStaffId === member._id && (
                            <div className="flex-shrink-0">
                                <Badge>Selected</Badge>
                            </div>
                        )}
                    </div>
                </button>
            ))}
        </div>
    );
}

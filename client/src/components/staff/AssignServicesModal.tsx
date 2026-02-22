"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { Scissors } from "lucide-react";

interface AssignServicesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: any;
    services: any[];
    onSuccess: () => void;
}

export function AssignServicesModal({ open, onOpenChange, staff, services, onSuccess }: AssignServicesModalProps) {
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (staff?.servicesOffered) {
            setSelectedServices(staff.servicesOffered.map((s: any) => s._id));
        }
    }, [staff]);

    const handleToggleService = (serviceId: string) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.put(`/staff/${staff._id}`, {
                servicesOffered: selectedServices
            });
            alert("Services assigned successfully!");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to assign services", error);
            alert("Failed to assign services");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Assign Services to {staff?.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Select the services this staff member can provide
                    </p>

                    {services.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-8">
                            No services available. Please create services first.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {services.map((service) => (
                                <div
                                    key={service._id}
                                    className="flex items-start space-x-3 p-3 rounded-lg border border-white/10 hover:border-primary/50 transition-colors"
                                >
                                    <Checkbox
                                        id={service._id}
                                        checked={selectedServices.includes(service._id)}
                                        onCheckedChange={() => handleToggleService(service._id)}
                                    />
                                    <div className="flex-1">
                                        <Label
                                            htmlFor={service._id}
                                            className="font-medium cursor-pointer flex items-center gap-2"
                                        >
                                            <Scissors className="w-4 h-4 text-primary" />
                                            {service.name}
                                        </Label>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            ₹{service.price} • {service.duration} mins
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || services.length === 0}
                            className="flex-1"
                        >
                            {loading ? "Saving..." : "Save Services"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

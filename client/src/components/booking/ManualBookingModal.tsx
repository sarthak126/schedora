"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import api from "@/lib/api";

interface ManualBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialDate?: Date;
    initialTime?: string;
    services: any[];
}

export function ManualBookingModal({ isOpen, onClose, onSuccess, initialDate, initialTime, services, salonId }: ManualBookingModalProps & { salonId: string }) {
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        customerName: "",
        customerPhone: "",
        serviceId: "",
        staffId: "any", // Default to 'any' which means 'no specific staff selected'
        date: initialDate ? initialDate.toISOString().split('T')[0] : "",
        time: initialTime || ""
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                date: initialDate ? initialDate.toISOString().split('T')[0] : prev.date,
                time: initialTime || prev.time
            }));
        }
    }, [isOpen, initialDate, initialTime]);

    // Fetch staff when salonId is available
    useEffect(() => {
        const fetchStaff = async () => {
            if (!salonId) return;
            try {
                const res = await api.get(`/staff/salon/${salonId}`);
                setStaffList(res.data);
            } catch (error) {
                console.error("Failed to fetch staff", error);
            }
        };
        fetchStaff();
    }, [salonId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Only send staffId if it's not "any"
            const payload = { ...formData };
            if (payload.staffId === "any") {
                delete (payload as any).staffId;
            }

            await api.post("/bookings/manual", payload);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Manual booking failed", error);
            alert(error.response?.data?.message || "Failed to create booking");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Walk-in Booking</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerName">Customer Name</Label>
                            <Input
                                id="customerName"
                                placeholder="Walk-in Customer"
                                value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customerPhone">Phone Number</Label>
                            <Input
                                id="customerPhone"
                                placeholder="9876543210"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Service</Label>
                            <Select
                                value={formData.serviceId}
                                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a service" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map((service) => (
                                        <SelectItem key={service._id} value={service._id}>
                                            {service.name} (₹{service.price}) - {service.duration} mins
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Staff Member</Label>
                            <Select
                                value={formData.staffId}
                                onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any Available</SelectItem>
                                    {staffList.map((staff) => (
                                        <SelectItem key={staff._id} value={staff._id}>
                                            {staff.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time Slot</Label>
                            <Input
                                type="time"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={loading || !formData.serviceId} className="bg-primary">
                            {loading ? "Booking..." : "Confirm Booking"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { User, Mail, Phone, Briefcase, Lock } from "lucide-react";

interface AddStaffModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    salonId: string;
    onSuccess: () => void;
}

const STAFF_ROLES = [
    'Hair Stylist',
    'Barber',
    'Beautician',
    'Makeup Artist',
    'Nail Technician',
    'Massage Therapist',
    'Other'
];

export function AddStaffModal({ open, onOpenChange, salonId, onSuccess }: AddStaffModalProps) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        role: "",
        experience: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name || !form.email || !form.phone || !form.role) {
            alert("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            await api.post("/staff", {
                ...form,
                salonId,
                experience: form.experience ? parseInt(form.experience) : 0,
                password: form.password || undefined // Backend will generate if empty
            });

            alert("Staff member added successfully!");
            setForm({ name: "", email: "", phone: "", role: "", experience: "", password: "" });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to add staff", error);
            alert(error.response?.data?.message || "Failed to add staff member");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="name"
                                placeholder="Enter full name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="staff@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="pl-10"
                                required
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Used for staff login</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="Enter phone number"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {STAFF_ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="experience">Experience (years)</Label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="experience"
                                type="number"
                                min="0"
                                placeholder="Years of experience"
                                value={form.experience}
                                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password (optional)</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="Auto-generate if empty"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="pl-10"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Leave empty to auto-generate (default: staff123)
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading ? "Adding..." : "Add Staff"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

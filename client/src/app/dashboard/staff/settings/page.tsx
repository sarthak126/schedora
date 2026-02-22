"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Briefcase, Lock, Calendar } from "lucide-react";

export default function StaffSettingsPage() {
    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        fetchStaffData();
    }, []);

    const fetchStaffData = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem("user") || "{}");

            // Fetch full staff details
            const { data } = await api.get(`/staff/${user._id}`);
            setStaff(data);
        } catch (error) {
            console.error("Failed to fetch staff data", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        try {
            setUpdating(true);
            await api.put("/staff/me/password", {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            alert("Password updated successfully!");
            setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        } catch (error: any) {
            console.error("Failed to update password", error);
            alert(error.response?.data?.message || "Failed to update password");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="glass-card p-6">
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
            </div>

            {/* Profile Information */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Name
                        </Label>
                        <Input
                            value={staff?.name || ""}
                            disabled
                            className="bg-white/5"
                        />
                        <p className="text-xs text-muted-foreground">Contact your manager to update your name</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email
                        </Label>
                        <Input
                            value={staff?.email || ""}
                            disabled
                            className="bg-white/5"
                        />
                        <p className="text-xs text-muted-foreground">Login email (cannot be changed)</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Phone
                        </Label>
                        <Input
                            value={staff?.phone || ""}
                            disabled
                            className="bg-white/5"
                        />
                        <p className="text-xs text-muted-foreground">Contact your manager to update</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Role
                        </Label>
                        <Input
                            value={staff?.role || ""}
                            disabled
                            className="bg-white/5"
                        />
                    </div>
                </div>
            </div>

            {/* Services */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4">Your Services</h2>
                {staff?.services && staff.services.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {staff.services.map((service: any) => (
                            <Badge key={service._id} variant="outline" className="px-4 py-2 text-sm">
                                {service.name} - ₹{service.price} ({service.duration}min)
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No services assigned yet. Contact your manager.</p>
                )}
            </div>

            {/* Availability */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-6 h-6" />
                    Availability Status
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">Current Status</p>
                        <Badge
                            variant={staff?.availabilityStatus === 'active' ? 'default' : 'destructive'}
                            className="text-base px-4 py-2"
                        >
                            {staff?.availabilityStatus === 'active' ? '🟢 Active' :
                                staff?.availabilityStatus === 'on-break' ? '🟡 On Break' : '🔴 On Leave'}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Change your status from the main dashboard
                    </p>
                </div>
            </div>

            {/* Change Password */}
            <div className="glass-card p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Lock className="w-6 h-6" />
                    Change Password
                </h2>
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            required
                            minLength={6}
                        />
                    </div>

                    <Button type="submit" disabled={updating}>
                        {updating ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </div>
        </div>
    );
}

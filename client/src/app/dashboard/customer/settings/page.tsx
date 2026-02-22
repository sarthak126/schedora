"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import api from "@/lib/api";

export default function CustomerSettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data } = await api.get("/auth/me");
                setUser(data);
                setFormData({
                    name: data.name || "",
                    email: data.email || "",
                    phone: data.phone || ""
                });
            } catch (error) {
                console.error("Failed to fetch user data", error);
                // Fallback to localStorage
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    try {
                        const parsed = JSON.parse(storedUser);
                        setUser(parsed);
                        setFormData({
                            name: parsed.name || "",
                            email: parsed.email || "",
                            phone: parsed.phone || ""
                        });
                    } catch (e) {
                        console.error("Failed to parse user", e);
                    }
                }
            }
        };
        fetchUserData();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put("/auth/updatedetails", formData);
            // Update localStorage
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({
                ...storedUser,
                name: data.name,
                email: data.email,
                phone: data.phone
            }));
            setUser(data);
            alert("Profile updated successfully!");
        } catch (error: any) {
            console.error("Failed to update profile", error);
            alert(error.response?.data?.message || "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth-change'));
        router.push('/auth/login');
    };

    return (
        <div className="space-y-6">
            {user && (
                <div className="md:hidden flex flex-col items-center justify-center py-4 px-6 bg-secondary/10 rounded-xl mb-2 text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                        <span className="text-xl font-bold text-primary">{user.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <h2 className="text-lg font-bold">{user.name}</h2>
                    <p className="text-xs text-muted-foreground">Customer Account</p>
                </div>
            )}

            <div>
                <h3 className="text-2xl font-bold tracking-tight">Settings</h3>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            {/* Profile Section */}
            <div className="glass-card p-6 space-y-4 max-w-xl">
                <h4 className="text-lg font-semibold">Profile Information</h4>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="+91 9876543210"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Salons can contact you via this number for booking updates</p>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                    </Button>
                </form>
            </div>

            {/* Account Actions */}
            <div className="glass-card p-6 space-y-4 max-w-xl">
                <h4 className="text-lg font-semibold text-destructive">Danger Zone</h4>
                <div className="flex flex-col gap-4">
                    <Button variant="outline" className="justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full md:w-auto" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                    </Button>
                </div>
            </div>
        </div>
    )
}

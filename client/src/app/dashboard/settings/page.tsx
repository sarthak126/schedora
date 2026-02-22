"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            </div>

            <div className="glass-card p-6 space-y-4">
                <h3 className="text-xl font-semibold">Account Settings</h3>
                <p className="text-muted-foreground">Manage your account credentials and preferences.</p>

                <div className="grid gap-4 max-w-xl">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email Address</label>
                        <Input disabled value="user@example.com" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Change Password</label>
                        <Input type="password" placeholder="New Password" />
                    </div>

                    <Button>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}

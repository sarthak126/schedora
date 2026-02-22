"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { Clock } from "lucide-react";

interface ScheduleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staff: any;
    onSuccess: () => void;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function ScheduleModal({ open, onOpenChange, staff, onSuccess }: ScheduleModalProps) {
    const [workingDays, setWorkingDays] = useState<string[]>([]);
    const [workingHours, setWorkingHours] = useState({ start: "09:00", end: "18:00" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (staff) {
            setWorkingDays(staff.workingDays || []);
            setWorkingHours(staff.workingHours || { start: "09:00", end: "18:00" });
        }
    }, [staff]);

    const handleToggleDay = (day: string) => {
        setWorkingDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const handleSubmit = async () => {
        if (workingDays.length === 0) {
            alert("Please select at least one working day");
            return;
        }

        setLoading(true);
        try {
            await api.put(`/staff/${staff._id}`, {
                workingDays,
                workingHours
            });
            alert("Schedule updated successfully!");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update schedule", error);
            alert("Failed to update schedule");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Schedule for {staff?.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Working Days */}
                    <div className="space-y-3">
                        <Label>Working Days</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {DAYS_OF_WEEK.map((day) => (
                                <div key={day} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={day}
                                        checked={workingDays.includes(day)}
                                        onCheckedChange={() => handleToggleDay(day)}
                                    />
                                    <Label htmlFor={day} className="cursor-pointer font-normal">
                                        {day}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Working Hours */}
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Working Hours
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start-time" className="text-xs text-muted-foreground">
                                    Start Time
                                </Label>
                                <Input
                                    id="start-time"
                                    type="time"
                                    value={workingHours.start}
                                    onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-time" className="text-xs text-muted-foreground">
                                    End Time
                                </Label>
                                <Input
                                    id="end-time"
                                    type="time"
                                    value={workingHours.end}
                                    onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                            {loading ? "Saving..." : "Save Schedule"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

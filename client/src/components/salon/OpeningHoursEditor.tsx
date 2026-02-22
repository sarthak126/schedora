"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface DaySchedule {
    isOpen: boolean;
    open: string;
    close: string;
}

interface OpeningHoursByType {
    [key: string]: { open: string; close: string; isOpen?: boolean }; // Backend structure might simplify this
}

interface OpeningHoursEditorProps {
    initialData?: any;
    onChange: (data: any) => void;
}

const DAYS = [
    { key: "mon", label: "Monday" },
    { key: "tue", label: "Tuesday" },
    { key: "wed", label: "Wednesday" },
    { key: "thu", label: "Thursday" },
    { key: "fri", label: "Friday" },
    { key: "sat", label: "Saturday" },
    { key: "sun", label: "Sunday" },
];

export function OpeningHoursEditor({ initialData, onChange }: OpeningHoursEditorProps) {
    // Initialize state with default values or provided data
    const [schedule, setSchedule] = useState<{ [key: string]: DaySchedule }>(() => {
        const initialState: UsingAny = {};
        DAYS.forEach(day => {
            const existing = initialData?.[day.key];
            initialState[day.key] = {
                isOpen: existing ? (existing.open !== "" && existing.close !== "") : true,
                open: existing?.open || "09:00",
                close: existing?.close || "17:00"
            };
        });
        return initialState;
    });

    useEffect(() => {
        // Convert internal state back to backend format (open/close strings)
        // If closed, we might send empty strings or handle it in backend. 
        // For now, let's send what we have, but maybe clear time if closed?
        // Actually, keeping time is better UX so it remembers when re-enabled.

        const formattedData: any = {};
        Object.keys(schedule).forEach(key => {
            const day = schedule[key];
            if (day.isOpen) {
                formattedData[key] = { open: day.open, close: day.close };
            } else {
                formattedData[key] = { open: "", close: "" }; // Convention: empty string = closed
            }
        });
        onChange(formattedData);
    }, [schedule]);

    const updateDay = (dayKey: string, field: keyof DaySchedule, value: any) => {
        setSchedule(prev => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], [field]: value }
        }));
    };

    return (
        <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Opening Hours
            </h3>
            <div className="grid gap-3">
                {DAYS.map((day) => (
                    <div key={day.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-4 min-w-[140px]">
                            <Switch
                                checked={schedule[day.key].isOpen}
                                onCheckedChange={(checked) => updateDay(day.key, 'isOpen', checked)}
                            />
                            <Label className={!schedule[day.key].isOpen ? "text-muted-foreground" : ""}>
                                {day.label}
                            </Label>
                        </div>

                        {schedule[day.key].isOpen ? (
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={schedule[day.key].open}
                                        onChange={(e) => updateDay(day.key, 'open', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                                <span className="text-muted-foreground">-</span>
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={schedule[day.key].close}
                                        onChange={(e) => updateDay(day.key, 'close', e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic px-2">
                                Closed
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Helper type to avoid TS errors with dynamic keys in initial state
type UsingAny = any;

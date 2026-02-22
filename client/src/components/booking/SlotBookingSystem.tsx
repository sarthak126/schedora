"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { Calendar, Clock, CheckCircle2, XCircle, User, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { socket, connectSocket, disconnectSocket } from "@/lib/socket";

interface SlotBookingSystemProps {
    salonId: string;
    serviceId: string; // REQUIRED - backend needs it for capacity calculation
    staffId?: string | null;
    onSlotSelected: (date: Date, time: string) => void;
    selectedDate?: Date;
    selectedTime?: string;
    isProvider?: boolean;
    onBookedSlotClick?: (booking: any) => void;
}

type SlotStatus = 'available' | 'booked' | 'reserved' | 'unavailable';

interface TimeSlot {
    time: string;
    status: SlotStatus;
    booking?: {
        _id: string;
        type: 'online' | 'walk-in';
        customerName: string;
        customerPhone?: string;
        customerEmail?: string;
        service: { name: string; duration: number };
        price: number;
        status: string;
    };
}

export function SlotBookingSystem({
    salonId,
    serviceId,
    staffId,
    onSlotSelected,
    selectedDate: propSelectedDate,
    selectedTime: propSelectedTime,
    isProvider = false,
    onBookedSlotClick
}: SlotBookingSystemProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(propSelectedDate || new Date());
    const [selectedTime, setSelectedTime] = useState<string | null>(propSelectedTime || null);
    const [error, setError] = useState<string | null>(null);
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Fetch available slots
    const fetchSlots = useCallback(async () => {
        if (!selectedDate || !salonId || !serviceId) return;

        // Don't show loading spinner for background updates if we already have slots
        if (slots.length === 0) setLoading(true);
        setError(null);

        try {
            const params: any = {
                salonId,
                serviceId,
                date: selectedDate.toISOString()
            };

            if (staffId) params.staffId = staffId;

            const { data } = await api.get('/bookings/slots/available', { params });
            setSlots(data);
        } catch (error: any) {
            console.error('❌ Failed to fetch slots:', error);
            setError('Failed to load slots. Please check your connection.');
            setSlots([]);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, salonId, serviceId, staffId, slots.length]);

    // Initial fetch and socket setup
    useEffect(() => {
        if (!selectedDate || !salonId || !serviceId) {
            console.warn('⚠️ Missing required params:', { selectedDate, salonId, serviceId });
            return;
        }

        fetchSlots();

        // Connect to Socket.io
        connectSocket(salonId);

        const handleSlotUpdate = (data: any) => {
            if (data.salonId === salonId) {
                console.log('⚡ Real-time update received:', data);
                fetchSlots();
            }
        };

        socket.on('slot_booked', handleSlotUpdate);
        const interval = setInterval(fetchSlots, 30000);

        return () => {
            socket.off('slot_booked', handleSlotUpdate);
            clearInterval(interval);
        };
    }, [fetchSlots, salonId, selectedDate, serviceId]);

    const handleSlotClick = (slot: TimeSlot) => {
        const { time, status, booking } = slot;

        // If provider clicks booked slot, show booking details
        if (isProvider && status === 'booked' && booking && onBookedSlotClick) {
            onBookedSlotClick(booking);
            return;
        }

        // Otherwise, handle selection for available slots
        if (status !== 'available' && time !== selectedTime) return;

        const newTime = time === selectedTime ? null : time;
        setSelectedTime(newTime);
        if (newTime) {
            onSlotSelected(selectedDate, newTime);
        }
    };

    const getSlotAppearance = (slot: TimeSlot) => {
        const { time, status, booking } = slot;
        const isSelected = time === selectedTime;

        if (isSelected) {
            return {
                className: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
                icon: <CheckCircle2 className="w-3 h-3" />,
                label: time
            };
        }

        switch (status) {
            case 'booked':
                // For providers, show booking type and make clickable
                if (isProvider && booking) {
                    const isOnline = booking.type === 'online';
                    return {
                        className: cn(
                            "cursor-pointer border-2 hover:scale-105 transition-transform",
                            isOnline
                                ? "bg-neutral-500/20 text-neutral-200 border-neutral-500/50"
                                : "bg-purple-500/20 text-purple-200 border-purple-500/50"
                        ),
                        icon: <User className="w-3 h-3" />,
                        label: booking.customerName?.split(' ')[0] || 'Guest',
                        subLabel: isOnline ? 'Online' : 'Walk-in'
                    };
                }
                return {
                    className: "bg-muted text-muted-foreground cursor-not-allowed border-muted",
                    icon: <XCircle className="w-3 h-3" />,
                    disabled: true,
                    label: time
                };
            case 'unavailable':
                return {
                    className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed border-transparent line-through decoration-neutral-400/50",
                    icon: <Clock className="w-3 h-3 opacity-50" />,
                    disabled: true,
                    label: time
                };
            case 'reserved':
                return {
                    className: "bg-orange-500/20 text-orange-200 border-orange-500/50 cursor-not-allowed",
                    icon: <Clock className="w-3 h-3 animate-pulse" />,
                    disabled: true,
                    label: time
                };
            case 'available':
            default:
                return {
                    className: "bg-background hover:bg-accent hover:border-primary/50 border-white/10",
                    icon: null,
                    label: time
                };
        }
    };

    // Generate next 7 days for quick selection
    const quickDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

    return (
        <div className="space-y-4">
            {/* Date Selection */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-primary" />
                    Select Date
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {quickDates.map((date, index) => {
                        const isSelected = startOfDay(date).getTime() === startOfDay(selectedDate).getTime();
                        const isToday = index === 0;

                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => {
                                    setSelectedDate(date);
                                    setSelectedTime(null);
                                }}
                                className={cn(
                                    "flex flex-col items-center p-1.5 sm:p-2 rounded-lg border transition-all text-center",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background hover:bg-accent border-white/10 hover:border-primary/50"
                                )}
                            >
                                <span className="text-[10px] sm:text-xs font-medium truncate w-full">
                                    {isToday ? 'Today' : format(date, 'EEE')}
                                </span>
                                <span className="text-base sm:text-lg font-bold">
                                    {format(date, 'd')}
                                </span>
                                <span className="text-[9px] sm:text-[10px] opacity-70">
                                    {format(date, 'MMM')}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="w-4 h-4 text-primary" />
                        Select Time
                    </div>
                    {loading && <span className="text-xs text-muted-foreground animate-pulse">Updating...</span>}
                </div>

                {error && (
                    <div className="flex flex-col items-center justify-center p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 gap-2">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                        <button
                            onClick={fetchSlots}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Retry
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2 max-h-48 sm:max-h-56 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                        const appearance = getSlotAppearance(slot);

                        return (
                            <button
                                key={slot.time}
                                onClick={() => handleSlotClick(slot)}
                                disabled={appearance.disabled}
                                className={cn(
                                    "relative p-2 sm:p-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5",
                                    appearance.className
                                )}
                                title={isProvider && slot.booking ? `${slot.booking.customerName} - ${slot.booking.service?.name}` : undefined}
                            >
                                <div className="flex items-center gap-1">
                                    {appearance.icon && <span className="hidden sm:inline">{appearance.icon}</span>}
                                    <span>{appearance.label}</span>
                                </div>
                                {appearance.subLabel && (
                                    <span className="text-[9px] opacity-70">{appearance.subLabel}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 sm:gap-4 pt-4 text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-neutral-300 dark:border-neutral-700 bg-background shadow-sm"></div>
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-neutral-100 dark:bg-neutral-800 border-transparent"></div>
                        <span className="line-through decoration-neutral-400/50 text-muted-foreground">Unavailable</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-orange-500/20 border border-orange-500/50"></div>
                        <span>Reserved</span>
                    </div>
                    {isProvider && (
                        <>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-neutral-500/20 border border-neutral-500/50"></div>
                                <span>Online</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-purple-500/20 border border-purple-500/50"></div>
                                <span>Walk-in</span>
                            </div>
                        </>
                    )}
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-primary shadow-sm"></div>
                        <span>Selected</span>
                    </div>
                </div>
            </div>

            {!selectedTime && !isProvider && (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-2">
                    Please select a time slot to continue
                </p>
            )}
        </div>
    );
}

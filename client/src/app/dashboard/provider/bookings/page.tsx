"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfWeek, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { BookingDetailsModal } from "@/components/booking/BookingDetailsModal";
import { ManualBookingModal } from "@/components/booking/ManualBookingModal";
import { Badge } from "@/components/ui/badge";

export default function BookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [salon, setSalon] = useState<any>(null); // Salon data might still be useful for context, keeping it
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isMobile, setIsMobile] = useState(false);

    // Modals & Selection
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
    const [manualBookingDate, setManualBookingDate] = useState<Date>(new Date());
    const [manualBookingTime, setManualBookingTime] = useState("");

    // Handle Resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Ensure we start at beginning of today to avoid time drifts
    useEffect(() => {
        // setCurrentDate(startOfToday()); // Optional: reset on mount
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [bookingsRes, servicesRes, salonRes] = await Promise.all([
                api.get("/bookings/my"),
                api.get("/services"),
                api.get("/salons/me")
            ]);
            setBookings(bookingsRes.data);
            setServices(servicesRes.data);
            setSalon(salonRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);



    // Calendar Helper
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start

    // If mobile, show ONLY current date. If desktop, show full week.
    const weekDays = isMobile
        ? [currentDate]
        : eachDayOfInterval({
            start: startOfCurrentWeek,
            end: addDays(startOfCurrentWeek, 6)
        });

    const handlePrev = () => setCurrentDate(d => isMobile ? addDays(d, -1) : addDays(d, -7));
    const handleNext = () => setCurrentDate(d => isMobile ? addDays(d, 1) : addDays(d, 7));

    // Get day key for salon opening hours (mon, tue, wed, etc.)
    const getDayKey = (date: Date): string => {
        // Use local day of week to match the calendar display
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        return days[date.getDay()];
    };

    // Get opening hours for a specific day
    // Returns null if closed (empty strings mean closed)
    const getOpeningHoursForDay = (date: Date): { open: string; close: string } | null => {
        if (!salon?.openingHours) return null;
        const dayKey = getDayKey(date);
        const hours = salon.openingHours[dayKey];
        // Empty strings mean closed day (from OpeningHoursEditor)
        if (!hours || hours.open === "" || hours.close === "") return null;
        return hours;
    };

    // Generate time slots based on salon hours (or default 9-21 if not set)
    const generateTimeSlots = (): string[] => {
        // Find the earliest open and latest close across all days the salon is open
        let minOpen = 9;
        let maxClose = 21;

        if (salon?.openingHours) {
            const allHours: { open: string; close: string }[] = [];
            const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

            days.forEach(day => {
                const hours = salon.openingHours[day];
                // Only include days that are open (non-empty strings)
                if (hours?.open && hours?.close && hours.open !== "" && hours.close !== "") {
                    allHours.push(hours);
                }
            });

            if (allHours.length > 0) {
                // Find earliest open time
                const opens = allHours.map(h => parseInt(h.open.split(':')[0], 10));
                const closes = allHours.map(h => parseInt(h.close.split(':')[0], 10));
                minOpen = Math.min(...opens);
                maxClose = Math.max(...closes);
            }
        }

        // Generate hourly slots from earliest open to latest close
        const slots: string[] = [];
        for (let hour = minOpen; hour <= maxClose; hour++) {
            slots.push(`${hour < 10 ? '0' : ''}${hour}:00`);
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    // Auto-scroll to current time (or 9 AM if earlier)
    useEffect(() => {
        if (!loading && timeSlots.length > 0) {
            const scrollContainer = document.querySelector('.overflow-y-auto');

            if (scrollContainer) {
                const now = new Date();
                const currentHour = now.getHours();
                // Find nearest slot to current hour
                const targetSlot = timeSlots.find(slot => parseInt(slot.split(':')[0]) >= currentHour);

                if (targetSlot) {
                    const slotIndex = timeSlots.indexOf(targetSlot);
                    // Scroll to bring that slot into view, but maybe slightly above to see context
                    // 100px is approx row height on desktop
                    const rowHeight = isMobile ? 70 : 100;
                    // Scroll to 1 slot before if possible
                    const scrollIndex = Math.max(0, slotIndex - 1);
                    scrollContainer.scrollTop = scrollIndex * rowHeight;
                }
            }
        }
    }, [loading, timeSlots, isMobile]);

    // Check if a specific day is open for business
    const isDayOpen = (date: Date): boolean => {
        const hours = getOpeningHoursForDay(date);
        return hours !== null;
    };

    // Check if a slot is within opening hours for a specific day
    const isSlotWithinOpeningHours = (date: Date, time: string): boolean => {
        const hours = getOpeningHoursForDay(date);
        if (!hours) return false; // Day is closed

        const slotHour = parseInt(time.split(':')[0], 10);
        const openHour = parseInt(hours.open.split(':')[0], 10);
        const closeHour = parseInt(hours.close.split(':')[0], 10);

        return slotHour >= openHour && slotHour < closeHour;
    };

    const getBookingsForSlot = (date: Date, time: string) => {
        return bookings.filter(b =>
            b.time &&
            isSameDay(new Date(b.date), date) &&
            b.time.startsWith(time.split(':')[0]) // Simple hour matching
        );
    };

    const handleSlotClick = (date: Date, time: string) => {
        // Always open Manual Booking ("Quick Add") when clicking empty space in the slot
        // Existing bookings have their own click handlers with stopPropagation
        setManualBookingDate(date);
        setManualBookingTime(time);
        setIsManualBookingOpen(true);
    };



    return (
        <div className="space-y-3 md:space-y-6 h-[calc(100vh-160px)] md:h-[calc(100vh-100px)] flex flex-col p-4 md:p-0">
            {/* Header */}
            <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight">Bookings</h2>

                    <Button onClick={() => setIsManualBookingOpen(true)} size="sm" className="bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Walk-in Booking</span>
                        <span className="sm:hidden">Walk-in</span>
                    </Button>
                </div>

                <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm rounded-xl p-1.5 border border-border/50 shadow-sm">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80 rounded-lg" onClick={handlePrev}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-2 md:px-4 font-semibold text-center text-sm md:text-base tracking-tight flex-1">
                        {isMobile
                            ? format(currentDate, "MMMM d, yyyy")
                            : `${format(startOfCurrentWeek, "MMMM d")} - ${format(addDays(startOfCurrentWeek, 6), "MMMM d, yyyy")}`
                        }
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/80 rounded-lg" onClick={handleNext}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-border/50 mx-2" />
                    <Button variant="ghost" size="sm" className="h-8 text-xs font-medium hover:bg-background/80 rounded-lg px-3" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </Button>
                </div>
            </div>

            {/* CALENDAR GRID VIEW */}
            <div className="flex-1 bg-card/50 backdrop-blur-sm rounded-xl md:rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
                {/* Header Row */}
                <div className={`grid border-b border-border/40 shrink-0 ${isMobile ? 'grid-cols-[50px_1fr]' : 'grid-cols-8'}`}>
                    <div className="p-1.5 md:p-4 border-r border-border/40 flex items-center justify-center text-muted-foreground font-medium bg-muted/20 text-[10px] md:text-sm">
                        Time
                    </div>
                    {weekDays.map((date) => {
                        const dayOpen = isDayOpen(date);
                        return (
                            <div key={date.toString()} className={`p-1.5 md:p-4 border-r border-border/40 text-center last:border-r-0 ${isSameDay(date, new Date()) ? 'bg-primary/5' : ''} ${!dayOpen ? 'bg-muted/30' : ''}`}>
                                <div className="text-[10px] md:text-sm font-medium text-muted-foreground">{format(date, "EEE")}</div>
                                <div className={`text-base md:text-xl font-bold ${isSameDay(date, new Date()) ? 'text-primary' : ''}`}>
                                    {format(date, "d")}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {timeSlots.map((time) => (
                        <div key={time} className={`grid border-b border-border/40 min-h-[70px] md:min-h-[100px] ${isMobile ? 'grid-cols-[50px_1fr]' : 'grid-cols-8'}`}>
                            <div className="p-1 md:p-4 border-r border-border/40 text-[10px] md:text-sm text-muted-foreground font-medium bg-muted/10 flex items-start justify-center pt-2 md:pt-6 sticky left-0 z-10">
                                {time}
                            </div>
                            {weekDays.map((date) => {
                                const slotBookings = getBookingsForSlot(date, time);
                                const withinHours = isSlotWithinOpeningHours(date, time);

                                // Check if slot is in the past
                                const [hours, minutes] = time.split(':').map(Number);
                                const slotDateTime = new Date(date);
                                slotDateTime.setHours(hours, minutes, 0, 0);
                                const isPast = slotDateTime < new Date();

                                // Slot is unavailable if outside opening hours OR in the past (with no bookings)
                                const isUnavailable = !withinHours || (isPast && slotBookings.length === 0);

                                return (
                                    <div
                                        key={date.toString() + time}
                                        className={`
                                            border-r border-border/40 p-1 relative transition-colors group min-h-[48px]
                                            ${withinHours && !isPast ? 'hover:bg-primary/5 cursor-pointer active:bg-primary/10' : ''}
                                            ${!withinHours ? 'bg-muted/20' : ''}
                                            ${isPast && slotBookings.length === 0 ? 'bg-muted/10 cursor-not-allowed opacity-50' : ''}
                                        `}
                                        style={!withinHours ? {
                                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)'
                                        } : undefined}
                                        onClick={() => {
                                            if (withinHours && (!isPast || slotBookings.length > 0)) {
                                                handleSlotClick(date, time);
                                            }
                                        }}
                                    >
                                        {/* Quick Add Button on Hover (Only for available slots) */}
                                        {slotBookings.length === 0 && !isPast && withinHours && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-4 h-4 md:w-6 md:h-6 text-primary/40" />
                                            </div>
                                        )}

                                        {slotBookings.map(booking => (
                                            <div
                                                key={booking._id}
                                                className={`
                                                    p-1.5 md:p-2 rounded-md text-[10px] md:text-xs mb-1 cursor-pointer border shadow-sm transition-all duration-200 hover:shadow-md active:scale-95
                                                    ${booking.status === 'confirmed' ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' : ''}
                                                    ${booking.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300' : ''}
                                                    ${booking.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300' : ''}
                                                    ${booking.status === 'cancelled' || booking.status === 'no-show' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300 line-through opacity-70' : ''}
                                                `}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBooking(booking);
                                                }}
                                            >
                                                <div className="font-semibold truncate text-[10px] md:text-xs">{booking.customerName || booking.user?.name || "Walk-in"}</div>
                                                <div className="truncate opacity-80 text-[9px] md:text-xs hidden md:block">{booking.service?.name}</div>
                                                <div className="mt-0.5 md:mt-1 flex gap-1">
                                                    {booking.type === 'walk-in' ?
                                                        <Badge variant="outline" className="text-[8px] md:text-[10px] h-3 md:h-4 px-1 py-0 bg-transparent">Walk-in</Badge> :
                                                        <Badge variant="secondary" className="text-[8px] md:text-[10px] h-3 md:h-4 px-1 py-0 bg-primary/20 text-primary dark:text-neutral-200">Online</Badge>
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Modals */}
            <BookingDetailsModal
                booking={selectedBooking}
                isOpen={!!selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onUpdate={fetchAllData}
            />

            <ManualBookingModal
                isOpen={isManualBookingOpen}
                onClose={() => setIsManualBookingOpen(false)}
                onSuccess={fetchAllData}
                initialDate={manualBookingDate}
                initialTime={manualBookingTime}
                services={services}
                salonId={salon?._id}
            />
        </div>
    );
}

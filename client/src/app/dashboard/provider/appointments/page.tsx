"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, User, Phone } from "lucide-react";
import { format, startOfWeek, addDays, eachDayOfInterval, isSameDay, startOfToday } from "date-fns";
import { BookingDetailsModal } from "@/components/booking/BookingDetailsModal";
import { ManualBookingModal } from "@/components/booking/ManualBookingModal";
import { Badge } from "@/components/ui/badge";

export default function AppointmentsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [salon, setSalon] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(startOfToday());

    // Modals
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
    const [manualBookingDate, setManualBookingDate] = useState<Date>(new Date());
    const [manualBookingTime, setManualBookingTime] = useState("");

    const fetchBookings = async () => {
        try {
            const { data } = await api.get("/bookings/my");
            setBookings(data);
        } catch (error) {
            console.error("Failed to fetch bookings", error);
        }
    };

    const fetchServices = async () => {
        try {
            const { data } = await api.get("/services");
            setServices(data);
        } catch (error) {
            console.error("Failed to fetch services", error);
        }
    };

    const fetchSalon = async () => {
        try {
            const { data } = await api.get("/salons/me");
            setSalon(data);
        } catch (error) {
            console.error("Failed to fetch salon", error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchBookings(), fetchServices(), fetchSalon()]);
            setLoading(false);
        };
        init();
    }, []);

    // Calendar Helper
    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = eachDayOfInterval({
        start: startOfCurrentWeek,
        end: addDays(startOfCurrentWeek, 6)
    });

    const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const hour = i + 9; // 9 AM to 9 PM
        return `${hour < 10 ? '0' : ''}${hour}:00`;
    });

    const getBookingsForSlot = (date: Date, time: string) => {
        return bookings.filter(b =>
            b.time &&
            isSameDay(new Date(b.date), date) &&
            b.time.startsWith(time.split(':')[0]) // Simple hour matching
        );
    };

    const handleSlotClick = (date: Date, time: string) => {
        // Open Manual Booking ("Quick Add") when clicking empty space
        setManualBookingDate(date);
        setManualBookingTime(time);
        setIsManualBookingOpen(true);
    };

    const handleBookingClick = (e: React.MouseEvent, booking: any) => {
        e.stopPropagation();
        setSelectedBooking(booking);
    };

    const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const goToToday = () => setCurrentDate(startOfToday());

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold tracking-tight">Appointments</h2>
                    <div className="flex items-center bg-secondary/50 rounded-lg p-1">
                        <Button variant="ghost" size="icon" onClick={prevWeek}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="px-4 font-medium min-w-[140px] text-center">
                            {format(startOfCurrentWeek, "MMM d")} - {format(addDays(startOfCurrentWeek, 6), "MMM d, yyyy")}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextWeek}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
                </div>
                <Button onClick={() => setIsManualBookingOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Booking
                </Button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 glass-card overflow-hidden flex flex-col">
                {/* Header Row */}
                <div className="grid grid-cols-8 border-b border-white/10 shrink-0">
                    <div className="p-4 border-r border-white/10 flex items-center justify-center text-muted-foreground font-medium bg-black/20">
                        Time
                    </div>
                    {weekDays.map((date) => (
                        <div key={date.toString()} className={`p-4 border-r border-white/10 text-center last:border-r-0 ${isSameDay(date, new Date()) ? 'bg-primary/10' : ''}`}>
                            <div className="text-sm font-medium text-muted-foreground">{format(date, "EEE")}</div>
                            <div className={`text-xl font-bold ${isSameDay(date, new Date()) ? 'text-primary' : ''}`}>
                                {format(date, "d")}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Slots */}
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {timeSlots.map((time) => (
                        <div key={time} className="grid grid-cols-8 border-b border-white/5 min-h-[100px]">
                            <div className="p-4 border-r border-white/10 text-sm text-muted-foreground font-medium bg-black/10 flex items-start justify-center pt-6 sticky left-0">
                                {time}
                            </div>
                            {weekDays.map((date) => {
                                const slotBookings = getBookingsForSlot(date, time);
                                return (
                                    <div
                                        key={date.toString() + time}
                                        className="border-r border-white/10 p-1 relative hover:bg-white/5 transition-colors cursor-pointer group"
                                        onClick={() => handleSlotClick(date, time)}
                                    >
                                        {/* Hover Add Button */}
                                        {slotBookings.length === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="w-6 h-6 text-muted-foreground/50" />
                                            </div>
                                        )}

                                        {slotBookings.map(booking => (
                                            <div
                                                key={booking._id}
                                                className={`
                                                    p-2 rounded-md text-xs mb-1 cursor-pointer border shadow-sm
                                                    ${booking.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-100' : ''}
                                                    ${booking.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-100' : ''}
                                                    ${booking.status === 'completed' ? 'bg-neutral-500/10 border-neutral-500/20 text-neutral-100' : ''}
                                                    ${booking.status === 'cancelled' || booking.status === 'no-show' ? 'bg-red-500/10 border-red-500/20 text-red-100 line-through opacity-70' : ''}
                                                `}
                                                onClick={(e) => handleBookingClick(e, booking)}
                                            >
                                                <div className="font-bold truncate">{booking.customerName || booking.user?.name || "Walk-in"}</div>
                                                <div className="truncate opacity-80">{booking.service?.name}</div>
                                                <div className="mt-1 flex gap-1">
                                                    {booking.type === 'walk-in' && <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">Walk-in</Badge>}
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

            <BookingDetailsModal
                booking={selectedBooking}
                isOpen={!!selectedBooking}
                onClose={() => setSelectedBooking(null)}
                onUpdate={fetchBookings}
            />

            <ManualBookingModal
                isOpen={isManualBookingOpen}
                onClose={() => setIsManualBookingOpen(false)}
                onSuccess={fetchBookings}
                initialDate={manualBookingDate}
                initialTime={manualBookingTime}
                services={services}
                salonId={salon?._id}
            />
        </div>
    );
}

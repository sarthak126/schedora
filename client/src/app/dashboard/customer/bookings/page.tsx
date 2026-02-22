"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, Clock, MapPin, Scissors, CreditCard, Phone, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BookingHistoryPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const { data } = await api.get("/bookings/my");
                setBookings(data);
            } catch (error) {
                console.error("Failed to fetch bookings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    // Separate bookings into upcoming and history
    const upcomingBookings = bookings.filter(b =>
        ['pending', 'confirmed', 'in-progress', 'pending_approval'].includes(b.status)
    );

    const historyBookings = bookings.filter(b =>
        ['completed', 'cancelled', 'no-show'].includes(b.status)
    );

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'confirmed': return 'default'; // dark/primary
            case 'in-progress': return 'default'; // dark/primary
            case 'completed': return 'outline';
            case 'cancelled': return 'destructive';
            case 'no-show': return 'destructive';
            case 'pending_approval': return 'secondary'; // yellow/orange-ish usually handled by badge className elsewhere or default secondary is fine
            default: return 'secondary';
        }
    };

    if (loading) {
        return <div className="space-y-4">
            <h1 className="text-2xl font-bold">My Bookings</h1>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>;
    }

    const BookingCard = ({ booking }: { booking: any }) => (
        <div className="glass-card p-6 flex flex-col md:flex-row justify-between gap-4 group hover:border-primary/50 transition-all">
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{booking.service?.name || "Service Deleted"}</h3>
                    <span className="text-muted-foreground text-sm">at</span>
                    <span className="font-medium text-primary">{booking.salon?.name || "Unknown Salon"}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(booking.date), 'PPP')}
                    </div>
                    <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {booking.time || booking.timeSlot}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Badge variant={getStatusVariant(booking.status)}>
                        {booking.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </Badge>
                    {booking.paymentStatus === 'paid' && (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                            💳 Paid
                        </Badge>
                    )}
                    {booking.type && (
                        <Badge variant="outline">
                            {booking.type === 'online' ? '🌐 Online' : '🚶 Walk-in'}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-end justify-center min-w-[100px] gap-2">
                <div className="text-xl font-bold">₹{booking.price}</div>
                <div className="text-xs text-muted-foreground break-all">ID: {booking._id.slice(-6)}</div>

                {/* Contact Salon Buttons */}
                {booking.salon?.contactNumber && (
                    <div className="flex gap-2 mt-2">
                        <a
                            href={`tel:${booking.salon.contactNumber}`}
                            className="p-2 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                            title={`Call: ${booking.salon.contactNumber}`}
                        >
                            <Phone className="w-4 h-4" />
                        </a>
                        <a
                            href={`https://wa.me/91${booking.salon.contactNumber.replace(/[^0-9]/g, '').slice(-10)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors"
                            title="WhatsApp Salon"
                        >
                            <MessageSquare className="w-4 h-4" />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Bookings</h1>
                <Link href="/explore">
                    <Button>Explore Services</Button>
                </Link>
            </div>

            {bookings.length === 0 ? (
                <div className="text-muted-foreground p-10 text-center glass-card flex flex-col items-center gap-4">
                    <p>No bookings found yet.</p>
                    <Link href="/explore">
                        <Button variant="outline">Browse Salons</Button>
                    </Link>
                </div>
            ) : (
                <>
                    {/* Upcoming Bookings */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">Upcoming Bookings ({upcomingBookings.length})</h2>
                        {upcomingBookings.length === 0 ? (
                            <div className="glass-card p-6 text-center text-muted-foreground">
                                <p>No upcoming bookings</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {upcomingBookings.map((booking) => (
                                    <BookingCard key={booking._id} booking={booking} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* History */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold">History ({historyBookings.length})</h2>
                        {historyBookings.length === 0 ? (
                            <div className="glass-card p-6 text-center text-muted-foreground">
                                <p>No booking history</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {historyBookings.slice(0, 10).map((booking) => (
                                    <BookingCard key={booking._id} booking={booking} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

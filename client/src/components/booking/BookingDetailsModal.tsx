"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import api from "@/lib/api";
import { useState } from "react";
import { Phone, User, Clock, Calendar as CalendarIcon, Scissors, MessageSquare } from "lucide-react";

interface BookingDetailsModalProps {
    booking: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export function BookingDetailsModal({ booking, isOpen, onClose, onUpdate }: BookingDetailsModalProps) {
    const [loading, setLoading] = useState(false);

    if (!booking) return null;

    // Get customer phone - try customerPhone first, then user.phone
    const customerPhone = booking.customerPhone || booking.user?.phone;

    const handleStatusUpdate = async (status: string) => {
        setLoading(true);
        try {
            console.log('Updating booking:', booking._id, 'to status:', status);
            await api.put(`/bookings/${booking._id}/status`, { status });
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error("Failed to update status", error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Failed to update status";
            console.error("Server error details:", error.response?.data);
            alert(`Error: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Booking Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Customer Info */}
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/20 border border-border">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                                {booking.customerName || booking.user?.name || "Walk-in Customer"}
                            </h4>
                            {customerPhone && (
                                <p className="text-sm text-muted-foreground flex items-center mt-1">
                                    <Phone className="w-3 h-3 mr-1" />
                                    {customerPhone}
                                </p>
                            )}
                            {booking.user?.email && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {booking.user.email}
                                </p>
                            )}
                            <div className="mt-2 flex gap-2 flex-wrap">
                                <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                                    {booking.status.toUpperCase()}
                                </Badge>
                                {booking.type === 'walk-in' && (
                                    <Badge variant="outline">Walk-in</Badge>
                                )}
                            </div>

                            {/* Contact Customer Buttons */}
                            {customerPhone && (
                                <div className="flex gap-2 mt-3">
                                    <a
                                        href={`tel:${customerPhone}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-600 text-xs font-medium transition-colors"
                                    >
                                        <Phone className="w-3 h-3" />
                                        Call
                                    </a>
                                    <a
                                        href={`https://wa.me/91${customerPhone.replace(/[^0-9]/g, '').slice(-10)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-xs font-medium transition-colors"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                        WhatsApp
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service Info */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center">
                                <Scissors className="w-4 h-4 mr-2" /> Service
                            </span>
                            <span className="font-medium">{booking.service?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2" /> Date
                            </span>
                            <span className="font-medium">
                                {booking.date ? format(new Date(booking.date), "PPP") : "N/A"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground flex items-center">
                                <Clock className="w-4 h-4 mr-2" /> Time
                            </span>
                            <span className="font-medium">{booking.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Price</span>
                            <span className="font-bold text-lg text-primary">₹{booking.price}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {booking.status === 'pending' || booking.status === 'confirmed' ? (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => handleStatusUpdate('no-show')}
                                disabled={loading}
                                className="flex-1"
                            >
                                Mark No-Show
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleStatusUpdate('cancelled')}
                                disabled={loading}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleStatusUpdate('completed')}
                                disabled={loading}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                Complete
                            </Button>
                        </>
                    ) : (
                        <div className="w-full text-center text-sm text-muted-foreground">
                            Booking is {booking.status}
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

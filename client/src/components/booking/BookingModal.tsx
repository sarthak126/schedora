"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import Script from "next/script";
import { SlotBookingSystem } from "./SlotBookingSystem";
import { StaffSelector } from "./StaffSelector";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    salon: any;
    service: any;
}

export function BookingModal({ open, onOpenChange, salon, service }: BookingModalProps) {
    const [step, setStep] = useState(1);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [availableStaff, setAvailableStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [timeSlot, setTimeSlot] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [numberOfPeople, setNumberOfPeople] = useState<number>(1);
    const [confirmedBookingData, setConfirmedBookingData] = useState<any>(null);
    const [paymentsEnabled, setPaymentsEnabled] = useState(true); // Feature flag

    // Fetch available staff when modal opens
    const fetchAvailableStaff = async () => {
        if (!salon || !service) return;

        setLoadingStaff(true);
        try {
            const { data } = await api.get(`/staff/available?salonId=${salon._id}&serviceId=${service._id}`);
            // data might be array of staff
            setAvailableStaff(data);
        } catch (error) {
            console.error("Failed to fetch staff", error);
        } finally {
            setLoadingStaff(false);
        }
    };

    useEffect(() => {
        if (open && salon && service) {
            setStep(1); // Start at Step 1 (Staff Selection)
            fetchAvailableStaff();
            // Check if payments are enabled
            api.get("/payments/feature-status")
                .then(res => setPaymentsEnabled(res.data.paymentsEnabled))
                .catch(() => setPaymentsEnabled(true)); // Default to true if check fails
        } else {
            // Reset when modal closes
            setStep(1);
            setSelectedStaffId(null);
            setDate(undefined);
            setTimeSlot("");
            setNumberOfPeople(1);
            setConfirmedBookingData(null);
        }
    }, [open, salon, service]);

    const handleStaffSelect = (staffId: string | null) => {
        setSelectedStaffId(staffId);
        setStep(2); // Move to Date/Time selection
    };

    const handleBack = () => {
        if (step === 2) setStep(1);
        if (step === 3) window.location.reload(); // Should not happen usually
    };

    // ... (keep handleSlotSelected, etc. as they are helper functions)
    const handleSlotSelected = (selectedDate: Date, selectedTime: string) => {
        setDate(selectedDate);
        setTimeSlot(selectedTime);
    };

    const cancelBooking = async (bookingId: string) => {
        try {
            await api.delete(`/bookings/${bookingId}`);
            console.log("Temporary booking cancelled");
        } catch (error) {
            console.error("Failed to cancel temporary booking", error);
        }
    };

    const generateBookingId = (salonName: string) => {
        const safeName = (salonName || "SALO").replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase();
        const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `SCH${safeName}${randomChars}`;
    };

    const handlePayment = async () => {
        if (!date || !timeSlot) {
            alert("Please select date and time");
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post("/bookings", {
                salonId: salon._id,
                serviceId: service._id,
                staffId: selectedStaffId, // Use selected staff (or null for auto)
                date: date.toISOString(),
                timeSlot: timeSlot,
                numberOfPeople: numberOfPeople
            });

            const { booking, order } = data;

            // If payments are disabled globally, auto-confirm the booking
            if (!paymentsEnabled) {
                // Directly confirm booking without payment
                try {
                    await api.post("/bookings/verify", {
                        razorpay_order_id: order.id,
                        razorpay_payment_id: "free_" + Date.now(),
                        razorpay_signature: "payments_disabled",
                        bookingId: booking._id
                    });

                    setConfirmedBookingData({
                        ...booking,
                        bookingRefId: generateBookingId(salon.name),
                        exactDate: date,
                        exactTime: timeSlot
                    });
                    setStep(3);
                } catch (verifyError) {
                    console.error("Confirmation failed", verifyError);
                    alert("Booking confirmation failed");
                    setLoading(false);
                }
                return;
            }

            // If salon hasn't configured payment, auto-confirm without payment
            if (!order.salonPaymentConfigured) {
                console.log("⚠️ Salon has no payment configured - confirming for free");
                try {
                    await api.post("/bookings/verify", {
                        razorpay_order_id: order.id,
                        razorpay_payment_id: "free_" + Date.now(),
                        razorpay_signature: "salon_no_payment",
                        bookingId: booking._id
                    });

                    setConfirmedBookingData({
                        ...booking,
                        bookingRefId: generateBookingId(salon.name),
                        exactDate: date,
                        exactTime: timeSlot
                    });
                    setStep(3);
                } catch (verifyError) {
                    console.error("Confirmation failed", verifyError);
                    alert("Booking confirmation failed");
                    setLoading(false);
                }
                return;
            }

            // Salon has payment configured - use their key_id
            const razorpayKeyId = order.key_id;

            if (!razorpayKeyId) {
                alert("Payment not configured. Please contact the salon.");
                setLoading(false);
                return;
            }

            const options = {
                key: razorpayKeyId, // Dynamic key based on salon configuration
                amount: order.amount,
                currency: order.currency,
                name: salon.name || "Schedora",
                description: `Booking for ${service.name}`,
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        await api.post("/bookings/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            bookingId: booking._id
                        });

                        setConfirmedBookingData({
                            ...booking,
                            bookingRefId: generateBookingId(salon.name),
                            exactDate: date,
                            exactTime: timeSlot
                        });
                        setStep(3);
                    } catch (verifyError) {
                        console.error("Verification failed", verifyError);
                        alert("Payment verification failed");
                    }
                },
                prefill: {
                    name: "Customer Name",
                    email: "customer@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#6366f1" // Primary indigo to match design
                },
                modal: {
                    ondismiss: function () {
                        console.log("Payment cancelled by user");
                        cancelBooking(booking._id);
                        setLoading(false);
                    }
                }
            };

            if (order.isMock || order.id.startsWith('order_mock_')) {
                console.log("⚠️ Processing Mock Payment (Bypass Mode)");
                try {
                    await api.post("/bookings/verify", {
                        razorpay_order_id: order.id,
                        razorpay_payment_id: "pay_mock_" + Date.now(),
                        razorpay_signature: "mock_signature",
                        bookingId: booking._id
                    });

                    setConfirmedBookingData({
                        ...booking,
                        bookingRefId: generateBookingId(salon.name),
                        exactDate: date,
                        exactTime: timeSlot
                    });
                    setStep(3);
                } catch (verifyError) {
                    console.error("Mock verification failed", verifyError);
                    alert("Payment verification failed");
                    setLoading(false);
                }
                return;
            }

            const rzp1 = new (window as any).Razorpay(options);
            rzp1.on('payment.failed', function (response: any) {
                alert("Payment Failed: " + response.error.description);
                cancelBooking(booking._id);
                setLoading(false);
            });
            rzp1.open();

        } catch (error: any) {
            console.error("Booking failed", error);
            if (error.response && error.response.status === 401) {
                alert("Session expired. Please login again.");
                window.location.href = "/auth/login";
                return;
            }
            alert(error.response?.data?.message || "Booking failed");
            setLoading(false);
        }
    };

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* Header with Back Button */}
                    {step !== 3 && (
                        <DialogHeader>
                            <div className="flex items-center gap-2 mb-2">
                                {step > 1 && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={handleBack}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                )}
                                <DialogTitle>
                                    {step === 1 ? "Select Staff" : "Select Date & Time"}
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs sm:text-sm">
                                {service.name} at {salon.name} • ₹{service.price} • {service.duration} mins
                            </DialogDescription>
                        </DialogHeader>
                    )}

                    <div className="space-y-4 py-2">
                        {/* Step 1: Staff Selection */}
                        {step === 1 && (
                            <StaffSelector
                                staff={availableStaff}
                                selectedStaffId={selectedStaffId}
                                onSelectStaff={handleStaffSelect}
                                loading={loadingStaff}
                            />
                        )}

                        {/* Step 2: Date/Time Selection (Main Step now) */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <SlotBookingSystem
                                    salonId={salon._id}
                                    serviceId={service._id}
                                    staffId={selectedStaffId} // Pass selected staff
                                    onSlotSelected={handleSlotSelected}
                                    selectedDate={date}
                                    selectedTime={timeSlot}
                                />

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
                                    <div>
                                        <div className="font-semibold text-base sm:text-lg">Total: ₹{service.price}</div>
                                        {date && timeSlot && (
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at {timeSlot}
                                            </div>
                                        )}
                                        {/* Show selected staff name if any */}
                                        {selectedStaffId && (
                                            <div className="text-xs text-muted-foreground">
                                                Staff: {availableStaff.find(s => s._id === selectedStaffId)?.name || 'Selected Staff'}
                                            </div>
                                        )}
                                        {!selectedStaffId && step === 2 && (
                                            <div className="text-xs text-muted-foreground">
                                                Staff: Any Available
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handlePayment}
                                        disabled={loading || !date || !timeSlot}
                                        size="default"
                                        className="w-full sm:w-auto"
                                    >
                                        {loading ? "Processing..." : paymentsEnabled ? "Pay & Book" : "Confirm Booking"}
                                    </Button>
                                </div>
                            </div>
                        )}
                        {/* Step 3: Success View logic remains... */}

                        {/* Step 3: Success View */}
                        {step === 3 && confirmedBookingData && (
                            <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-in zoom-in duration-300">
                                    <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold">You're all set!</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Booking ID: <span className="font-mono font-bold text-primary tracking-wide">{confirmedBookingData.bookingRefId}</span>
                                    </p>
                                </div>

                                <div className="w-full bg-muted/50 rounded-xl p-6 text-left space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-base">
                                                {confirmedBookingData.exactDate ? confirmedBookingData.exactDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date'}
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-0.5">
                                                {confirmedBookingData.exactTime}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-base">{salon.name}</div>
                                            <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                                {salon.address || "Address not available"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={() => {
                                        window.location.href = "/";
                                    }}
                                >
                                    Back to Home
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

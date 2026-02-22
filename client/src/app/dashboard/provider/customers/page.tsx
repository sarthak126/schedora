"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, MessageCircle, Calendar, History, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function CustomersPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [salon, setSalon] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [editableMessage, setEditableMessage] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const { data: salonData } = await api.get("/salons/me");
                setSalon(salonData);

                const { data: bookingsData } = await api.get("/bookings/my");
                setBookings(bookingsData);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };

        const userStr = localStorage.getItem("user");
        if (!userStr) {
            router.push("/auth/login");
            return;
        }
        fetchCustomers();
    }, [router]);

    // Group bookings by customer
    const customersInfo = useMemo(() => {
        const customerMap = new Map();

        // Sort bookings by date descending so the first one we see per customer is the latest
        const sortedBookings = [...bookings].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Descending
        });

        sortedBookings.forEach(booking => {
            // Handle both registered users and walk-ins
            let customerId, customerName, customerPhone;

            if (booking.user) {
                customerId = booking.user._id;
                customerName = booking.user.name;
                customerPhone = booking.user.phone || "";
            } else if (booking.customerName || booking.customerPhone) {
                // Generate a pseudo-ID for manual walk-ins
                customerId = booking.customerPhone || booking.customerName || booking._id;
                customerName = booking.customerName || "Walk-in Customer";
                customerPhone = booking.customerPhone || "";
            } else {
                return; // Skip if no user info
            }

            if (!customerMap.has(customerId)) {
                customerMap.set(customerId, {
                    id: customerId,
                    name: customerName,
                    phone: customerPhone,
                    lastVisitDate: booking.date,
                    lastService: booking.service?.name || "Service",
                    totalVisits: 1,
                    history: [booking]
                });
            } else {
                const existing = customerMap.get(customerId);
                existing.totalVisits += 1;
                existing.history.push(booking);
            }
        });

        // Convert to array
        return Array.from(customerMap.values());
    }, [bookings]);

    // Filter customers
    const filteredCustomers = customersInfo.filter((c: any) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenReminderDialog = (customer: any) => {
        if (!customer.phone) {
            alert("No phone number available for this customer.");
            return;
        }

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://schedora.com';
        const bookingLink = `${baseUrl}/book/${salon?._id}`;

        let message = `Hi ${customer.name}, it's been a while since your last visit for ${customer.lastService}! ✂️\n\n`;
        message += `It's time for your next appointment. You can book your slot easily here:\n${bookingLink}\n\n`;
        message += `Looking forward to seeing you at ${salon?.name}!`;

        setSelectedCustomer(customer);
        setEditableMessage(message);
        setIsDialogOpen(true);
    };

    const handleConfirmSend = () => {
        if (!selectedCustomer) return;

        const encodedMessage = encodeURIComponent(editableMessage);

        let phone = selectedCustomer.phone;
        if (phone) {
            phone = phone.replace(/\D/g, "");
            if (phone.length === 10) {
                phone = "91" + phone;
            }
        }

        const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        setIsDialogOpen(false);
    };

    if (loading) {
        return (
            <div className="space-y-4 p-4 md:p-6 max-w-7xl mx-auto">
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="space-y-4 mt-6">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 p-4 md:p-0 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 md:p-6 rounded-2xl border border-primary/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            Customer History
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground">
                            View past clients and send reminders for their next service.
                        </p>
                    </div>
                    <div className="flex bg-background/50 p-2 rounded-lg border border-border mt-2 md:mt-0">
                        <div className="text-center px-4 border-r border-border">
                            <p className="text-2xl font-bold">{customersInfo.length}</p>
                            <p className="text-xs text-muted-foreground">Total Clients</p>
                        </div>
                        <div className="text-center px-4">
                            <p className="text-2xl font-bold text-primary">{bookings.filter(b => b.status === 'completed' || b.status === 'confirmed').length}</p>
                            <p className="text-xs text-muted-foreground">Successful Visits</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 bg-background/50 backdrop-blur-sm shadow-sm"
                />
            </div>

            {/* Customers List */}
            <div className="space-y-4">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center p-12 glass-card rounded-2xl border-dashed">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium">No customers found</h3>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "Try a different search term" : "When you get bookings, customers will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCustomers.map((customer: any, idx) => (
                            <div key={customer.id || idx} className="glass-card p-5 hover:shadow-md transition-all duration-300 group flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
                                            {customer.name ? customer.name.substring(0, 1).toUpperCase() : "?"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base truncate max-w-[150px]">{customer.name}</h3>
                                            <p className="text-xs text-muted-foreground">{customer.phone || "No phone"}</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-primary/5">
                                        {customer.totalVisits} {customer.totalVisits === 1 ? 'visit' : 'visits'}
                                    </Badge>
                                </div>

                                <div className="space-y-2 mb-6 flex-1 bg-muted/30 rounded-lg p-3 border border-border/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Last Visit</span>
                                        <span className="font-medium text-right flex flex-col items-end">
                                            {format(new Date(customer.lastVisitDate), 'MMM d, yyyy')}
                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                {formatDistanceToNow(new Date(customer.lastVisitDate), { addSuffix: true })}
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border/50">
                                        <span className="text-muted-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Service</span>
                                        <span className="font-semibold text-primary">{customer.lastService}</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => handleOpenReminderDialog(customer)}
                                    className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-sm hover:shadow active:scale-95 transition-all"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Send Reminder
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Reminder Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Reminder Message</DialogTitle>
                        <DialogDescription>
                            Customize the message before sending it via WhatsApp to {selectedCustomer?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={editableMessage}
                            onChange={(e) => setEditableMessage(e.target.value)}
                            className="min-h-[150px] resize-none focus-visible:ring-1"
                            placeholder="Type your message here..."
                        />
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsDialogOpen(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSend}
                            className="w-full sm:w-auto bg-[#25D366] hover:bg-[#128C7E] text-white gap-2"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Send via WhatsApp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

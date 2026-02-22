"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Star, Phone, Scissors } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingModal } from "@/components/booking/BookingModal";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import { GallerySection } from "@/components/salon/GallerySection";

export default function SalonDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const [salon, setSalon] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [isBookingOpen, setIsBookingOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salonRes, servicesRes] = await Promise.all([
                    api.get(`/salons/${id}`),
                    api.get(`/services/salon/${id}`)
                ]);
                setSalon(salonRes.data);
                setServices(servicesRes.data);
            } catch (error) {
                console.error("Failed to load salon data", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleBookClick = (service: any) => {
        if (!user) {
            alert("Please login to book an appointment");
            window.location.href = `/auth/login?redirect=/salons/${id}`;
            return;
        }
        setSelectedService(service);
        setIsBookingOpen(true);
    };

    if (loading) {
        return <div className="container py-10 space-y-8">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-12 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>;
    }

    if (!salon) {
        return <div className="container py-20 text-center">Salon not found</div>;
    }

    return (
        <div className="container py-10 space-y-8">
            {/* Compact Header Section */}
            <div className={`relative h-40 rounded-xl overflow-hidden border border-white/10 shrink-0 ${!salon.images?.[0] ? 'bg-gradient-to-r from-zinc-800 to-zinc-900' : ''}`}>
                {salon.images?.[0] && (
                    <>
                        <img
                            src={salon.images[0]}
                            alt={salon.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                    </>
                )}
                {/* Content Overlay */}
                <div className="absolute bottom-4 left-6 text-white space-y-1 z-10">
                    <h1 className="text-2xl md:text-3xl font-bold">{salon.name}</h1>
                    <div className="flex items-center text-sm text-gray-300">
                        <MapPin className="w-3 h-3 mr-2" />
                        {salon.address}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Main Column: Services (7 cols) */}
                <div className="md:col-span-7 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Services</h2>
                            <span className="text-xs text-muted-foreground">{services.length} available</span>
                        </div>

                        {services.length === 0 ? (
                            <div className="text-muted-foreground text-sm">No services listed yet.</div>
                        ) : (
                            <div className="grid gap-3">
                                {services.map((service) => (
                                    <div key={service._id} className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:bg-white/10 hover:shadow-xl hover:shadow-primary/5">
                                        <div className="flex items-center gap-4">
                                            {/* Icon */}
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                                                {(() => {
                                                    const IconComponent = (require('lucide-react') as any)[service.icon || 'Scissors'] || Scissors;
                                                    return <IconComponent className="h-6 w-6" />;
                                                })()}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 space-y-1">
                                                <h3 className="font-semibold text-lg leading-none tracking-tight">{service.name}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>{service.duration} mins</span>
                                                </div>
                                            </div>

                                            {/* Price & Action */}
                                            <div className="flex flex-col items-end gap-1.5">
                                                <div className="font-bold text-lg">₹{service.price}</div>
                                                <div className="flex flex-col items-end">
                                                    <Button
                                                        size="sm"
                                                        className="h-9 px-6 rounded-full bg-gradient-to-r from-zinc-900 to-black text-white shadow-md shadow-zinc-900/10 hover:shadow-lg hover:shadow-zinc-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 font-semibold tracking-wide"
                                                        onClick={() => handleBookClick(service)}
                                                    >
                                                        Book
                                                    </Button>
                                                    <span className="text-[10px] text-muted-foreground/70 font-medium mt-1 tracking-tight">
                                                        Instant confirmation
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reviews below Services */}
                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <h2 className="text-xl font-semibold">Reviews</h2>
                        <div className="glass-card p-4">
                            <ReviewSection salonId={salon._id} isAuthenticated={!!user} />
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Gallery & About (5 cols) */}
                <div className="md:col-span-5 space-y-6">
                    <GallerySection images={salon.images} />

                    <div className="glass-card p-5 space-y-3">
                        <h3 className="font-semibold text-base">About Salon</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed text-justify">
                            {salon.description || "No description provided."}
                        </p>
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/50 mt-2">
                            <div className={`flex items-center text-sm font-medium ${salon.averageRating > 0 ? 'text-yellow-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                <Star className={`w-3.5 h-3.5 mr-2 ${salon.averageRating > 0 ? 'fill-current' : ''}`} />
                                {salon.averageRating > 0
                                    ? `${salon.averageRating.toFixed(1)} (${salon.totalReviews} reviews)`
                                    : "New on Schedora"
                                }
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-3.5 h-3.5 mr-2" />
                                {salon.openingHours ? "See opening hours" : "Hours not available"}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 mr-2" />
                                {salon.contactNumber || "No contact info"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {selectedService && (
                <BookingModal
                    open={isBookingOpen}
                    onOpenChange={setIsBookingOpen}
                    salon={salon}
                    service={selectedService}
                />
            )}
        </div>
    );
}

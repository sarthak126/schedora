"use client";

import Link from "next/link";
import { MapPin, Star, Clock, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SalonCardProps {
    id: string;
    name: string;
    address: string;
    image: string;
    rating?: number;
    reviewCount?: number;
    openingHours?: any;
}

const isSalonOpen = (hours: any) => {
    if (!hours) return false;
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[now.getDay()];
    const todayHours = hours[day];

    if (!todayHours || !todayHours.open || !todayHours.close) return false;

    // Convert times to minutes
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const currentTotal = currentH * 60 + currentM;
    const openTotal = openH * 60 + openM;
    const closeTotal = closeH * 60 + closeM;

    return currentTotal >= openTotal && currentTotal < closeTotal;
};

export function SalonCard({ id, name, address, image, rating = 0, reviewCount = 0, openingHours }: SalonCardProps) {
    const isOpen = isSalonOpen(openingHours);

    return (
        <Link href={`/salons/${id}`} className="block group">
            <div className="glass-card overflow-hidden hover:border-primary/50 transition-colors h-full flex flex-col">
                <div className="relative h-48 overflow-hidden">
                    {image ? (
                        <img
                            src={image}
                            alt={name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                            <Scissors className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium text-white flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 mr-1" />
                        {rating > 0 ? rating.toFixed(1) : "New"}
                    </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">{name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center mt-1 mb-3">
                        <MapPin className="w-3 h-3 mr-1" />
                        {address}
                    </p>

                    <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className={`flex items-center text-xs font-medium ${isOpen ? 'text-green-500' : 'text-red-500'}`}>
                            <Clock className="w-3 h-3 mr-1" />
                            {isOpen ? 'Open Now' : 'Closed'}
                        </div>
                        <Button size="sm" className="bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                            Book Now
                        </Button>
                    </div>
                </div>
            </div>
        </Link>
    );
}

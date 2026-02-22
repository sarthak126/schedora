"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { SalonCard } from "@/components/cards/SalonCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExplorePage() {
    const [salons, setSalons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchSalons = async (search = "") => {
        setLoading(true);
        try {
            // If searching, append query param
            const endpoint = search ? `/salons?keyword=${search}` : "/salons";
            const { data } = await api.get(endpoint);
            setSalons(data);
        } catch (error) {
            console.error("Failed to fetch salons", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalons();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSalons(searchTerm);
    };

    return (
        <div className="container py-6 md:py-10 space-y-8">


            {/* Category Hub */}
            <div className="flex flex-wrap gap-4">
                <Button variant="default" className="rounded-full bg-white text-black hover:bg-gray-200">
                    Salons
                </Button>
                <Button variant="outline" className="rounded-full opacity-60 cursor-not-allowed" title="Coming Soon">
                    Restaurants <span className="ml-2 text-[10px] bg-primary/20 px-1 rounded">Soon</span>
                </Button>
                <Button variant="outline" className="rounded-full opacity-60 cursor-not-allowed" title="Coming Soon">
                    Hotels <span className="ml-2 text-[10px] bg-primary/20 px-1 rounded">Soon</span>
                </Button>
                <Button variant="outline" className="rounded-full opacity-60 cursor-not-allowed" title="Coming Soon">
                    Hospitals <span className="ml-2 text-[10px] bg-primary/20 px-1 rounded">Soon</span>
                </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-semibold">Top Salons</h2>
                <form onSubmit={handleSearch} className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search salons by name or location..."
                        className="pl-10 glass-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
            </div>


            {
                loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-80 w-full rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <>
                        {salons.length === 0 ? (
                            <div className="text-center py-20">
                                <h3 className="text-xl font-medium text-muted-foreground">No salons found matching your search.</h3>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {salons.map((salon) => (
                                    <SalonCard
                                        key={salon._id}
                                        id={salon._id}
                                        name={salon.name}
                                        address={salon.address}
                                        image={salon.images?.[0]}
                                        rating={salon.averageRating}
                                        reviewCount={salon.totalReviews}
                                        openingHours={salon.openingHours}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )
            }
        </div >
    );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalonProfilePage() {
    const [loading, setLoading] = useState(true);
    const [salon, setSalon] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSalon = async () => {
            try {
                const { data } = await api.get("/salons/me");
                setSalon(data);
            } catch (error: any) {
                console.error("Failed to fetch salon", error);
                if (error.response?.status === 401) {
                    router.push("/auth/login");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSalon();
    }, []);

    if (loading) {
        return <Skeleton className="h-[400px] w-full" />;
    }

    if (!salon) {
        return <div>No Profile Found</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">My Salon Profile</h2>
                <Link href="/dashboard/provider/profile/edit">
                    <Button>Edit Profile</Button>
                </Link>
            </div>

            <div className="glass-card p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Basic Info</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Salon Name</label>
                                <div className="font-medium text-lg">{salon.name}</div>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Description</label>
                                <div className="text-sm">{salon.description}</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Location & Contact</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Address</label>
                                <div className="font-medium">{salon.address}</div>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Contact</label>
                                <div className="font-medium">{salon.contactNumber}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-4">Images</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {salon.images?.map((img: string, i: number) => (
                            <img key={i} src={img} alt="Salon" className="rounded-lg object-cover h-40 w-full" />
                        ))}
                        {salon.images?.length === 0 && <div className="text-sm text-muted-foreground">No images uploaded.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

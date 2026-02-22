"use client";

import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FavoritesPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-bold">Your Favorites</h2>
                <p className="text-muted-foreground max-w-[500px]">
                    This feature is coming soon! You will be able to save your favorite salons and service providers here for quick access.
                </p>
            </div>
            <Link href="/explore">
                <Button>Explore Salons</Button>
            </Link>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { Star, User } from "lucide-react";
import { format } from "date-fns";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
    _id: string;
    user: {
        _id: string;
        name: string;
    };
    rating: number;
    comment: string;
    createdAt: string;
}

interface ReviewListProps {
    salonId: string;
    refreshTrigger: number;
}

export function ReviewList({ salonId, refreshTrigger }: ReviewListProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const { data } = await api.get(`/reviews/${salonId}`);
                setReviews(data);
            } catch (error) {
                console.error("Failed to fetch reviews", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [salonId, refreshTrigger]);

    if (loading) {
        return <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>;
    }

    if (reviews.length === 0) {
        return <div className="text-center text-muted-foreground p-8 glass-card">
            No reviews yet. Be the first to review!
        </div>;
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
                <div key={review._id} className="glass-card p-4 space-y-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <div className="font-semibold text-sm">{review.user.name}</div>
                                <div className="text-xs text-muted-foreground">{format(new Date(review.createdAt), 'PPP')}</div>
                            </div>
                        </div>
                        <div className="flex items-center bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/20">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 mr-1" />
                            <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{review.rating}</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 pl-10">{review.comment}</p>
                </div>
            ))}
        </div>
    );
}

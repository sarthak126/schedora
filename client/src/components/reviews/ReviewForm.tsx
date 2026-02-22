"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this or use standard textarea
import api from "@/lib/api";

interface ReviewFormProps {
    salonId: string;
    onReviewAdded: () => void;
}

export function ReviewForm({ salonId, onReviewAdded }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [hoverRating, setHoverRating] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError("Please select a rating");
            return;
        }
        if (!comment.trim()) {
            setError("Please write a comment");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.post("/reviews", {
                salonId,
                rating,
                comment
            });
            setComment("");
            setRating(0);
            onReviewAdded();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to submit review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-semibold">Write a Review</h3>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="bg-transparent p-0 border-0 focus:outline-none"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                        >
                            <Star
                                className={`w-6 h-6 transition-colors ${star <= (hoverRating || rating)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-muted-foreground"
                                    }`}
                            />
                        </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                        {rating > 0 ? `${rating} Star${rating > 1 ? 's' : ''}` : 'Select a rating'}
                    </span>
                </div>

                <Textarea
                    placeholder="Share your experience..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[100px] bg-background/50"
                    required
                />

                <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                    {loading ? "Submitting..." : "Post Review"}
                </Button>
            </form>
        </div>
    );
}

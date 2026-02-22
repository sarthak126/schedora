"use client";

import { useState } from "react";
import { ReviewList } from "./ReviewList";
import { ReviewForm } from "./ReviewForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

interface ReviewSectionProps {
    salonId: string;
    isAuthenticated: boolean;
}

export function ReviewSection({ salonId, isAuthenticated }: ReviewSectionProps) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [showForm, setShowForm] = useState(false);

    const handleReviewAdded = () => {
        setRefreshTrigger(prev => prev + 1);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-xl flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Reviews
                </h3>
                {isAuthenticated ? (
                    !showForm && (
                        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                            Write a Review
                        </Button>
                    )
                ) : (
                    <Link href={`/auth/login?redirect=/salons/${salonId}`}>
                        <Button variant="ghost" size="sm">Login to Review</Button>
                    </Link>
                )}
            </div>

            {showForm && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <ReviewForm salonId={salonId} onReviewAdded={handleReviewAdded} />
                    <div className="text-center mt-2">
                        <Button variant="link" size="sm" onClick={() => setShowForm(false)} className="text-muted-foreground">Cancel</Button>
                    </div>
                </div>
            )}

            <ReviewList salonId={salonId} refreshTrigger={refreshTrigger} />
        </div>
    );
}

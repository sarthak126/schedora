"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface GallerySectionProps {
    images?: string[];
}

export function GallerySection({ images = [] }: GallerySectionProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Auto-play logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoPlaying && !isLightboxOpen && images.length > 1) {
            interval = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, 3000); // 3 seconds
        }
        return () => clearInterval(interval);
    }, [isAutoPlaying, isLightboxOpen, images.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    }, [images.length]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }, [images.length]);

    if (!images.length) return null;

    return (
        <div className="glass-card p-6 space-y-4">
            <h3 className="font-semibold text-lg flex items-center justify-between">
                Gallery
                <span className="text-xs text-muted-foreground font-normal">{images.length} photos</span>
            </h3>

            {/* Main Carousel Display */}
            <div
                className="relative aspect-square rounded-xl overflow-hidden cursor-zoom-in group border border-black/5 dark:border-white/10"
                onClick={() => setIsLightboxOpen(true)}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
            >
                <AnimatePresence mode="wait">
                    <motion.img
                        key={currentIndex}
                        src={images[currentIndex]}
                        alt={`Gallery Image ${currentIndex + 1}`}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full object-cover absolute inset-0"
                    />
                </AnimatePresence>

                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <div className="text-white text-xs font-medium flex items-center gap-2">
                        <Maximize2 className="w-4 h-4" />
                        Click to expand
                    </div>
                </div>

                {/* Navigation Buttons (Mini) */}
                {images.length > 1 && (
                    <>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handlePrev}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleNext}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </>
                )}
            </div>

            {/* Thumbnail Grid (Bottom) */}
            <div className="grid grid-cols-4 gap-2">
                {images.slice(0, 4).map((img, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "aspect-square rounded-md overflow-hidden cursor-pointer border transition-all",
                            idx === currentIndex ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                        onClick={() => setCurrentIndex(idx)}
                    >
                        <img src={img} className="w-full h-full object-cover" alt="" />
                    </div>
                ))}
                {images.length > 4 && (
                    <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium cursor-pointer hover:bg-muted/80" onClick={() => setIsLightboxOpen(true)}>
                        +{images.length - 4}
                    </div>
                )}
            </div>

            {/* Full Screen Lightbox */}
            <AnimatePresence>
                {isLightboxOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 z-50"
                            onClick={() => setIsLightboxOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        {/* Main Image */}
                        <div className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center p-4">
                            <motion.img
                                key={currentIndex}
                                src={images[currentIndex]}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", damping: 20 }}
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            />

                            {/* Large Navigation Controls */}
                            {images.length > 1 && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                                        onClick={handlePrev}
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
                                        onClick={handleNext}
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* Bottom Thumbnails in Lightbox */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[80vw] p-2 custom-scrollbar">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={cn(
                                        "relative h-12 w-12 shrink-0 rounded-md overflow-hidden border-2 transition-all",
                                        idx === currentIndex ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100"
                                    )}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

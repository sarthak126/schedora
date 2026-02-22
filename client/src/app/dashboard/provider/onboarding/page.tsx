"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Scissors, Sparkles, Dumbbell, Stethoscope, ChevronRight, Check } from "lucide-react";

type BusinessType = 'salon' | 'spa' | 'gym' | 'clinic';

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [businessType, setBusinessType] = useState<BusinessType | null>(null);
    const [loading, setLoading] = useState(false);

    // Business Types Configuration
    const businessTypes = [
        { id: 'salon', label: 'Salon', icon: Scissors, desc: 'Hair, Nails, & Beauty Services', available: true },
        { id: 'spa', label: 'Spa', icon: Sparkles, desc: 'Massage, Therapy, & Wellness', available: false },
        { id: 'gym', label: 'Gym', icon: Dumbbell, desc: 'Fitness, Training, & Yoga', available: false },
        { id: 'clinic', label: 'Clinic', icon: Stethoscope, desc: 'Dental, Skin, & Health', available: false },
    ];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        // Append business type (if backend supports it, otherwise it defaults to salon logic)
        // formData.append('type', businessType || 'salon'); 

        // Construct Opening Hours object (Simplified for v1)
        const openingHours = {
            mon: { open: "09:00", close: "18:00" },
            // ... extend for all days in real app
        };
        formData.append('openingHours', JSON.stringify(openingHours));

        try {
            await api.post("/salons", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            router.push("/dashboard/provider");
        } catch (error) {
            console.error("Failed to create salon", error);
            alert("Failed to create profile. Please check your inputs.");
        } finally {
            setLoading(false);
        }
    };

    const handleTypeSelect = (type: any) => {
        if (!type.available) return;
        setBusinessType(type.id as BusinessType);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 p-4 md:p-0">
            <div className="text-center space-y-1.5 md:space-y-2">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight">
                    {step === 1 ? "Choose Business Type" : "Setup Profile"}
                </h2>
                <p className="text-muted-foreground text-xs md:text-base">
                    {step === 1
                        ? "Select your service category"
                        : `Tell us about your ${businessType === 'salon' ? 'salon' : 'business'}`
                    }
                </p>
            </div>

            {/* Step 1: Business Type Selection */}
            {step === 1 && (
                <div className="space-y-6 md:space-y-8">
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 md:gap-4">
                        {businessTypes.map((type) => {
                            const Icon = type.icon;
                            const isSelected = businessType === type.id;
                            return (
                                <div
                                    key={type.id}
                                    onClick={() => handleTypeSelect(type)}
                                    className={cn(
                                        "relative p-4 md:p-6 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 md:gap-4 hover:scale-[1.02]",
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                                            : "border-muted bg-card hover:border-primary/50",
                                        !type.available && "opacity-60 cursor-not-allowed grayscale hover:scale-100 hover:border-muted"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h3 className="font-semibold text-sm md:text-lg">{type.label}</h3>
                                        <p className="text-sm text-muted-foreground">{type.desc}</p>
                                    </div>

                                    {!type.available && (
                                        <span className="absolute top-2 right-2 text-[10px] md:text-xs bg-muted px-2 py-0.5 rounded-full">Coming Soon</span>
                                    )}

                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center animate-in zoom-in">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-center">
                        <Button
                            size="sm"
                            disabled={!businessType}
                            onClick={() => setStep(2)}
                            className="w-full sm:w-auto px-8 md:px-12 text-xs md:text-sm"
                        >
                            Continue
                            <ChevronRight className="w-4 h-4 ml-1.5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Profile Form */}
            {step === 2 && (
                <div className="glass-card p-4 md:p-8 animate-in slide-in-from-right-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-xs md:text-sm font-medium">
                                {businessType === 'salon' ? 'Salon Name' : 'Business Name'}
                            </label>
                            <Input name="name" placeholder={`e.g. Luxe ${businessType === 'salon' ? 'Studio' : 'Space'}`} className="h-9" required />
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-xs md:text-sm font-medium">Description</label>
                            <textarea
                                name="description"
                                className="flex min-h-[70px] md:min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Short description of your services..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-xs md:text-sm font-medium">Address</label>
                                <Input name="address" placeholder="123 Main St, City" className="h-9" required />
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                                <label className="text-xs md:text-sm font-medium">Contact Number</label>
                                <Input name="contactNumber" placeholder="+1 234 567 890" className="h-9" required />
                            </div>
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                            <label className="text-xs md:text-sm font-medium">Upload Images (Max 3)</label>
                            <Input type="file" name="images" multiple accept="image/*" className="cursor-pointer file:cursor-pointer h-9 text-xs md:text-sm" />
                        </div>

                        <div className="pt-3 md:pt-4 flex justify-between gap-2">
                            <Button type="button" variant="ghost" size="sm" className="text-xs md:text-sm" onClick={() => setStep(1)}>
                                Back
                            </Button>
                            <Button type="submit" disabled={loading} size="sm" className="text-xs md:text-sm">
                                {loading ? "Creating..." : "Create Profile"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

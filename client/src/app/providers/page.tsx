"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, TrendingUp, Users, Calendar } from "lucide-react";

export default function ProvidersPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative py-24 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 -z-10" />
                <div className="container px-4 md:px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 mb-6">
                        Grow Your Salon Business
                    </h1>
                    <p className="mx-auto max-w-[700px] text-muted-foreground text-xl mb-8">
                        Join thousands of top-rated salons using Schedora to manage bookings, attract new clients, and streamline operations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/auth/register?role=provider">
                            <Button size="lg" className="h-12 px-8 text-lg">
                                Partner with Us
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                                Provider Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-secondary/5">
                <div className="container px-4 md:px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="glass-card p-8 rounded-xl space-y-4">
                            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Smart Scheduling</h3>
                            <p className="text-muted-foreground">
                                Eliminate double bookings and reduce no-shows with our automated calendar and reminder system.
                            </p>
                        </div>
                        <div className="glass-card p-8 rounded-xl space-y-4">
                            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Client Management</h3>
                            <p className="text-muted-foreground">
                                Build lasting relationships with built-in CRM tools, appointment history, and customer preferences.
                            </p>
                        </div>
                        <div className="glass-card p-8 rounded-xl space-y-4">
                            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center text-primary">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Business Analytics</h3>
                            <p className="text-muted-foreground">
                                Track revenue, popular services, and staff performance with real-time insights and reports.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="container px-4 md:px-6">
                    <div className="glass-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-12 rounded-3xl text-center">
                        <h2 className="text-3xl font-bold mb-4">Ready to upgrade your salon?</h2>
                        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                            Start your 7-day free trial today. No credit card required for sign up.
                        </p>
                        <Link href="/auth/register?role=provider">
                            <Button size="lg">Get Started Now</Button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

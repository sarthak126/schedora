"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import api from "@/lib/api";
import Script from "next/script";
import { useRouter } from "next/navigation";

export default function PricingPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubscribe = async (plan: string) => {
        setLoading(true);
        try {
            // 1. Create Order
            const { data } = await api.post("/subscriptions/order", { plan });
            const { order, planDetails } = data;

            // 2. Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Schedora Pro",
                description: `Subscription for ${planDetails.name}`,
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify
                        await api.post("/subscriptions/verify", {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            plan: plan
                        });
                        alert("Subscription Active! Welcome to Pro.");
                        router.push("/dashboard/provider");
                    } catch (e) {
                        alert("Verification Failed");
                    }
                },
                theme: { color: "#3399cc" }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error("Subscription failed", error);
            if (error.response?.status === 401) {
                router.push("/auth/login?redirect=/pricing");
            } else {
                alert("Failed to initiate subscription");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-20 px-4">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                <p className="text-muted-foreground">Everything you need to grow your salon business.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Free Plan */}
                <div className="glass-card p-8 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">Free Trial</h3>
                    <div className="text-3xl font-bold mb-6">₹0<span className="text-sm font-normal text-muted-foreground">/7 days</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> 1 Salon Profile</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Up to 3 Services</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Basic Booking Management</li>
                    </ul>
                    <Button variant="outline" disabled>Included Automatically</Button>
                </div>

                {/* Pro Plan */}
                <div className="glass-card p-8 flex flex-col border-primary/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-xs font-bold">POPULAR</div>
                    <h3 className="text-xl font-bold mb-2">Pro</h3>
                    <div className="text-3xl font-bold mb-6">₹499<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Unlimited Services</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Analytics Dashboard</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Priority Support</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Profile Verification Badge</li>
                    </ul>
                    <Button onClick={() => handleSubscribe('pro')} disabled={loading} className="w-full">
                        {loading ? "Processing..." : "Get Started"}
                    </Button>
                </div>

                {/* Business Plan */}
                <div className="glass-card p-8 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">Business</h3>
                    <div className="text-3xl font-bold mb-6">₹999<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Everything in Pro</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Custom Domain</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> Staff Management</li>
                        <li className="flex gap-2"><Check className="w-5 h-5 text-green-500" /> SEO Optimization</li>
                    </ul>
                    <Button onClick={() => handleSubscribe('business')} disabled={loading} variant="outline" className="w-full">
                        Upgrade to Business
                    </Button>
                </div>
            </div>
        </div>
    );
}

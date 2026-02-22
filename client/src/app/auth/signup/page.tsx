"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

import { Suspense } from "react";

function SignupContent() {
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role');
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        role: roleParam === 'provider' ? 'provider' : 'customer' // Default priority to param
    });
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (roleParam === 'provider' || roleParam === 'customer') {
            setFormData(prev => ({ ...prev, role: roleParam }));
        }
    }, [roleParam]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/auth/register", {
                name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                phone: formData.phone
            });

            // Auto login or redirect to login? Let's redirect to login for now or auto-login.
            // Requirement says "Signup / Login", typically auto-login is better UX.
            // Check if backend returns token on register (Yes it does).

            const { data } = await api.post("/auth/login", {
                email: formData.email,
                password: formData.password
            });

            localStorage.setItem("user", JSON.stringify(data));
            window.dispatchEvent(new Event('auth-change'));

            if (data.role === "provider") {
                router.push("/dashboard/provider/onboarding"); // Direct to onboarding
            } else {
                router.push("/");
            }

        } catch (error: any) {
            console.error("Signup failed", error);
            alert(error.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    const isRoleLocked = !!roleParam;

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-6 md:p-8 space-y-6">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">
                        {formData.role === 'provider' ? 'Business Sign Up' : 'Create Account'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {formData.role === 'provider' ? 'Register your salon to get started' : 'Enter your details to get started'}
                    </p>
                </div>
                <form className="space-y-4" onSubmit={handleSignup}>
                    {/* ... Inputs ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="first-name">First name</label>
                            <Input
                                id="first-name"
                                name="firstName"
                                placeholder="John"
                                required
                                value={formData.firstName}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none" htmlFor="last-name">Last name</label>
                            <Input
                                id="last-name"
                                name="lastName"
                                placeholder="Doe"
                                required
                                value={formData.lastName}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
                        <Input
                            id="email"
                            name="email"
                            placeholder="m@example.com"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none" htmlFor="phone">Phone Number</label>
                        <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="+91 9876543210"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                        <p className="text-xs text-muted-foreground">Used for booking confirmations & customer contact</p>
                    </div>

                    {!isRoleLocked && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">I am a...</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center space-x-2 border rounded-md p-3 w-full justify-center cursor-pointer transition-colors ${formData.role === 'customer' ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="customer"
                                        checked={formData.role === "customer"}
                                        onChange={handleChange}
                                        className="accent-primary"
                                    />
                                    <span>Customer</span>
                                </label>
                                <label className={`flex items-center space-x-2 border rounded-md p-3 w-full justify-center cursor-pointer transition-colors ${formData.role === 'provider' ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="provider"
                                        checked={formData.role === "provider"}
                                        onChange={handleChange}
                                        className="accent-primary"
                                    />
                                    <span>Provider</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <Button className="w-full" type="submit" disabled={loading}>
                        {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>
                <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                        Sign in
                    </Link>
                </div>

                <div className="text-center text-xs text-muted-foreground mt-4 pt-4 border-t border-border/50">
                    {formData.role === 'customer' ? (
                        <Link href="/auth/signup?role=provider" replace className="hover:text-primary transition-colors">
                            Own a business? <span className="underline underline-offset-2">Register as a Provider</span>
                        </Link>
                    ) : (
                        <Link href="/auth/signup?role=customer" replace className="hover:text-primary transition-colors">
                            Looking to book? <span className="underline underline-offset-2">Register as a Customer</span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">Loading...</div>}>
            <SignupContent />
        </Suspense>
    );
}

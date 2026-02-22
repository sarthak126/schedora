"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Save, Store, CreditCard, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OpeningHoursEditor } from "@/components/salon/OpeningHoursEditor";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function ProviderSettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState({ name: "", email: "", phone: "" });

    // Salon State
    const [salon, setSalon] = useState<any>(null);
    const [openingHours, setOpeningHours] = useState<any>(null);
    const [salonLoading, setSalonLoading] = useState(true);

    // Payment Configuration State
    const [paymentConfig, setPaymentConfig] = useState({
        isConfigured: false,
        lastVerified: null as string | null
    });
    const [paymentsEnabled, setPaymentsEnabled] = useState(true); // Feature flag
    const [razorpayKeyId, setRazorpayKeyId] = useState("");
    const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
    const [showSecret, setShowSecret] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRes = await api.get("/auth/me");
                setUser({ name: userRes.data.name, email: userRes.data.email, phone: userRes.data.phone || "" });

                try {
                    const salonRes = await api.get("/salons/me");
                    setSalon(salonRes.data);
                    setOpeningHours(salonRes.data.openingHours);
                } catch (err) {
                    console.log("No salon profile yet");
                }

                // Fetch payment configuration status
                try {
                    const paymentRes = await api.get("/payments/salon/status");
                    setPaymentConfig({
                        isConfigured: paymentRes.data.isConfigured,
                        lastVerified: paymentRes.data.lastVerified
                    });
                } catch (err) {
                    console.log("Could not fetch payment status");
                }

                // Check if payments feature is enabled globally
                try {
                    const featureRes = await api.get("/payments/feature-status");
                    setPaymentsEnabled(featureRes.data.paymentsEnabled);
                } catch (err) {
                    console.log("Could not fetch feature status");
                }
            } catch (error: any) {
                console.error("Fetch Error:", error);
                if (error.response?.status === 401) {
                    alert("Session expired. Please login again.");
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    router.push('/auth/login');
                }
            } finally {
                setSalonLoading(false);
            }
        };
        fetchData();
    }, [router]);

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put("/auth/updatedetails", user);
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, name: data.name, email: data.email, phone: data.phone }));
            alert("Account updated successfully!");
        } catch (error: any) {
            alert("Failed to update account.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSalon = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: salon.name,
                description: salon.description,
                address: salon.address,
                contactNumber: salon.contactNumber,
                openingHours: JSON.stringify(openingHours),
                existingImages: JSON.stringify(salon.images || []),
                requireAppointmentApproval: salon.requireAppointmentApproval
            };

            await api.post("/salons", payload);
            alert("Salon settings saved!");
        } catch (error: any) {
            console.error(error);
            alert("Failed to update salon settings.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfigurePayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!razorpayKeyId || !razorpayKeySecret) {
            alert("Please enter both Razorpay Key ID and Key Secret");
            return;
        }

        setPaymentLoading(true);
        try {
            const { data } = await api.post("/payments/salon/configure", {
                razorpay_key_id: razorpayKeyId,
                razorpay_key_secret: razorpayKeySecret
            });

            setPaymentConfig({
                isConfigured: true,
                lastVerified: new Date().toISOString()
            });

            // Clear the secret after successful configuration
            setRazorpayKeySecret("");
            setRazorpayKeyId("");

            alert("Payment configuration saved successfully! Your credentials have been verified.");
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to configure payment settings";
            alert(message);
        } finally {
            setPaymentLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        router.push('/auth/login');
    };

    return (
        <div className="space-y-4 md:space-y-6 p-4 md:p-0">
            <div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">Settings</h3>
                <p className="text-muted-foreground text-xs md:text-sm">Account, business & payment settings</p>
            </div>

            <Tabs defaultValue="account" className="space-y-4">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex h-9">
                    <TabsTrigger value="account" className="text-xs md:text-sm">Account</TabsTrigger>
                    <TabsTrigger value="business" className="text-xs md:text-sm">Business</TabsTrigger>
                    <TabsTrigger value="payment" className="text-xs md:text-sm">💳 Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="account">
                    <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6 max-w-xl">
                        <form onSubmit={handleUpdateUser} className="space-y-3 md:space-y-4">
                            <div className="space-y-1.5 md:space-y-2">
                                <Label htmlFor="name" className="text-xs md:text-sm">Full Name</Label>
                                <Input id="name" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} className="h-9" required />
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                                <Label htmlFor="email" className="text-xs md:text-sm">Email Address</Label>
                                <Input id="email" type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} className="h-9" required />
                            </div>
                            <div className="space-y-1.5 md:space-y-2">
                                <Label htmlFor="phone" className="text-xs md:text-sm">Personal Phone (Private)</Label>
                                <Input id="phone" type="tel" placeholder="+91 9876543210" value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} className="h-9" />
                                <p className="text-xs text-muted-foreground">Used for account recovery. Customers see the number in the Business tab.</p>
                            </div>
                            <Button type="submit" disabled={loading} size="sm" className="text-xs md:text-sm">
                                {loading ? "Saving..." : <><Save className="mr-1.5 h-4 w-4" /> Save Account</>}
                            </Button>
                        </form>

                        <div className="pt-6 border-t border-white/10">
                            <h4 className="text-sm font-semibold mb-4 text-destructive">Danger Zone</h4>
                            <Button variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" /> Log out
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="business">
                    <div className="glass-card p-4 md:p-6 space-y-4 md:space-y-6 max-w-2xl">
                        {salonLoading ? (
                            <div className="text-sm">Loading salon details...</div>
                        ) : salon ? (
                            <form onSubmit={handleUpdateSalon} className="space-y-4 md:space-y-6">
                                <div className="space-y-1.5 md:space-y-2">
                                    <Label className="text-xs md:text-sm">Salon Name</Label>
                                    <Input value={salon.name} onChange={(e) => setSalon({ ...salon, name: e.target.value })} className="h-9" required />
                                </div>
                                <div className="space-y-1.5 md:space-y-2">
                                    <Label className="text-xs md:text-sm">Description</Label>
                                    <Textarea value={salon.description} onChange={(e) => setSalon({ ...salon, description: e.target.value })} className="min-h-[80px] text-sm" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    <div className="space-y-1.5 md:space-y-2">
                                        <Label className="text-xs md:text-sm">Contact Number</Label>
                                        <Input value={salon.contactNumber} onChange={(e) => setSalon({ ...salon, contactNumber: e.target.value })} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5 md:space-y-2">
                                        <Label className="text-xs md:text-sm">Address</Label>
                                        <Input value={salon.address} onChange={(e) => setSalon({ ...salon, address: e.target.value })} className="h-9" />
                                    </div>
                                </div>

                                <div className="space-y-3 md:space-y-4 pt-2">
                                    <div className="flex items-start space-x-3 p-3 md:p-4 border rounded-lg bg-card/50">
                                        <Checkbox
                                            id="requireApproval"
                                            checked={salon.requireAppointmentApproval || false}
                                            onCheckedChange={(checked) => setSalon({ ...salon, requireAppointmentApproval: checked })}
                                        />
                                        <div className="space-y-0.5 leading-none">
                                            <Label htmlFor="requireApproval" className="text-sm md:text-base font-medium cursor-pointer">
                                                Require Approval
                                            </Label>
                                            <p className="text-xs md:text-sm text-muted-foreground">
                                                New bookings need manual confirmation.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 md:pt-4 border-t border-white/10">
                                    <OpeningHoursEditor
                                        initialData={openingHours}
                                        onChange={setOpeningHours}
                                    />
                                </div>

                                <Button type="submit" disabled={loading} size="sm" className="w-full sm:w-auto text-xs md:text-sm">
                                    {loading ? "Saving..." : <><Store className="mr-1.5 h-4 w-4" /> Save Business</>}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-8 md:py-10">
                                <p className="text-sm">No salon profile found.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="payment">
                    <div className="glass-card p-4 md:p-6 space-y-6 max-w-xl">
                        {!paymentsEnabled ? (
                            /* Coming Soon - Payments Disabled */
                            <div className="text-center py-12 space-y-4">
                                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                    <span className="text-4xl">🚀</span>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xl font-bold">Online Payments Coming Soon!</h4>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                                        We're working on integrating secure online payments for your customers.
                                        This feature will allow you to receive payments directly to your account.
                                    </p>
                                </div>
                                <Badge variant="secondary" className="mt-4">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Feature in Development
                                </Badge>
                            </div>
                        ) : (
                            /* Payments Enabled - Show Configuration */
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-lg font-semibold flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            Razorpay Configuration
                                        </h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Configure your Razorpay account to receive customer payments directly
                                        </p>
                                    </div>
                                    {paymentConfig.isConfigured ? (
                                        <Badge variant="default" className="bg-green-600 gap-1">
                                            <CheckCircle className="h-3 w-3" /> Configured
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="gap-1">
                                            <AlertCircle className="h-3 w-3" /> Not Configured
                                        </Badge>
                                    )}
                                </div>

                                {paymentConfig.isConfigured && paymentConfig.lastVerified && (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm">
                                        <p className="text-green-600 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Payment credentials verified on {new Date(paymentConfig.lastVerified).toLocaleDateString()}
                                        </p>
                                        <p className="text-muted-foreground text-xs mt-1">
                                            Customer payments will go directly to your Razorpay account.
                                        </p>
                                    </div>
                                )}

                                <form onSubmit={handleConfigurePayment} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="razorpay_key_id" className="text-sm">
                                            Razorpay Key ID
                                        </Label>
                                        <Input
                                            id="razorpay_key_id"
                                            placeholder="rzp_test_xxxxxxxxxxxx or rzp_live_xxxxxxxxxxxx"
                                            value={razorpayKeyId}
                                            onChange={(e) => setRazorpayKeyId(e.target.value)}
                                            className="h-9 font-mono text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="razorpay_key_secret" className="text-sm">
                                            Razorpay Key Secret
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="razorpay_key_secret"
                                                type={showSecret ? "text" : "password"}
                                                placeholder="Enter your Razorpay Key Secret"
                                                value={razorpayKeySecret}
                                                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                                                className="h-9 font-mono text-sm pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSecret(!showSecret)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Your secret is encrypted before storage and never displayed again.
                                        </p>
                                    </div>

                                    <Button type="submit" disabled={paymentLoading} className="w-full">
                                        {paymentLoading ? (
                                            "Verifying & Saving..."
                                        ) : paymentConfig.isConfigured ? (
                                            <><CreditCard className="mr-2 h-4 w-4" /> Update Configuration</>
                                        ) : (
                                            <><CreditCard className="mr-2 h-4 w-4" /> Configure Payment</>
                                        )}
                                    </Button>
                                </form>

                                <div className="pt-4 border-t border-white/10">
                                    <h5 className="text-sm font-medium mb-2">Need help?</h5>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                        <li>1. Sign up at <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">dashboard.razorpay.com</a></li>
                                        <li>2. Go to Settings → API Keys → Generate Test/Live Keys</li>
                                        <li>3. Copy the Key ID and Secret here</li>
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

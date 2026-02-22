"use client";

import { useEffect, useState, useCallback } from "react";
import { socket } from "@/lib/socket";
import { Bell, X, Calendar, Clock, User } from "lucide-react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";

interface AppointmentNotification {
    title: string;
    message: string;
    bookingId: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    count: number;
    salonName: string;
}

interface ToastNotification extends AppointmentNotification {
    id: string;
    timestamp: Date;
}

export function NotificationProvider() {
    const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
    const [toasts, setToasts] = useState<ToastNotification[]>([]);
    const [showPermissionBanner, setShowPermissionBanner] = useState(false);
    const pathname = usePathname();
    const [authEventTick, setAuthEventTick] = useState(0);

    // Listen to custom auth events (fires when user logs in/out)
    useEffect(() => {
        const handleAuthChange = () => setAuthEventTick(prev => prev + 1);
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    // Subscribe to Web Push notifications (works even when tab is closed)
    const subscribeToPush = useCallback(async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

            const registration = await navigator.serviceWorker.ready;

            // Get VAPID public key from server
            const { data } = await api.get('/push/vapid-public-key');
            if (!data.publicKey) return;

            // Convert VAPID key to Uint8Array
            const urlBase64ToUint8Array = (base64String: string) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Subscribe to push
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(data.publicKey)
                });
            }

            // Send subscription to server
            await api.post('/push/subscribe', { subscription: subscription.toJSON() });
            console.log('📲 Push subscription registered');
        } catch (err) {
            console.warn('Push subscription failed:', err);
        }
    }, []);

    // Request notification permission and subscribe to push
    const requestPermission = useCallback(async () => {
        if (!("Notification" in window)) return;
        try {
            const permission = await Notification.requestPermission();
            setPermissionState(permission);
            if (permission === "granted") {
                setShowPermissionBanner(false);
                // Subscribe to Web Push after permission is granted
                subscribeToPush();
            }
        } catch (err) {
            console.error("Notification permission error:", err);
        }
    }, [subscribeToPush]);

    // Show browser notification
    const showBrowserNotification = useCallback((data: AppointmentNotification) => {
        if (typeof window === 'undefined' || !("Notification" in window) || Notification.permission !== "granted") return;

        try {
            const notification = new Notification(data.title, {
                body: data.message,
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                tag: `appointment-${data.bookingId}`,
                requireInteraction: true,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 10000);
        } catch {
            // Fallback to ServiceWorker notification
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(data.title, {
                        body: data.message,
                        icon: "/favicon.ico",
                        badge: "/favicon.ico",
                        tag: `appointment-${data.bookingId}`,
                        requireInteraction: true,
                    });
                }).catch(() => { });
            }
        }
    }, []);

    // Show in-app toast
    const showToast = useCallback((data: AppointmentNotification) => {
        const toastId = `${data.bookingId}_${Date.now()}`;
        const toast: ToastNotification = {
            ...data,
            id: toastId,
            timestamp: new Date(),
        };

        setToasts(prev => [toast, ...prev].slice(0, 5));

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 8000);
    }, []);

    // Remove toast
    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Play notification sound
    const playSound = useCallback(() => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            const playTone = (freq: number, startTime: number, duration: number) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = freq;
                oscillator.type = "sine";

                gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + startTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);

                oscillator.start(audioContext.currentTime + startTime);
                oscillator.stop(audioContext.currentTime + startTime + duration);
            };

            playTone(587.33, 0, 0.3);
            playTone(880, 0.15, 0.4);
            playTone(1174.66, 0.3, 0.5);
        } catch {
            // Audio not available
        }
    }, []);

    // Main socket effect — manages connection and notification listening
    useEffect(() => {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => { });
        }

        // Get user info
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return;

        let user: any;
        try {
            user = JSON.parse(storedUser);
        } catch {
            return;
        }

        const userId = user._id || user.id;
        if (user.role !== "provider" || !userId) return;

        // Check notification permission
        if ("Notification" in window) {
            setPermissionState(Notification.permission);
            if (Notification.permission === "default") {
                setShowPermissionBanner(true);
            } else if (Notification.permission === "granted") {
                // Already granted — ensure push subscription is active
                subscribeToPush();
            }
        }

        // Handle incoming appointment notifications (socket — for when tab is open)
        const handleNewAppointment = (data: AppointmentNotification) => {
            playSound();
            showBrowserNotification(data);
            showToast(data);
        };

        socket.on("new_appointment", handleNewAppointment);

        // Join provider-specific notification room
        const joinProviderRoom = () => {
            socket.emit("join_provider", userId);
        };

        const handleConnectError = (err: Error) => {
            if (err.message !== "xhr poll error") {
                console.warn("Socket connection warning:", err.message);
            }
        };

        const handleReconnect = () => {
            joinProviderRoom();
        };

        socket.on("connect", joinProviderRoom);
        socket.on("reconnect", handleReconnect);
        socket.on("connect_error", handleConnectError);

        if (!socket.connected) {
            socket.connect();
        } else {
            joinProviderRoom();
        }

        // Safety net: periodically re-join room
        const rejoinInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit("join_provider", userId);
            }
        }, 30000);

        return () => {
            socket.off("new_appointment", handleNewAppointment);
            socket.off("connect", joinProviderRoom);
            socket.off("reconnect", handleReconnect);
            socket.off("connect_error", handleConnectError);
            clearInterval(rejoinInterval);
        };
    }, [showBrowserNotification, showToast, playSound, subscribeToPush, pathname, authEventTick]);

    return (
        <>
            {/* Permission Banner */}
            {showPermissionBanner && permissionState === "default" && (
                <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-lg animate-in slide-in-from-top duration-500">
                    <div className="bg-gradient-to-r from-primary/90 to-primary rounded-2xl p-4 shadow-2xl shadow-primary/20 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white/20 rounded-xl shrink-0">
                                <Bell className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white">
                                    Enable Notifications
                                </h4>
                                <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                                    Get instant alerts when customers book appointments — even when this tab is closed.
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={requestPermission}
                                        className="px-4 py-1.5 bg-white text-primary text-xs font-bold rounded-lg hover:bg-white/90 transition-colors shadow-sm"
                                    >
                                        Enable
                                    </button>
                                    <button
                                        onClick={() => setShowPermissionBanner(false)}
                                        className="px-4 py-1.5 text-white/80 text-xs font-medium rounded-lg hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        Later
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowPermissionBanner(false)}
                                className="text-white/60 hover:text-white transition-colors p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed top-20 right-4 z-[999] flex flex-col gap-3 w-[95%] max-w-sm pointer-events-none">
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        className="pointer-events-auto animate-in slide-in-from-right duration-500 fill-mode-forwards"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden group hover:shadow-3xl transition-shadow duration-300">
                            <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />

                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl shrink-0 ring-1 ring-green-500/20">
                                        <Bell className="w-4 h-4 text-green-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-sm font-bold text-foreground truncate">
                                                {toast.title}
                                            </h4>
                                            <button
                                                onClick={() => removeToast(toast.id)}
                                                className="text-muted-foreground/40 hover:text-foreground transition-colors p-0.5 shrink-0 opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="w-3 h-3 shrink-0" />
                                                <span className="truncate font-medium text-foreground/80">{toast.customerName}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 shrink-0" />
                                                    <span>{new Date(toast.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 shrink-0" />
                                                    <span>{toast.time}</span>
                                                </div>
                                            </div>
                                            <div className="inline-flex items-center px-2 py-0.5 bg-primary/5 rounded-md">
                                                <span className="text-[11px] font-medium text-primary">{toast.serviceName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 h-0.5 bg-muted/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
                                        style={{
                                            animation: 'shrinkWidth 8s linear forwards'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shrinkWidth {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}} />
        </>
    );
}

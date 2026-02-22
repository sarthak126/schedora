"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface RazorpayOptions {
    key_id: string;
    amount: number;
    currency?: string;
    order_id: string;
    name?: string;
    description?: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    theme?: {
        color?: string;
    };
}

interface PaymentResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface UseRazorpayReturn {
    isLoaded: boolean;
    isLoading: boolean;
    error: string | null;
    openCheckout: (options: RazorpayOptions) => Promise<PaymentResponse>;
}

/**
 * Hook to handle Razorpay checkout integration
 * Dynamically loads Razorpay SDK and provides checkout function
 */
export function useRazorpay(): UseRazorpayReturn {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Razorpay script on mount
    useEffect(() => {
        // Check if already loaded
        if (window.Razorpay) {
            setIsLoaded(true);
            return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => setIsLoaded(true));
            return;
        }

        // Load script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;

        script.onload = () => {
            setIsLoaded(true);
        };

        script.onerror = () => {
            setError('Failed to load Razorpay SDK');
        };

        document.body.appendChild(script);

        return () => {
            // Don't remove script on unmount - might be used elsewhere
        };
    }, []);

    const openCheckout = useCallback((options: RazorpayOptions): Promise<PaymentResponse> => {
        return new Promise((resolve, reject) => {
            if (!window.Razorpay) {
                reject(new Error('Razorpay SDK not loaded'));
                return;
            }

            setIsLoading(true);
            setError(null);

            const razorpayOptions = {
                key: options.key_id,
                amount: options.amount,
                currency: options.currency || 'INR',
                order_id: options.order_id,
                name: options.name || 'Schedora',
                description: options.description || 'Service Payment',
                prefill: options.prefill || {},
                theme: {
                    color: options.theme?.color || '#6366f1' // Primary indigo
                },
                handler: function (response: PaymentResponse) {
                    setIsLoading(false);
                    resolve(response);
                },
                modal: {
                    ondismiss: function () {
                        setIsLoading(false);
                        reject(new Error('Payment cancelled by user'));
                    },
                    escape: true,
                    animation: true
                }
            };

            try {
                const razorpayInstance = new window.Razorpay(razorpayOptions);
                razorpayInstance.on('payment.failed', function (response: any) {
                    setIsLoading(false);
                    setError(response.error.description || 'Payment failed');
                    reject(new Error(response.error.description || 'Payment failed'));
                });
                razorpayInstance.open();
            } catch (err: any) {
                setIsLoading(false);
                setError(err.message);
                reject(err);
            }
        });
    }, []);

    return {
        isLoaded,
        isLoading,
        error,
        openCheckout
    };
}

export default useRazorpay;

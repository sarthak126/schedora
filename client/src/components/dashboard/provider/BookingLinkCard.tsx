"use client";

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import QRCode from "qrcode";

interface BookingLinkCardProps {
    salonId: string;
    salonName: string;
}

export function BookingLinkCard({ salonId, salonName }: BookingLinkCardProps) {
    const [link, setLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [qrImage, setQrImage] = useState<string>("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const url = `${window.location.origin}/salons/${salonId}`;
            setLink(url);

            // Generate QR for preview
            QRCode.toDataURL(url, {
                width: 400,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            }).then(setQrImage).catch(err => console.error(err));
        }
    }, [salonId]);

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadQR = async () => {
        if (!qrImage) return;
        const linkElement = document.createElement("a");
        linkElement.href = qrImage;
        linkElement.download = `${salonName.replace(/\s+/g, '-').toLowerCase()}-booking-qr.png`;
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);
    };

    return (
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200/60 dark:from-zinc-900 dark:to-zinc-950 dark:border-zinc-800 rounded-2xl p-6 shadow-sm h-full flex flex-col justify-between overflow-hidden relative group transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col items-center text-center space-y-4">

                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm mt-2">
                    {qrImage ? (
                        <img src={qrImage} alt="QR Code" className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-lg opacity-90 transition-opacity hover:opacity-100" />
                    ) : (
                        <div className="w-32 h-32 bg-gray-100 rounded-lg animate-pulse" />
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Booking Link</h3>
                </div>

                {/* Link display with copy button */}
                <div className="w-full flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-600 dark:text-gray-300 break-all flex-1 select-all font-mono leading-relaxed">
                        {link.replace(/^https?:\/\//, '')}
                    </p>
                    <button
                        onClick={handleCopy}
                        className="shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
                        title="Copy link"
                    >
                        {copied ? (
                            <Check size={14} className="text-green-500" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        )}
                    </button>
                </div>

                {/* Feedback text */}
                {copied && (
                    <p className="text-xs text-green-500 font-medium animate-in fade-in duration-200">✓ Copied to clipboard!</p>
                )}

                <div className="flex gap-2 w-full max-w-[240px]">
                    <button
                        onClick={handleCopy}
                        className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 dark:bg-zinc-800 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-700"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : "Copy Link"}
                    </button>
                    <button
                        onClick={handleDownloadQR}
                        className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                        <Download size={14} /> Save QR
                    </button>
                </div>
            </div>
        </div>
    );
}

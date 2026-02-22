import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";
import { GlobalNotificationWrapper } from "@/components/dashboard/GlobalNotificationWrapper";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Schedora | Premium Service Booking",
  description: "Discover and book the world's best salons and spas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(outfit.className, "min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-white pb-16 md:pb-0")}>
        <Navbar />
        {children}
        <BottomNav />
        <div className="hidden md:block">
          <Footer />
        </div>
        <GlobalNotificationWrapper />
      </body>
    </html>
  );
}

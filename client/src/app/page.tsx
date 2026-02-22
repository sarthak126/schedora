"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Scissors, Store, Sparkles } from "lucide-react"

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === "provider") {
          router.push("/dashboard/provider");
        } else if (user.role === "admin") {
          router.push("/dashboard/admin");
        } else if (user.role === "customer") {
          router.push("/dashboard/customer");
        }
      } catch (err) {
        console.error("Failed to parse user", err);
      }
    }
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center px-6 pt-12 pb-24 md:p-24 md:pt-12 bg-gradient-to-b from-background to-secondary/20">

      {/* Hero Section */}
      <div className="relative flex flex-col items-center text-center mt-4 mb-16 md:mb-32">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/50 py-2">
          Elevate Your <br /> Service Experience
        </h1>
        <p className="mt-4 max-w-[600px] text-muted-foreground md:text-xl">
          The premium platform for discovering and booking the world's best services.
        </p>

        <div className="mt-8 flex gap-4">
          <Link href="/explore">
            <Button size="lg" className="rounded-full px-8 shadow-2xl shadow-primary/20">Find Salons</Button>
          </Link>
          <Link href="/auth/signup?role=provider">
            <Button variant="outline" size="lg" className="rounded-full px-8">For Businesses</Button>
          </Link>
        </div>
      </div>

      {/* Categories Section */}
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Explore Categories</h2>
          <p className="text-muted-foreground mt-2">Find exactly what you are looking for</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Salons Category */}
          <Link href="/explore" className="group">
            <div className="glass-card p-8 flex flex-col items-center text-center hover:bg-white/5 transition-all cursor-pointer h-full border-primary/20 hover:border-primary">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Scissors className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Salons & Spas</h3>
              <p className="text-sm text-muted-foreground mb-4">Haircuts, styling, massages, and more.</p>
              <span className="text-primary text-sm font-medium group-hover:underline">Browse Salons &rarr;</span>
            </div>
          </Link>

          {/* Coming Soon Categories */}
          <div className="glass-card p-8 flex flex-col items-center text-center opacity-60">
            <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Makeup Artists</h3>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </div>

          <div className="glass-card p-8 flex flex-col items-center text-center opacity-60">
            <div className="h-16 w-16 rounded-full bg-secondary/20 flex items-center justify-center mb-6">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Clinics</h3>
            <p className="text-sm text-muted-foreground">Coming Soon</p>
          </div>
        </div>
      </div>
    </main>
  )
}


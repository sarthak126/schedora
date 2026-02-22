import Link from "next/link"

export function Footer() {
    return (
        <footer className="w-full border-t border-black/5 bg-background py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-4">
                        <h4 className="text-lg font-bold">Schedora</h4>
                        <p className="text-sm text-muted-foreground">
                            Connecting you with the best service providers in your city.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Platform</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/explore" className="hover:underline">Browse Salons</Link></li>
                            <li><Link href="/providers" className="hover:underline">For Partners</Link></li>
                            <li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Support</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/help" className="hover:underline">Help Center</Link></li>
                            <li><Link href="/terms" className="hover:underline">Terms of Service</Link></li>
                            <li><Link href="/privacy" className="hover:underline">Privacy Policy</Link></li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Contact</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>support@schedora.com</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-10 border-t border-black/5 pt-6 text-center text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Schedora Inc. All rights reserved.
                </div>
            </div>
        </footer>
    )
}

"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
            router.push("/auth/login");
            return;
        }
        try {
            const user = JSON.parse(userStr);
            if (user.role !== "admin") {
                router.push("/dashboard/customer/bookings"); // boot out non-admins
                return;
            }
            setAuthorized(true);
        } catch (e) {
            router.push("/auth/login");
        }
    }, [router]);

    if (!authorized) return null;

    return (
        <div className="flex-1 w-full">
            {children}
        </div>
    );
}

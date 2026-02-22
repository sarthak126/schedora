"use client";

import dynamic from "next/dynamic";

export const GlobalNotificationWrapper = dynamic(
    () => import("@/components/dashboard/NotificationProvider").then(mod => mod.NotificationProvider),
    { ssr: false }
);

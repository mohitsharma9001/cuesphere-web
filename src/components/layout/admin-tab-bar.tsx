"use client";

import { LayoutDashboard, Radio, Settings, Timer, Trophy } from "lucide-react";

import { MobileTabBar, type MobileTab } from "@/components/layout/mobile-tab-bar";

/** Bottom tabs for the club admin panel on phones (replaces the sidebar there). */
export function AdminTabBar({ basePath, scorekeeperOnly }: { basePath: string; scorekeeperOnly: boolean }) {
  const tabs: MobileTab[] = scorekeeperOnly
    ? [{ href: `${basePath}/live`, label: "Live Scoring", icon: Radio }]
    : [
        { href: basePath, label: "Overview", icon: LayoutDashboard, exact: true },
        // Gallery stays in the desktop sidebar and on the Settings page.
        { href: `${basePath}/tables`, label: "Tables", icon: Timer },
        { href: `${basePath}/tournaments`, label: "Tournaments", icon: Trophy },
        { href: `${basePath}/live`, label: "Live", icon: Radio },
        { href: `${basePath}/settings`, label: "Settings", icon: Settings },
      ];

  return <MobileTabBar tabs={tabs} label="Admin" />;
}

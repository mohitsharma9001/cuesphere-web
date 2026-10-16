"use client";

import { Home, LayoutDashboard, LogIn, Radio, Trophy, UserRound, Users } from "lucide-react";

import { MobileTabBar, type MobileTab } from "@/components/layout/mobile-tab-bar";
import { useViewer } from "@/components/shared/viewer-provider";
import { useClub } from "@/components/shared/club-provider";
import { useClubViewer } from "@/components/shared/club-viewer-provider";
import { isScorekeeperOnly, isStaffRole } from "@/types/club";

/** Bottom tabs for a club's public pages; staff also get a shortcut to the admin panel. */
export function ClubTabBar() {
  const viewer = useViewer();
  const { basePath } = useClub();
  const { membership } = useClubViewer();

  const tabs: MobileTab[] = [
    { href: basePath, label: "Home", icon: Home, exact: true },
    { href: `${basePath}/tournaments`, label: "Tournaments", icon: Trophy },
    { href: `${basePath}/live`, label: "Live", icon: Radio },
  ];

  if (isScorekeeperOnly(membership?.role)) {
    tabs.push({ href: `${basePath}/admin/live`, label: "Score", icon: LayoutDashboard });
  } else if (isStaffRole(membership?.role)) {
    tabs.push({ href: `${basePath}/admin`, label: "Admin", icon: LayoutDashboard });
  } else if (viewer.user) {
    tabs.push({ href: "/friends", label: "Friends", icon: Users });
  }

  if (!viewer.user) {
    tabs.push({ href: `${basePath}/login`, label: "Log in", icon: LogIn });
  } else if (viewer.profile) {
    tabs.push({ href: `${basePath}/players/${viewer.profile.id}`, label: "Me", icon: UserRound });
  } else {
    tabs.push({ href: `${basePath}/account/profile`, label: "Me", icon: UserRound });
  }

  return <MobileTabBar tabs={tabs} />;
}

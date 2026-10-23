import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Admin Login" };

/** Login for CueSphere platform admins; goes straight to Club Approvals. */
export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <span className="mt-6 block text-xs font-bold uppercase tracking-[0.2em] text-primary">CueSphere Admin</span>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Admin login</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            For the CueSphere team. Approve new clubs and manage the platform.
          </p>

          <div className="mt-8">
            <LoginForm redirectTo="/platform/admin" admin />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Have an admin code?{" "}
            <Link href="/admin/register" className="font-medium text-primary hover:underline">
              Create admin account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Not an admin?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Player login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

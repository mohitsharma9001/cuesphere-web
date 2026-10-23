import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { PlatformHeader } from "@/components/layout/platform-header";
import { AdminRegisterForm } from "@/features/auth/components/admin-register-form";

export const metadata: Metadata = { title: "Create Admin Account" };

/** Admin sign-up: needs the admin code (ADMIN_SIGNUP_CODE on the API). */
export default function AdminRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-6" />
          </div>
          <span className="mt-6 block text-xs font-bold uppercase tracking-[0.2em] text-primary">CueSphere Admin</span>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Create admin account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need the admin code from the CueSphere team. Already have a player account? Use its email and password to upgrade it.
          </p>

          <div className="mt-8">
            <AdminRegisterForm />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already an admin?{" "}
            <Link href="/admin/login" className="font-medium text-primary hover:underline">
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

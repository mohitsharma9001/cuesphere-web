import { PlatformHeader } from "@/components/layout/platform-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <PlatformHeader />
      <main className="flex-1">
        <PageSkeleton />
      </main>
    </div>
  );
}

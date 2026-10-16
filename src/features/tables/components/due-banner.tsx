import Link from "next/link";
import { ChevronRight, IndianRupee } from "lucide-react";

import { clubPath } from "@/lib/club-path";
import { formatRupees } from "@/types/tables";

/** "You owe ₹540 here" for the signed-in player — only their own amount. */
export function DueBanner({ clubSlug, amount }: { clubSlug: string; amount: number }) {
  if (amount <= 0) return null;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
      <Link
        href={clubPath(clubSlug, "/account/dues")}
        className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 transition-colors hover:bg-primary/15"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-primary">
            <IndianRupee className="size-4" />
          </span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-primary">You owe here</span>
            <span className="font-heading text-xl font-bold text-foreground">{formatRupees(amount)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-primary">
          Details <ChevronRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}

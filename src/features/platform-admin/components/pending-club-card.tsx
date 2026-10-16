"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Mail, MapPin, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveClubAction, rejectClubAction } from "@/app/actions/platform-actions";
import type { Club } from "@/types/club";

export function PendingClubCard({ club, place, ownerEmail }: { club: Club; place?: string; ownerEmail?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);
  const [resolved, setResolved] = React.useState(false);

  async function handle(action: (id: string) => Promise<{ success: boolean; error?: string }>, done: string) {
    setIsPending(true);
    const result = await action(club.id);
    setIsPending(false);

    if (!result.success) {
      toast.error(result.error ?? "Something went wrong.");
      return;
    }

    toast.success(done);
    setResolved(true);
    // Refreshes the lists and the pending count in the menu.
    router.refresh();
  }

  if (resolved) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div>
          <p className="font-heading text-base font-semibold text-foreground">{club.name}</p>
          {club.tagline ? (
            <p className="text-sm text-muted-foreground">{club.tagline}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">/c/{club.slug}</p>
          {place ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 text-primary" /> {place}
            </p>
          ) : null}
          {ownerEmail ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3.5 text-primary" /> {ownerEmail}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(`Reject and delete "${club.name}"?`)) handle(rejectClubAction, `${club.name} rejected`);
            }}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            Reject
          </Button>
          <Button size="sm" disabled={isPending} onClick={() => handle(approveClubAction, `${club.name} is live`)}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

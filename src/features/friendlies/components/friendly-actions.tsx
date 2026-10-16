"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Play, Share2, ThumbsDown, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  cancelFriendlyAction,
  confirmFriendlyAction,
  disputeFriendlyAction,
  respondToFriendlyAction,
  startFriendlyAction,
} from "@/app/actions/friendly-actions";

type Result = { success: true } | { success: false; error: string };

function useRun() {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  async function run(key: string, fn: () => Promise<Result>, done?: string) {
    setBusy(key);
    const result = await fn();
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (done) toast.success(done);
    router.refresh();
  }
  return { busy, run };
}

const spin = <Loader2 className="size-4 animate-spin" />;

export function RespondButtons({ matchId }: { matchId: string }) {
  const { busy, run } = useRun();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" size="lg" disabled={!!busy} onClick={() => run("no", () => respondToFriendlyAction(matchId, false), "Challenge declined")}>
        {busy === "no" ? spin : <X className="size-4" />} Decline
      </Button>
      <Button size="lg" disabled={!!busy} onClick={() => run("yes", () => respondToFriendlyAction(matchId, true), "Challenge accepted")}>
        {busy === "yes" ? spin : <Check className="size-4" />} Accept
      </Button>
    </div>
  );
}

export function StartButton({ matchId }: { matchId: string }) {
  const { busy, run } = useRun();
  return (
    <Button size="lg" className="w-full" disabled={!!busy} onClick={() => run("start", () => startFriendlyAction(matchId), "You're live")}>
      {busy ? spin : <Play className="size-4" />} Start match
    </Button>
  );
}

export function CancelButton({ matchId }: { matchId: string }) {
  const { busy, run } = useRun();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full text-muted-foreground"
      disabled={!!busy}
      onClick={() => {
        if (window.confirm("Call off this match?")) run("cancel", () => cancelFriendlyAction(matchId), "Match cancelled");
      }}
    >
      {busy ? spin : null} Cancel match
    </Button>
  );
}

export function ConfirmButtons({ matchId }: { matchId: string }) {
  const { busy, run } = useRun();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="lg"
        disabled={!!busy}
        onClick={() => {
          if (window.confirm("Reopen the match so the score can be corrected?")) {
            run("no", () => disputeFriendlyAction(matchId), "Match reopened for correction");
          }
        }}
      >
        {busy === "no" ? spin : <ThumbsDown className="size-4" />} Score is wrong
      </Button>
      <Button size="lg" disabled={!!busy} onClick={() => run("yes", () => confirmFriendlyAction(matchId), "Result confirmed")}>
        {busy === "yes" ? spin : <Check className="size-4" />} Confirm
      </Button>
    </div>
  );
}

/** Result card share: the phone's share sheet where available, WhatsApp otherwise. */
export function ShareResult({ text, url }: { text: string; url: string }) {
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "CueSphere result", text, url });
        return;
      } catch {
        // Cancelled — fall through to nothing.
        return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
  }
  return (
    <Button size="lg" className="w-full" onClick={share}>
      <Share2 className="size-4" /> Share result
    </Button>
  );
}

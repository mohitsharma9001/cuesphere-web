"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, LayoutGrid, Loader2, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { approveEnquiryAction, rejectEnquiryAction } from "@/app/actions/platform-actions";
import type { AdminClubEnquiry } from "@/types/club-enquiry";

const QUICK_REASONS = ["We couldn't reach you on that number.", "Please send more details about the club.", "This doesn't look like a snooker or pool club."];

/** A player's request to open a club, with Approve / Reject (with a reason the player sees). */
export function PendingEnquiryCard({ enquiry: e }: { enquiry: AdminClubEnquiry }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [resolved, setResolved] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState("");

  async function approve() {
    setBusy(true);
    const result = await approveEnquiryAction(e.id);
    setBusy(false);
    if (!result.success) return void toast.error(result.error);
    toast.success(`${e.ownerName} can now create ${e.clubName}`);
    setResolved(true);
    router.refresh(); // lists + header count
  }

  async function reject() {
    setBusy(true);
    const result = await rejectEnquiryAction(e.id, reason);
    setBusy(false);
    if (!result.success) return void toast.error(result.error);
    toast.success("Request rejected — the player sees your reason");
    setRejecting(false);
    setResolved(true);
    router.refresh();
  }

  if (resolved) return null;
  const mobile = `+91 ${e.mobile.slice(0, 5)} ${e.mobile.slice(5)}`;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-heading text-base font-semibold text-foreground">{e.clubName}</p>
            <p className="text-sm text-muted-foreground">by {e.ownerName}</p>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 sm:gap-x-6">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-primary" /> {[e.cityName, e.stateName].filter(Boolean).join(", ")}
              </span>
              <span className="flex items-center gap-1.5">
                <LayoutGrid className="size-3.5 text-primary" /> {e.tables} {e.tables === 1 ? "table" : "tables"}
              </span>
              {e.email ? (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5 text-primary" /> {e.email}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" /> Sent {new Date(e.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
              <X className="size-4" /> Reject
            </Button>
            <Button size="sm" disabled={busy} onClick={approve}>
              {busy && !rejecting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Approve
            </Button>
          </div>
        </div>

        {e.message ? <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">&ldquo;{e.message}&rdquo;</p> : null}

        <div className="flex flex-wrap gap-2 text-sm">
          <a href={`tel:+91${e.mobile}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium text-primary hover:bg-white/5">
            <Phone className="size-4" /> {mobile}
          </a>
          <a
            href={`https://wa.me/91${e.mobile}?text=${encodeURIComponent(`Hi ${e.ownerName}, this is CueSphere about your request for ${e.clubName}.`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-medium text-primary hover:bg-white/5"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        </div>
      </CardContent>

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {e.clubName}?</DialogTitle>
            <DialogDescription>The player sees this reason and can send a new request.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1 text-xs ${reason === r ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="Why can't we approve this yet?" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={busy || reason.trim().length < 3}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Reject request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

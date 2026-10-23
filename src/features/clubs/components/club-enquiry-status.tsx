import Link from "next/link";
import { CheckCircle2, Clock, Hourglass, XCircle } from "lucide-react";

import type { ClubEnquiry, EnquiryStage } from "@/types/club-enquiry";

/** Where the player's club request stands (pending, rejected, club waiting). */
export function ClubEnquiryStatus({ stage, enquiry }: { stage: EnquiryStage; enquiry: ClubEnquiry | null }) {
  if (stage === "pending") {
    return (
      <StatusCard tone="amber" icon={<Hourglass className="size-5" />} title="Request sent">
        We&apos;re reviewing your request for <strong>{enquiry?.clubName}</strong>. We&apos;ll let you know soon — usually within a day.
      </StatusCard>
    );
  }
  if (stage === "rejected") {
    return (
      <StatusCard tone="red" icon={<XCircle className="size-5" />} title="Request not approved">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">Reason from CueSphere</span>
        <span className="mt-1 block text-foreground">{enquiry?.rejectReason}</span>
        <Link href="/clubs/new?resend=1" className="mt-4 inline-flex font-medium text-primary hover:underline">
          Send a new request →
        </Link>
      </StatusCard>
    );
  }
  if (stage === "club_pending") {
    return (
      <StatusCard tone="blue" icon={<Clock className="size-5" />} title="Your club is waiting for approval">
        The CueSphere team is checking your club. Once approved, it goes live and you can manage it from the club admin.
      </StatusCard>
    );
  }
  return (
    <StatusCard tone="green" icon={<CheckCircle2 className="size-5" />} title="Approved">
      Your request is approved — add your club&apos;s details below.
    </StatusCard>
  );
}

const TONES = {
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  red: "border-red-500/40 bg-red-500/10 text-red-400",
  blue: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
};

function StatusCard({ tone, icon, title, children }: { tone: keyof typeof TONES; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-5 ${TONES[tone]}`}>
      <div className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

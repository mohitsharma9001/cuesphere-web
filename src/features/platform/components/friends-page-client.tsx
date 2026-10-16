"use client";

import Link from "next/link";
import {
  PlayerAvatar,
  PlayerActions,
  PlayerNameWithClub,
  type PlayerDirectoryEntry,
} from "@/features/platform/components/players-browse-client";

function Section({ title, entries }: { title: string; entries: PlayerDirectoryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({entries.length})
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.profile.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Link href={`/players/${entry.profile.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <PlayerAvatar profile={entry.profile} />
              <div className="min-w-0 flex-1">
                <PlayerNameWithClub entry={entry} />
                {entry.profile.city ? <p className="truncate text-xs text-muted-foreground">{entry.profile.city}</p> : null}
              </div>
            </Link>
            <PlayerActions entry={entry} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FriendsPageClient({
  friends,
  incoming,
  outgoing,
}: {
  friends: PlayerDirectoryEntry[];
  incoming: PlayerDirectoryEntry[];
  outgoing: PlayerDirectoryEntry[];
}) {
  return (
    <div className="space-y-8">
      <Section title="Friend Requests" entries={incoming} />
      <Section title="Friends" entries={friends} />
      <Section title="Pending" entries={outgoing} />
    </div>
  );
}

"use client";

import * as React from "react";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { followPlayerAction, unfollowPlayerAction } from "@/app/actions/follow-actions";

/** One-way follow: see the player's live matches on your Friends page and get
 * a notification when they start playing. No request or approval needed. */
export function FollowButton({
  playerId,
  playerName,
  initialFollowing,
}: {
  playerId: string;
  playerName: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = React.useState(initialFollowing);
  const [isPending, startTransition] = React.useTransition();

  function toggle() {
    startTransition(async () => {
      const result = following ? await unfollowPlayerAction(playerId) : await followPlayerAction(playerId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setFollowing(!following);
      toast.success(
        following ? `Unfollowed ${playerName}.` : `Following ${playerName}. You'll be notified when they play.`
      );
    });
  }

  return (
    <Button
      variant={following ? "outline" : "default"}
      size="sm"
      disabled={isPending}
      onClick={toggle}
      aria-pressed={following}
    >
      {following ? <BellRing className="size-3.5" /> : <Bell className="size-3.5" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}

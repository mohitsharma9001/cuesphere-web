"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MatchHeader } from "@/features/club-admin/components/scoring/match-header";
import { PlayerScoreCard } from "@/features/club-admin/components/scoring/player-score-card";
import { saveMatchResultAction } from "@/app/actions/match-scoring-actions";
import type { DrawMatch } from "@/types/match";

export function ResultOnlyPanel({
  match,
  player1PhotoUrl,
  player2PhotoUrl,
}: {
  match: DrawMatch;
  player1PhotoUrl?: string | null;
  player2PhotoUrl?: string | null;
}) {
  const router = useRouter();
  const [winnerId, setWinnerId] = React.useState(match.winnerId ?? match.player1Id);
  const [player1Score, setPlayer1Score] = React.useState(String(match.framesWonPlayer1 || ""));
  const [player2Score, setPlayer2Score] = React.useState(String(match.framesWonPlayer2 || ""));
  const [highestBreak, setHighestBreak] = React.useState(String(match.highestBreak || ""));
  const [highestBreakPlayerId, setHighestBreakPlayerId] = React.useState(
    match.highestBreakPlayerId ?? match.player1Id
  );
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSave() {
    const p1 = Number(player1Score);
    const p2 = Number(player2Score);
    if (!Number.isFinite(p1) || !Number.isFinite(p2) || p1 === p2) {
      toast.error("Enter a valid, non-tied final score.");
      return;
    }
    if (p1 > 21 || p2 > 21) {
      toast.error(
        "That looks like a point score, not a frame count. Enter how many FRAMES each player won (e.g. 3–1), not the points scored."
      );
      return;
    }

    setIsSaving(true);
    const result = await saveMatchResultAction(match.id, {
      winnerId,
      framesWonPlayer1: p1,
      framesWonPlayer2: p2,
      highestBreak: Number(highestBreak) || 0,
      highestBreakPlayerId,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success(match.kind === "friendly" ? "Result sent — your opponent confirms it." : "Result saved — player stats updated.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide">Result Only</CardTitle>
        <p className="text-xs text-muted-foreground">Enter the winner and how many frames each player won.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <MatchHeader match={match} />

        <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
          <PlayerScoreCard name={match.player1Name} photoUrl={player1PhotoUrl} />
          <span className="text-sm font-bold text-muted-foreground">VS</span>
          <PlayerScoreCard name={match.player2Name} photoUrl={player2PhotoUrl} align="right" />
        </div>

        <div className="space-y-2">
          <Label>Winner</Label>
          <RadioGroup value={winnerId} onValueChange={(v) => v && setWinnerId(v)} className="gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2">
              <RadioGroupItem value={match.player1Id} />
              <span className="text-sm">{match.player1Name}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2">
              <RadioGroupItem value={match.player2Id} />
              <span className="text-sm">{match.player2Name}</span>
            </label>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="p1score">Frames Won — {match.player1Name}</Label>
            <Input id="p1score" type="number" value={player1Score} onChange={(e) => setPlayer1Score(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p2score">Frames Won — {match.player2Name}</Label>
            <Input id="p2score" type="number" value={player2Score} onChange={(e) => setPlayer2Score(e.target.value)} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          The number of frames each player won overall (e.g. 3–1) — not the point score of a single frame.
        </p>

        <div className="space-y-2">
          <Label htmlFor="highestBreak">Highest Break (Optional)</Label>
          <Input id="highestBreak" type="number" value={highestBreak} onChange={(e) => setHighestBreak(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Who made the highest break?</Label>
          <RadioGroup value={highestBreakPlayerId} onValueChange={(v) => v && setHighestBreakPlayerId(v)} className="gap-2">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2">
              <RadioGroupItem value={match.player1Id} />
              <span className="text-sm">{match.player1Name}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2">
              <RadioGroupItem value={match.player2Id} />
              <span className="text-sm">{match.player2Name}</span>
            </label>
          </RadioGroup>
        </div>

        <Button className="w-full" disabled={isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Result
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Once saved, the fixture will be marked as completed.
        </p>
      </CardContent>
    </Card>
  );
}

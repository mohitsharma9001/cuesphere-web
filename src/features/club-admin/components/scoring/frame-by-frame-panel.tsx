"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MatchHeader } from "@/features/club-admin/components/scoring/match-header";
import { PlayerScoreCard } from "@/features/club-admin/components/scoring/player-score-card";
import {
  FrameHistoryTable,
  type FrameEntry,
} from "@/features/club-admin/components/scoring/frame-history-table";
import { saveMatchProgressAction, finishMatchAction } from "@/app/actions/match-scoring-actions";
import type { DrawMatch } from "@/types/match";

function initialFrames(match: DrawMatch): FrameEntry[] {
  if (match.frameScores?.length) {
    return match.frameScores.map((f, i) => ({
      frame: f.frame ?? i + 1,
      player1Score: f.player1Score,
      player2Score: f.player2Score,
    }));
  }
  const total = match.framesWonPlayer1 + match.framesWonPlayer2;
  if (total === 0) return [];
  // Older matches only stored the running tally, so show it as one summary row.
  return [{ frame: 1, player1Score: match.framesWonPlayer1, player2Score: match.framesWonPlayer2 }];
}

export function FrameByFramePanel({
  match,
  player1PhotoUrl,
  player2PhotoUrl,
}: {
  match: DrawMatch;
  player1PhotoUrl?: string | null;
  player2PhotoUrl?: string | null;
}) {
  const router = useRouter();
  const [frames, setFrames] = React.useState<FrameEntry[]>(() => initialFrames(match));
  const [p1Input, setP1Input] = React.useState("");
  const [p2Input, setP2Input] = React.useState("");
  const [highestBreak, setHighestBreak] = React.useState(String(match.highestBreak || ""));
  const [highestBreakPlayerId, setHighestBreakPlayerId] = React.useState(
    match.highestBreakPlayerId ?? match.player1Id
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [isFinishing, setIsFinishing] = React.useState(false);

  const framesWonPlayer1 = frames.filter((f) => f.player1Score > f.player2Score).length;
  const framesWonPlayer2 = frames.filter((f) => f.player2Score > f.player1Score).length;

  function addFrame() {
    const p1 = Number(p1Input);
    const p2 = Number(p2Input);
    if (!Number.isFinite(p1) || !Number.isFinite(p2) || p1 === p2) {
      toast.error("Enter a valid, non-tied score for the frame.");
      return;
    }
    setFrames((prev) => [...prev, { frame: prev.length + 1, player1Score: p1, player2Score: p2 }]);
    setP1Input("");
    setP2Input("");
  }

  async function handleSaveProgress() {
    setIsSaving(true);
    const result = await saveMatchProgressAction(match.id, { framesWonPlayer1, framesWonPlayer2, frameScores: frames });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Progress saved.");
    router.refresh();
  }

  async function handleFinish() {
    if (framesWonPlayer1 === framesWonPlayer2) {
      toast.error("Frames are tied — record at least one more frame first.");
      return;
    }

    setIsFinishing(true);
    const result = await finishMatchAction(match.id, {
      framesWonPlayer1,
      framesWonPlayer2,
      highestBreak: Number(highestBreak) || 0,
      highestBreakPlayerId,
      frameScores: frames,
    });
    setIsFinishing(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(match.kind === "friendly" ? "Result sent — your opponent confirms it." : "Match finished — player stats updated.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide">Frame-by-Frame</CardTitle>
        <p className="text-xs text-muted-foreground">Enter the score and winner for each frame.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <MatchHeader match={match} />

        <div className="flex items-center justify-between rounded-xl border border-border bg-background/40 p-4">
          <PlayerScoreCard name={match.player1Name} photoUrl={player1PhotoUrl} score={framesWonPlayer1} />
          <span className="text-sm font-bold text-muted-foreground">Frames Won</span>
          <PlayerScoreCard name={match.player2Name} photoUrl={player2PhotoUrl} score={framesWonPlayer2} align="right" />
        </div>

        <FrameHistoryTable frames={frames} player1Name={match.player1Name} player2Name={match.player2Name} />

        <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
          <p className="text-sm font-semibold text-foreground">Frame {frames.length + 1} score</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1">
              <Label htmlFor="fbfP1" className="truncate text-xs">
                {match.player1Name}
              </Label>
              <Input
                id="fbfP1"
                type="number"
                inputMode="numeric"
                className="h-12 text-center font-tabular text-xl"
                value={p1Input}
                onChange={(e) => setP1Input(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fbfP2" className="truncate text-xs">
                {match.player2Name}
              </Label>
              <Input
                id="fbfP2"
                type="number"
                inputMode="numeric"
                className="h-12 text-center font-tabular text-xl"
                value={p2Input}
                onChange={(e) => setP2Input(e.target.value)}
              />
            </div>
            <Button variant="outline" className="col-span-2 h-12 sm:col-span-1 sm:self-end" onClick={addFrame}>
              <Plus className="size-4" /> Add Frame
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fbfHighestBreak">Highest Break (Optional)</Label>
          <Input
            id="fbfHighestBreak"
            type="number"
            value={highestBreak}
            onChange={(e) => setHighestBreak(e.target.value)}
            className="max-w-40"
          />
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

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant="outline" className="h-12 sm:h-9" disabled={isSaving} onClick={handleSaveProgress}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Progress
          </Button>
          <Button className="h-12 sm:h-9" disabled={isFinishing} onClick={handleFinish}>
            {isFinishing ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Finish Match
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

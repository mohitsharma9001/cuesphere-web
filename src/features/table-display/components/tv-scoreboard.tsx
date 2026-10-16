"use client";

import Image from "next/image";
import { Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScaledStage } from "@/features/table-display/components/scaled-stage";
import { AdBreak, FrameBreakStrip, ResultStrip } from "@/features/table-display/components/ad-break";
import { TableBall, COLOURS } from "@/features/table-display/components/table-ball";
import { PlayerPhoto } from "@/features/table-display/components/player-photo";
import { useTableBoard, type FrameBanner } from "@/features/table-display/use-table-board";
import type { TableBoard, TableMatch, TickerItem } from "@/features/table-display/types";

const GOLD = "var(--primary)";
const BLUE = "var(--info)";

function ClubMark({ club }: { club: TableBoard["club"] }) {
  return (
    <div className="flex items-center gap-5">
      <div className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
        {club.logoUrl ? (
          <Image src={club.logoUrl} alt="" fill unoptimized className="object-contain p-1.5" />
        ) : (
          <span className="font-heading text-2xl font-extrabold text-felt">{club.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div>
        <p className="font-heading text-[32px] font-bold leading-tight">{club.name}</p>
        <p className="text-[22px] text-muted-foreground">
          Cue<span className="text-primary">Sphere</span> live
        </p>
      </div>
    </div>
  );
}

export function TopBar({
  board,
  label,
  pill,
  tableText,
}: {
  board: TableBoard;
  label: string;
  pill: React.ReactNode;
  /** Defaults to "TABLE n". */
  tableText?: string;
}) {
  return (
    <div className="flex h-[88px] shrink-0 items-center justify-between gap-8">
      <ClubMark club={board.club} />
      <p className="truncate text-center text-[32px] text-muted-foreground">{label}</p>
      <div className="flex items-center gap-7">
        {pill}
        <p className="font-heading text-[52px] font-extrabold tracking-wide text-primary">{tableText ?? `TABLE ${board.table}`}</p>
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: "live" | "info" | "done"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 rounded-full px-6 py-2.5 text-[26px] font-extrabold tracking-[0.12em]",
        tone === "live" && "bg-destructive/20 text-[#ff8a8e]",
        tone === "info" && "bg-info-soft text-info",
        tone === "done" && "bg-success-soft text-success"
      )}
    >
      {tone === "live" ? <span className="size-4 animate-pulse-live rounded-full bg-destructive" /> : null}
      {children}
    </span>
  );
}

function Ticker({ items }: { items: TickerItem[] }) {
  return (
    <div className="flex h-[60px] shrink-0 items-center gap-9 overflow-hidden whitespace-nowrap border-t-2 border-border pt-4 text-[26px]">
      <span className="text-[22px] font-extrabold tracking-[0.18em] text-primary">OTHER TABLES</span>
      {items.length === 0 ? <span className="text-muted-foreground">No other matches right now</span> : null}
      {items.map((item) => (
        <span key={item.table} className={item.live ? "text-foreground" : "text-muted-foreground"}>
          <strong className="text-foreground">T{item.table}</strong> {item.text}
        </span>
      ))}
    </div>
  );
}

function matchLabel(match: TableMatch) {
  return [match.tournamentName, match.round].filter(Boolean).join(" · ");
}

function PlayerPanel({ match, side }: { match: TableMatch; side: 1 | 2 }) {
  const player = side === 1 ? match.p1 : match.p2;
  const color = side === 1 ? GOLD : BLUE;
  const onStrike = match.onStrike === side;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col justify-between rounded-[40px] bg-card px-12 py-10",
        side === 2 && "items-end text-right"
      )}
      style={{ border: `6px solid ${onStrike ? color : "var(--border)"}` }}
    >
      <div className={cn("flex min-w-0 items-center gap-6", side === 2 && "flex-row-reverse")}>
        <PlayerPhoto side={player} size={110} ring={color} />
        <p className="min-w-0 truncate font-heading text-[64px] font-bold leading-tight">{player.name}</p>
      </div>
      <p className="font-heading text-[300px] font-bold leading-[0.85] tabular-nums" style={{ color }}>
        {player.score}
      </p>
      <p
        className="text-[30px] font-extrabold tracking-[0.12em]"
        style={{ color: onStrike ? color : "var(--muted-foreground)" }}
      >
        {onStrike ? "● AT THE TABLE" : match.onStrike ? "WAITING" : " "}
      </p>
    </div>
  );
}

export function LiveScreen({
  board,
  match,
  banner,
  footer,
}: {
  board: TableBoard;
  match: TableMatch;
  banner: FrameBanner | null;
  /** Replaces the "other tables" ticker (the rotating TV shows its own strip). */
  footer?: React.ReactNode;
}) {
  const strikerName = match.onStrike === 1 ? match.p1.name : match.onStrike === 2 ? match.p2.name : null;

  return (
    <>
      <TopBar board={board} label={matchLabel(match)} pill={<Pill tone="live">LIVE</Pill>} />
      <div className="flex min-h-0 flex-1 gap-8">
        <PlayerPanel match={match} side={1} />
        <div className="flex w-[300px] shrink-0 flex-col items-center justify-center gap-3.5">
          <p className="text-[26px] font-bold tracking-[0.2em] text-muted-foreground">FRAMES</p>
          <p className="flex items-center gap-5 font-heading text-[170px] font-bold leading-[0.9] tabular-nums">
            <span className="text-primary">{match.p1.frames}</span>
            <span className="text-[80px] text-muted-foreground/60">–</span>
            <span className="text-info">{match.p2.frames}</span>
          </p>
          {match.bestOf ? <p className="text-[30px] text-muted-foreground">Best of {match.bestOf}</p> : null}
          <p className="mt-2 rounded-full bg-card-elevated px-6 py-2.5 text-[26px] font-bold">
            Frame {match.p1.frames + match.p2.frames + 1}
          </p>
        </div>
        <PlayerPanel match={match} side={2} />
      </div>

      <div className="flex h-[190px] shrink-0 gap-8">
        <div className="flex min-w-0 flex-[1.5] items-center gap-10 rounded-[32px] border-2 border-border bg-card px-10 py-6">
          <div className="shrink-0">
            <p className="text-[24px] font-bold tracking-[0.15em] text-muted-foreground">
              BREAK{strikerName ? ` · ${strikerName.split(" ")[0].toUpperCase()}` : ""}
            </p>
            <p className="font-heading text-[124px] font-bold leading-[0.95] tabular-nums">{match.currentBreak}</p>
          </div>
          <div className="flex min-w-0 flex-wrap content-center gap-3">
            {match.breakBalls.map((ball, i) => (
              <TableBall key={i} color={ball} size={44} />
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-4 rounded-[32px] border-2 border-border bg-card px-10 py-6">
          <div className="flex justify-between text-[24px] font-bold tracking-[0.15em] text-muted-foreground">
            <span>ON THE TABLE</span>
            {match.pointsRemaining !== null ? <span>{match.pointsRemaining} LEFT</span> : null}
          </div>
          <div className="flex items-center gap-4">
            <TableBall color="red" size={52} className={match.redsRemaining === 0 ? "opacity-20" : ""} />
            <span className="whitespace-nowrap font-heading text-[64px] font-bold leading-none tabular-nums">× {match.redsRemaining}</span>
            <span className="mx-2 h-12 w-0.5 bg-border-strong" />
            {COLOURS.map((c) => (
              <TableBall key={c} color={c} size={40} />
            ))}
          </div>
        </div>
        <div className="flex flex-[0.7] flex-col justify-center gap-1 rounded-[32px] border-2 border-border bg-card px-9 py-6">
          <p className="text-[24px] font-bold tracking-[0.15em] text-muted-foreground">HIGHEST BREAK</p>
          <p className="flex items-baseline gap-4">
            <span className="font-heading text-[96px] font-bold leading-none text-primary tabular-nums">
              {match.highestBreak || "–"}
            </span>
            {match.highestBreakBy ? (
              <span className="text-[28px] text-muted-foreground">
                {(match.highestBreakBy === 1 ? match.p1.name : match.p2.name).split(" ")[0]}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {footer ?? <Ticker items={board.ticker} />}

      {banner ? <FrameWonOverlay banner={banner} /> : null}
    </>
  );
}

function FrameWonOverlay({ banner }: { banner: FrameBanner }) {
  const { frame, winner, match } = banner;
  const color = winner === 1 ? GOLD : BLUE;
  const name = winner === 1 ? match.p1.name : match.p2.name;
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/90">
      <div
        className="flex w-[1120px] flex-col items-center gap-6 rounded-[48px] bg-card p-16"
        style={{ border: `6px solid ${color}` }}
      >
        <p className="text-[30px] font-extrabold tracking-[0.3em]" style={{ color }}>
          FRAME {frame.frame} WON BY
        </p>
        <p className="font-heading text-[110px] font-extrabold leading-none">{name}</p>
        <p className="font-heading text-[150px] font-bold leading-none tabular-nums">
          <span style={{ color: winner === 1 ? GOLD : "var(--muted-foreground)" }}>{frame.player1Score}</span>
          <span className="px-7 text-[90px] text-muted-foreground/60">–</span>
          <span style={{ color: winner === 2 ? BLUE : "var(--muted-foreground)" }}>{frame.player2Score}</span>
        </p>
        <p className="rounded-full bg-card-elevated px-7 py-3 text-[32px]">
          Frames{" "}
          <strong className="font-heading text-[40px] tabular-nums">
            {match.p1.frames} – {match.p2.frames}
          </strong>
        </p>
      </div>
    </div>
  );
}

function NextScreen({ board, match }: { board: TableBoard; match: TableMatch }) {
  const facts = [
    ["Reporting", match.reportingTime],
    ["Match starts", match.startTime],
    ["Format", match.bestOf ? `Best of ${match.bestOf}` : ""],
    ["Round", match.round],
  ].filter(([, v]) => v);
  return (
    <>
      <TopBar board={board} label={match.tournamentName} pill={<Pill tone="info">UP NEXT</Pill>} />
      <div className="flex flex-1 flex-col items-center justify-center gap-14">
        <p className="text-[34px] font-extrabold tracking-[0.3em] text-primary">NEXT MATCH ON THIS TABLE</p>
        <div className="flex items-center gap-24">
          {[match.p1, match.p2].map((p, i) => (
            <div key={i} className="flex w-[560px] flex-col items-center gap-6 text-center">
              <PlayerPhoto side={p} size={240} ring={i === 0 ? GOLD : BLUE} />
              <p className="font-heading text-[72px] font-bold leading-tight">{p.name}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-6">
          {facts.map(([label, value]) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-[28px] border-2 border-border bg-card px-10 py-5">
              <p className="text-[24px] text-muted-foreground">{label}</p>
              <p className="text-[40px] font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <Ticker items={board.ticker} />
    </>
  );
}

function ResultScreen({ board, match }: { board: TableBoard; match: TableMatch }) {
  const winner = match.winner ?? (match.p1.frames > match.p2.frames ? 1 : 2);
  const winnerName = winner === 1 ? match.p1.name : match.p2.name;
  return (
    <>
      <TopBar board={board} label={matchLabel(match)} pill={<Pill tone="done">FINAL</Pill>} />
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <p className="flex items-center gap-4 text-[34px] font-extrabold tracking-[0.3em] text-primary">
          <Trophy className="size-11" /> MATCH WINNER
        </p>
        <p className="font-heading text-[140px] font-extrabold leading-none">{winnerName}</p>
        <div className="flex items-center gap-12">
          <p className="text-[44px] font-bold text-primary">{match.p1.name.split(" ")[0]}</p>
          <p className="font-heading text-[200px] font-bold leading-[0.9] tabular-nums">
            <span className={winner === 1 ? "text-primary" : "text-muted-foreground"}>{match.p1.frames}</span>
            <span className="px-7 text-[110px] text-muted-foreground/60">–</span>
            <span className={winner === 2 ? "text-info" : "text-muted-foreground"}>{match.p2.frames}</span>
          </p>
          <p className="text-[44px] font-bold text-info">{match.p2.name.split(" ")[0]}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          {match.frames.map((f) => (
            <div key={f.frame} className="flex flex-col items-center gap-1.5 rounded-3xl border-2 border-border bg-card px-9 py-4">
              <p className="text-[22px] text-muted-foreground">FRAME {f.frame}</p>
              <p className="font-heading text-[52px] font-bold tabular-nums">
                <span className={f.player1Score > f.player2Score ? "text-primary" : "text-muted-foreground"}>
                  {f.player1Score}
                </span>{" "}
                –{" "}
                <span className={f.player2Score > f.player1Score ? "text-info" : "text-muted-foreground"}>
                  {f.player2Score}
                </span>
              </p>
            </div>
          ))}
          {match.highestBreak > 0 ? (
            <div className="flex flex-col items-center gap-1.5 rounded-3xl border-2 border-primary/40 bg-primary-soft px-9 py-4">
              <p className="text-[22px] text-primary">HIGHEST BREAK</p>
              <p className="font-heading text-[52px] font-bold text-primary tabular-nums">{match.highestBreak}</p>
            </div>
          ) : null}
        </div>
        {board.next ? (
          <p className="text-[30px] text-muted-foreground">
            Next on this table:{" "}
            <strong className="text-foreground">
              {board.next.p1.name} vs {board.next.p2.name}
            </strong>
            {board.next.startTime ? ` · ${board.next.startTime}` : ""}
          </p>
        ) : null}
      </div>
      <Ticker items={board.ticker} />
    </>
  );
}

function IdleScreen({ board }: { board: TableBoard }) {
  return (
    <>
      <TopBar board={board} label="" pill={null} />
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <p className="font-heading text-[180px] font-extrabold leading-none text-primary">TABLE {board.table}</p>
        <p className="text-[44px] text-muted-foreground">No match on this table right now</p>
        <p className="text-[30px] text-muted-foreground/70">Scores appear here as soon as the referee starts a match.</p>
      </div>
      <Ticker items={board.ticker} />
    </>
  );
}

/** Full-screen scoreboard for the TV beside one table. Display only: all
 * scoring happens on the referee's phone. */
export function TvScoreboard({ initial, clubSlug, table }: { initial: TableBoard; clubSlug: string; table: number }) {
  const { board, screen, banner } = useTableBoard(initial, clubSlug, table);
  const { ads, accent } = board.stream;
  const adsReady = ads.enabled && ads.onTv && ads.images.length > 0;

  // Ads fill the frame break (after the 8-second "frame won" card), and
  // optionally the result screen once the match is over.
  let adBreak: React.ReactNode = null;
  if (adsReady && screen.kind === "live" && screen.match.inFrameBreak && !banner) {
    adBreak = <FrameBreakStrip match={screen.match} accent={accent} table={board.table} />;
  } else if (adsReady && ads.afterMatch && screen.kind === "result") {
    adBreak = <ResultStrip match={screen.match} accent={accent} table={board.table} />;
  }

  return (
    <ScaledStage background="#000">
      {adBreak ? (
        <AdBreak images={ads.images} secondsPerImage={ads.secondsPerImage} strip={adBreak} />
      ) : (
        <div className="relative flex size-full flex-col gap-8 bg-background px-14 py-12 text-foreground">
          {screen.kind === "live" ? <LiveScreen board={board} match={screen.match} banner={banner} /> : null}
          {screen.kind === "next" ? <NextScreen board={board} match={screen.match} /> : null}
          {screen.kind === "result" ? <ResultScreen board={board} match={screen.match} /> : null}
          {screen.kind === "idle" ? <IdleScreen board={board} /> : null}
        </div>
      )}
    </ScaledStage>
  );
}

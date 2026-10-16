"use client";

import { ScaledStage } from "@/features/table-display/components/scaled-stage";
import { AdBreak, FrameBreakStrip } from "@/features/table-display/components/ad-break";
import { LiveScreen, Pill, TopBar } from "@/features/table-display/components/tv-scoreboard";
import { useClubBoard, ROTATE_MS } from "@/features/table-display/use-club-board";
import type { ClubBoard, TableBoard, TableMatch } from "@/features/table-display/types";

/** Bottom strip: which table is on screen, what's coming, and how long until it moves on. */
function RotationStrip({ table, upNext, progress, total }: { table: number; upNext: number[]; progress: number; total: number }) {
  return (
    <div className="flex h-[84px] shrink-0 flex-col justify-center gap-3 border-t-2 border-border pt-4">
      <div className="flex items-center gap-8 whitespace-nowrap text-[26px]">
        <span className="text-[22px] font-extrabold tracking-[0.18em] text-primary">
          ALL TABLES · {total} LIVE
        </span>
        <span className="font-bold text-foreground">Showing Table {table}</span>
        {upNext.length > 0 ? (
          <span className="text-muted-foreground">
            Next: {upNext.slice(0, 8).map((t) => `T${t}`).join(" · ")}
          </span>
        ) : (
          <span className="text-muted-foreground">Only live match right now</span>
        )}
      </div>
      {total > 1 ? (
        <div className="h-2 w-full shrink-0 overflow-hidden rounded-full bg-card-elevated">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress * 100}%`, transition: `width ${progress === 0 ? 0 : 500}ms linear` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function NothingLive({ board }: { board: ClubBoard }) {
  const tableBoard: TableBoard = { club: board.club, stream: board.stream, table: 0, live: null, next: null, followed: null, ticker: [] };
  return (
    <>
      <TopBar board={tableBoard} label="" pill={<Pill tone="info">ROTATING</Pill>} tableText="ALL TABLES" />
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <p className="font-heading text-[120px] font-extrabold leading-none text-primary">No live matches</p>
        <p className="text-[40px] text-muted-foreground">Each live table appears here for {ROTATE_MS / 1000} seconds in turn.</p>
        {board.next.length > 0 ? (
          <div className="flex max-w-[1600px] flex-wrap justify-center gap-5">
            {board.next.slice(0, 8).map((m: TableMatch) => (
              <div key={m.id} className="rounded-[28px] border-2 border-border bg-card px-9 py-5 text-left">
                <p className="text-[22px] font-extrabold tracking-[0.15em] text-primary">TABLE {m.tableNumber} · UP NEXT</p>
                <p className="mt-1 text-[34px] font-bold">
                  {m.p1.name} v {m.p2.name}
                </p>
                {m.startTime ? <p className="text-[24px] text-muted-foreground">{m.startTime}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

/** One TV for the whole club: cycles through every table with a live match,
 * ten seconds each, until those matches finish. */
export function RotatingTvScoreboard({ initial, clubSlug }: { initial: ClubBoard; clubSlug: string }) {
  const { board, current, liveTables, upNext, progress } = useClubBoard(initial, clubSlug);
  const { ads, accent } = board.stream;
  const adsReady = ads.enabled && ads.onTv && ads.images.length > 0;

  if (!current) {
    return (
      <ScaledStage background="#000">
        {adsReady ? (
          <AdBreak
            images={ads.images}
            secondsPerImage={ads.secondsPerImage}
            strip={
              <div className="flex h-full items-center px-14 text-[30px] text-white/80" style={{ borderTop: `4px solid ${accent}` }}>
                <strong className="mr-4 text-white">{board.club.name}</strong> Live scores appear here as soon as a match starts.
              </div>
            }
          />
        ) : (
          <div className="relative flex size-full flex-col gap-8 bg-background px-14 py-12 text-foreground">
            <NothingLive board={board} />
          </div>
        )}
      </ScaledStage>
    );
  }

  const tableBoard: TableBoard = {
    club: board.club,
    stream: board.stream,
    table: current.tableNumber,
    live: current,
    next: null,
    followed: null,
    ticker: [],
  };
  const strip = <RotationStrip table={current.tableNumber} upNext={upNext} progress={progress} total={liveTables.length} />;

  // A table between frames shows the sponsor ads with its frame-break strip.
  if (adsReady && current.inFrameBreak) {
    return (
      <ScaledStage background="#000">
        <AdBreak
          key={current.tableNumber}
          images={ads.images}
          secondsPerImage={ads.secondsPerImage}
          strip={<FrameBreakStrip match={current} accent={accent} table={current.tableNumber} />}
        />
      </ScaledStage>
    );
  }

  return (
    <ScaledStage background="#000">
      <div key={current.tableNumber} className="relative flex size-full animate-in flex-col gap-8 bg-background px-14 py-12 text-foreground fade-in duration-500">
        <LiveScreen board={tableBoard} match={current} banner={null} footer={strip} />
      </div>
    </ScaledStage>
  );
}

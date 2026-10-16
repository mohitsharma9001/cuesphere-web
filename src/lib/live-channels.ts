/** Realtime channel names shared by the server (which signals) and the
 * screens (which listen). Screens refresh the moment a score changes. */
export const liveMatchChannel = (matchId: string) => `live:match:${matchId}`;
export const liveTableChannel = (clubId: string, table: number) => `live:table:${clubId}:${table}`;
/** Any table in the club changed — for the TV that rotates through every table. */
export const liveClubChannel = (clubId: string) => `live:club:${clubId}`;
export const LIVE_SIGNAL_EVENT = "changed";

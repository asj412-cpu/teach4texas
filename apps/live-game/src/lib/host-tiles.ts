import { hostSeatPlayed, type HostRoomView } from "@/lib/domain/live-room";

/**
 * AC-H08 P2-4: host tile is hidden until the teacher actually plays, then labeled "Teacher".
 * Ties sort students first so the teacher never takes the top slot on a tie.
 */
export function hostPlayed(view: HostRoomView): boolean {
  return hostSeatPlayed(view.host_seat);
}

export function rankedTiles(view: HostRoomView) {
  const played = hostPlayed(view);
  return view.players
    .filter((p) => p.player_id !== "host" || played)
    .map((p) => (p.player_id === "host" ? { ...p, display_name: "Teacher" } : p))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(a.player_id === "host") - Number(b.player_id === "host"),
    );
}

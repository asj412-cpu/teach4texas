import type { HostRoomView } from "@/lib/domain/live-room";

/**
 * AC-H08 P2-4: host tile is hidden until the teacher actually plays, then labeled "Teacher".
 * Ties sort students first so the teacher never takes the top slot on a tie.
 */
export function hostPlayed(view: HostRoomView): boolean {
  const seat = view.host_seat;
  if (!seat) return false;
  if (seat.score > 0 || seat.answered) return true;
  const sub = seat.match ?? seat.race ?? seat.scavenger ?? seat.sequence ?? seat.category ?? seat.odd ?? seat.dash;
  if (!sub) return false;
  const j = JSON.stringify(sub);
  return /"(answered|moves|correct_count|found_count|answered_count|pairs_found|taps)":[1-9]|"(submitted|locked|my_answered)":true/.test(j);
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

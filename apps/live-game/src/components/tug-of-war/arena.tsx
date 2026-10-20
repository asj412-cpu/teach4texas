"use client";

import type { TowTeam } from "@/lib/domain/tug-of-war";

/** Team palette — solid fills behind all text keep AA (white on #b91c1c 6.5:1, on #1d4ed8 6.7:1). */
export const TOW_COLORS: Record<TowTeam, { fill: string; dark: string; light: string; text: string }> = {
  red: { fill: "#dc2626", dark: "#991b1b", light: "#fca5a5", text: "#b91c1c" },
  blue: { fill: "#2563eb", dark: "#1e3a8a", light: "#93c5fd", text: "#1d4ed8" },
};

const ROPE_Y = 292;
const GROUND_Y = 372;

function Mascot({ x, team, delay, flip }: { x: number; team: TowTeam; delay: number; flip: boolean }) {
  const c = TOW_COLORS[team];
  const s = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} 0)`}>
      <g
        className={flip ? "tw-pull-r" : "tw-pull-l"}
        style={{ animationDelay: `${delay}s` }}
      >
        {/* shadow */}
        <ellipse cx={0} cy={GROUND_Y + 4} rx={34} ry={7} fill="rgba(0,0,0,0.35)" />
        {/* legs */}
        <rect x={-18} y={GROUND_Y - 34} width={12} height={34} rx={6} fill={c.dark} />
        <rect x={6} y={GROUND_Y - 34} width={12} height={34} rx={6} fill={c.dark} />
        <ellipse cx={-12} cy={GROUND_Y} rx={13} ry={6} fill="#1f2937" />
        <ellipse cx={12} cy={GROUND_Y} rx={13} ry={6} fill="#1f2937" />
        {/* body */}
        <ellipse cx={0} cy={GROUND_Y - 62} rx={30} ry={36} fill={c.fill} stroke={c.dark} strokeWidth={4} />
        <ellipse cx={0} cy={GROUND_Y - 54} rx={17} ry={20} fill="rgba(255,255,255,0.22)" />
        {/* arms to the rope */}
        <path
          d={`M ${-6 * s} ${GROUND_Y - 78} Q ${40 * s} ${ROPE_Y - 6} ${62 * s} ${ROPE_Y}`}
          stroke={c.dark}
          strokeWidth={11}
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={62 * s} cy={ROPE_Y} r={9} fill="#fde68a" stroke={c.dark} strokeWidth={3} />
        {/* head */}
        <circle cx={-4 * s} cy={GROUND_Y - 112} r={26} fill={c.fill} stroke={c.dark} strokeWidth={4} />
        {team === "red" ? (
          // rocket fin
          <path d={`M ${-4 * s - 10} ${GROUND_Y - 134} L ${-4 * s} ${GROUND_Y - 162} L ${-4 * s + 10} ${GROUND_Y - 134} Z`} fill="#fde047" stroke={c.dark} strokeWidth={3} />
        ) : (
          // comet tail
          <path d={`M ${-4 * s} ${GROUND_Y - 136} q ${-30 * s} -18 ${-46 * s} -6 q ${20 * s} -2 ${30 * s} 10`} fill="#fde047" stroke={c.dark} strokeWidth={3} />
        )}
        {/* headband */}
        <rect x={-4 * s - 26} y={GROUND_Y - 124} width={52} height={8} rx={4} fill="#fde047" />
        {/* eyes looking at the rope */}
        <circle cx={-4 * s + 8 * s} cy={GROUND_Y - 108} r={8} fill="#fff" />
        <circle cx={-4 * s - 6 * s} cy={GROUND_Y - 108} r={7} fill="#fff" />
        <circle cx={-4 * s + 11 * s} cy={GROUND_Y - 107} r={3.5} fill="#0b1630" />
        <circle cx={-4 * s - 3 * s} cy={GROUND_Y - 107} r={3.2} fill="#0b1630" />
        {/* determined grin */}
        <path d={`M ${-4 * s - 8} ${GROUND_Y - 96} q 8 6 16 0`} stroke="#0b1630" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Crowd({ y, seed, scale }: { y: number; seed: number; scale: number }) {
  const people = [];
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 46 + ((i * 37 + seed * 13) % 18);
    const shade = (i + seed) % 3 === 0 ? "#1e293b" : (i + seed) % 3 === 1 ? "#273449" : "#172036";
    const flag = (i + seed) % 5 === 0 ? (i < 13 ? "#dc2626" : "#2563eb") : null;
    people.push(
      <g key={i} className="tw-crowd" style={{ animationDelay: `${((i * 7 + seed) % 10) / 10}s` }}>
        <circle cx={x} cy={y - 22 * scale} r={11 * scale} fill={shade} />
        <rect x={x - 14 * scale} y={y - 12 * scale} width={28 * scale} height={30 * scale} rx={12 * scale} fill={shade} />
        {flag && (
          <>
            <line x1={x + 12 * scale} y1={y - 8 * scale} x2={x + 12 * scale} y2={y - 46 * scale} stroke="#e5e7eb" strokeWidth={2} />
            <path d={`M ${x + 12 * scale} ${y - 46 * scale} l ${22 * scale} ${7 * scale} l ${-22 * scale} ${7 * scale} z`} fill={flag} />
          </>
        )}
      </g>,
    );
  }
  return <g>{people}</g>;
}

export function TowArena({
  position,
  winner,
  compact = false,
}: {
  /** −1 Red line … +1 Blue line */
  position: number;
  winner: TowTeam | "tie" | null;
  compact?: boolean;
}) {
  const ropeShift = position * 250;
  const teamShift = position * 110;
  const ropeH = 16;
  return (
    <svg
      viewBox="0 0 1200 420"
      preserveAspectRatio="xMidYMid slice"
      className={`block w-full ${compact ? "h-[190px]" : "h-[260px] sm:h-[340px] lg:h-[400px]"}`}
      role="img"
      aria-label={`Rope position ${position > 0 ? "toward Blue Comets" : position < 0 ? "toward Red Rockets" : "at center"}`}
    >
      <defs>
        <linearGradient id="tw-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f9b4a" />
          <stop offset="1" stopColor="#1f5e2b" />
        </linearGradient>
        <radialGradient id="tw-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="1" />
          <stop offset="1" stopColor="#fffbe6" stopOpacity="0" />
        </radialGradient>
        <pattern id="tw-braid" width="18" height="16" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)">
          <rect width="18" height="16" fill="#d9a35f" />
          <rect width="9" height="16" fill="#b07a3c" />
        </pattern>
      </defs>
      {/* stadium lights */}
      {[120, 420, 780, 1080].map((x, i) => (
        <g key={x}>
          <rect x={x - 4} y={20} width={8} height={120} fill="#334155" />
          <rect x={x - 30} y={8} width={60} height={22} rx={6} fill="#475569" />
          <circle className="tw-light" style={{ animationDelay: `${i * 0.4}s` }} cx={x} cy={20} r={70} fill="url(#tw-glow)" />
        </g>
      ))}
      {/* stands + crowd */}
      <rect x={0} y={120} width={1200} height={130} fill="#101a3d" />
      <Crowd y={168} seed={1} scale={0.8} />
      <Crowd y={210} seed={4} scale={0.95} />
      <Crowd y={252} seed={7} scale={1.05} />
      {/* field */}
      <rect x={0} y={250} width={1200} height={170} fill="url(#tw-grass)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={i * 200} y={250} width={100} height={170} fill="rgba(255,255,255,0.05)" />
      ))}
      {/* mud pit */}
      <ellipse cx={600} cy={360} rx={120} ry={30} fill="#6b4423" />
      <ellipse cx={600} cy={356} rx={96} ry={20} fill="#7c5230" />
      {/* team lines */}
      <rect x={344} y={256} width={12} height={160} fill={TOW_COLORS.red.fill} stroke="#fff" strokeWidth={3} />
      <rect x={844} y={256} width={12} height={160} fill={TOW_COLORS.blue.fill} stroke="#fff" strokeWidth={3} />
      <rect x={597} y={256} width={6} height={160} fill="rgba(255,255,255,0.8)" />
      {/* teams */}
      <g className="tw-team-move" style={{ transform: `translateX(${teamShift}px)` }}>
        <Mascot x={110} team="red" delay={0} flip={false} />
        <Mascot x={190} team="red" delay={0.15} flip={false} />
        <Mascot x={270} team="red" delay={0.3} flip={false} />
        <Mascot x={930} team="blue" delay={0.1} flip />
        <Mascot x={1010} team="blue" delay={0.25} flip />
        <Mascot x={1090} team="blue" delay={0.4} flip />
      </g>
      {/* rope + flag */}
      <g className="tw-rope-move" style={{ transform: `translateX(${ropeShift}px)` }}>
        <rect x={-400} y={ROPE_Y - ropeH / 2} width={2000} height={ropeH} rx={8} fill="url(#tw-braid)" stroke="#6b4423" strokeWidth={3} />
        <line x1={600} y1={ROPE_Y} x2={600} y2={ROPE_Y - 70} stroke="#f8fafc" strokeWidth={5} />
        <path className="tw-flag" d={`M 600 ${ROPE_Y - 70} l 52 14 l -52 14 z`} fill="#fde047" stroke="#a16207" strokeWidth={3} />
        <circle cx={600} cy={ROPE_Y} r={13} fill="#fde047" stroke="#a16207" strokeWidth={4} />
      </g>
      {winner && winner !== "tie" && (
        <rect x={winner === "red" ? 0 : 900} y={250} width={300} height={170} fill={TOW_COLORS[winner].fill} opacity={0.18} />
      )}
    </svg>
  );
}

export function TowConfetti({ team }: { team: TowTeam | "tie" }) {
  const cols =
    team === "tie"
      ? ["#dc2626", "#2563eb", "#fde047", "#ffffff"]
      : [TOW_COLORS[team].fill, TOW_COLORS[team].light, "#fde047", "#ffffff"];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 48 }, (_, i) => (
        <span
          key={i}
          className="gs-confetti"
          style={{
            left: `${(i * 37) % 100}%`,
            background: cols[i % cols.length],
            animationDelay: `${(i % 12) * 0.28}s`,
            animationDuration: `${3 + (i % 5) * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Solid team plate: name + size + last pull (16px+ text, AA on solid fill). */
export function TeamPlate({
  team,
  name,
  size,
  pull,
  big = false,
}: {
  team: TowTeam;
  name: string;
  size: number;
  pull: string | null;
  big?: boolean;
}) {
  const bg = team === "red" ? "bg-[#b91c1c]" : "bg-[#1d4ed8]";
  return (
    <div className={`${bg} rounded-2xl border-2 border-white/80 px-4 py-2 text-white shadow-lg`}>
      <p className={`${big ? "text-2xl sm:text-3xl" : "text-lg"} font-black uppercase tracking-wide`}>
        {team === "red" ? "🚀 " : "☄️ "}
        {name}
      </p>
      <p className="text-base font-bold">
        {size} {size === 1 ? "player" : "players"}
        {pull != null ? ` · last pull ${pull}` : ""}
      </p>
    </div>
  );
}

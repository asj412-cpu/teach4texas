"use client";

import { useId } from "react";
import type { MascotMood } from "@/components/escape-vault/turkey-mascot";

/**
 * Winter-only sidekick. Classic TurkeyMascot never renders this.
 * Drawn as layered SVG (gradients, knit hat, scarf, feather vanes) so the
 * persona reads as a kids-game character on both host and student.
 */
export function WinterTurkey({ mood }: { mood: MascotMood }) {
  const uid = useId().replace(/:/g, "");
  const cheer = mood === "cheer";
  const oops = mood === "oops";
  const hint = mood === "hint";
  const lookX = hint ? -2.4 : 0.4;
  const lookY = hint ? -3.4 : oops ? -1.6 : 1;

  const feathers: Array<[number, number, string, string, string]> = [
    [-52, 0.86, "#7C2D12", "#E35A24", "#F8C38A"],
    [52, 0.86, "#7C2D12", "#E35A24", "#F8C38A"],
    [-26, 1, "#B45309", "#F59E0B", "#FEF3C7"],
    [26, 1, "#B45309", "#F59E0B", "#FEF3C7"],
    [0, 1.08, "#D97706", "#FBBF24", "#FFFBEB"],
  ];

  const eye = (cx: number) =>
    cheer ? (
      <g>
        <path
          d={`M${cx - 16} 100 Q${cx} 82 ${cx + 16} 100`}
          fill="none"
          stroke="#3A2418"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={`M${cx - 9} 98 Q${cx} 90 ${cx + 9} 98`}
          fill="none"
          stroke="#3A2418"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.4"
        />
      </g>
    ) : (
      <g>
        <ellipse cx={cx} cy="100" rx="15" ry={oops ? 16.2 : 14.6} fill="#FFFDFB" />
        <ellipse cx={cx} cy="108" rx="12" ry="6" fill="#E7C2A4" opacity="0.35" />
        <ellipse
          cx={cx + lookX}
          cy={101 + lookY}
          rx="8.2"
          ry="9"
          fill={`url(#${uid}-iris)`}
        />
        <circle cx={cx + lookX} cy={102 + lookY} r="4.3" fill="#140e0c" />
        <circle cx={cx + lookX + 3.1} cy={97.6 + lookY} r="2.5" fill="#fff" />
        <circle
          cx={cx + lookX - 2.6}
          cy={104.4 + lookY}
          r="1.15"
          fill="#fff"
          opacity="0.95"
        />
        <path
          d={`M${cx - 15} 96 Q${cx} 82 ${cx + 15} 96.5`}
          fill="none"
          stroke="#3F2918"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d={`M${cx - 12} 110 Q${cx} 116 ${cx + 12} 110`}
          fill="none"
          stroke="#C48A62"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>
    );

  return (
    <svg viewBox="0 0 200 220" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`${uid}-body`} cx="76" cy="150" r="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE7CC" />
          <stop offset="28%" stopColor="#F0B27A" />
          <stop offset="62%" stopColor="#C47B3E" />
          <stop offset="100%" stopColor="#5C2A12" />
        </radialGradient>
        <radialGradient id={`${uid}-head`} cx="78" cy="86" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF6EA" />
          <stop offset="40%" stopColor="#F3C498" />
          <stop offset="100%" stopColor="#C4844C" />
        </radialGradient>
        <linearGradient id={`${uid}-beak`} x1="96" y1="104" x2="130" y2="132" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF1B8" />
          <stop offset="35%" stopColor="#F6B234" />
          <stop offset="100%" stopColor="#C6530A" />
        </linearGradient>
        <radialGradient id={`${uid}-watt`} cx="32%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#FFE4E6" />
          <stop offset="36%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#9F1239" />
        </radialGradient>
        <linearGradient id={`${uid}-hat`} x1="70" y1="24" x2="140" y2="78" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B7F3EA" />
          <stop offset="22%" stopColor="#2A9AA4" />
          <stop offset="100%" stopColor="#0C3A44" />
        </linearGradient>
        <linearGradient id={`${uid}-scarf`} x1="40" y1="130" x2="160" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="30%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#7F1D33" />
        </linearGradient>
        <radialGradient id={`${uid}-pom`} cx="36%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#B6C2D2" />
        </radialGradient>
        <linearGradient id={`${uid}-wing`} x1="110" y1="150" x2="172" y2="196" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE0B8" />
          <stop offset="45%" stopColor="#D4894A" />
          <stop offset="100%" stopColor="#7A3814" />
        </linearGradient>
        <radialGradient id={`${uid}-iris`} cx="36%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#C4A484" />
          <stop offset="46%" stopColor="#5A3A28" />
          <stop offset="100%" stopColor="#1A100C" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="208" rx="58" ry="7" fill="#0b2744" opacity="0.15" />
      <path d="M48 206 C70 196 130 196 154 206 C130 212 70 212 48 206 Z" fill="#fff" />
      <ellipse cx="78" cy="202" rx="14" ry="3.5" fill="#fff" />
      <ellipse cx="124" cy="203" rx="10" ry="3" fill="#e7f5ff" />

      {feathers.map(([rot, sy, dark, mid, lite]) => (
        <g
          key={rot}
          transform={`rotate(${rot} 100 148) translate(100 148) scale(1 ${sy}) translate(-100 -148)`}
        >
          <path d="M100 150 C74 120 70 72 100 34 C130 72 126 120 100 150 Z" fill={dark} />
          <path d="M100 144 C86 116 84 78 100 46 C116 78 114 116 100 144 Z" fill={mid} />
          <path d="M100 136 C93 112 93 84 100 58 C107 84 107 112 100 136 Z" fill={lite} opacity="0.95" />
          <path d="M100 140 L100 52" stroke="#6B2A12" strokeWidth="1.4" opacity="0.35" strokeLinecap="round" />
          <path d="M100 86 C88 96 80 102 74 112" stroke={lite} strokeWidth="1.4" fill="none" opacity="0.8" strokeLinecap="round" />
          <path d="M100 86 C112 96 120 102 126 112" stroke={lite} strokeWidth="1.4" fill="none" opacity="0.8" strokeLinecap="round" />
          <path d="M86 100 C92 92 96 84 100 74" stroke={dark} strokeWidth="1.1" fill="none" opacity="0.35" />
          <path d="M114 100 C108 92 104 84 100 74" stroke={dark} strokeWidth="1.1" fill="none" opacity="0.35" />
        </g>
      ))}

      <path d="M62 78 C50 86 46 108 56 124 C68 116 72 98 70 80 Z" fill="#134E4A" />
      <path d="M64 88 C58 98 56 112 62 122" stroke="#F6D58A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="124" r="4.3" fill="#F6D58A" />
      <circle cx="54.4" cy="122.4" r="1.5" fill="#fff" />
      <path d="M138 78 C150 86 154 108 144 124 C132 116 128 98 130 80 Z" fill="#0E3E48" />
      <path d="M136 88 C142 98 144 112 138 122" stroke="#F6D58A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="144" cy="124" r="4.3" fill="#F6D58A" />

      <ellipse cx="100" cy="162" rx="48" ry="36" fill={`url(#${uid}-body)`} stroke="#6B3414" strokeWidth="1.25" />
      <ellipse cx="82" cy="150" rx="18" ry="12" fill="#fff" opacity="0.28" />
      <ellipse cx="124" cy="172" rx="16" ry="12" fill="#4A2412" opacity="0.18" />
      <path d="M64 158 C78 146 94 146 106 158 C116 146 132 146 142 158 C130 154 114 154 104 164 C92 154 78 154 64 158 Z" fill="#F8D7B0" opacity="0.72" />
      <path d="M70 170 C86 160 100 160 112 170 C124 162 136 162 144 172" fill="none" stroke="#FFF1DE" strokeWidth="2.3" strokeLinecap="round" opacity="0.8" />
      <path d="M142 140 C154 156 150 180 134 192" stroke="#D7F3FF" strokeWidth="3" fill="none" opacity="0.45" strokeLinecap="round" />

      <path d="M82 150 C56 146 44 166 56 184 C74 174 86 160 88 150 Z" fill="#A15A30" stroke="#6B3414" strokeWidth="0.8" />
      <path d="M74 156 C62 162 56 172 64 180" stroke="#F8E0C4" strokeWidth="1.8" fill="none" strokeLinecap="round" />

      <g>
        <ellipse cx="64" cy="192" rx="8" ry="3.4" transform="rotate(-22 64 192)" fill="#F97316" />
        <ellipse cx="76" cy="196" rx="8" ry="3.2" fill="#FB923C" />
        <ellipse cx="88" cy="192" rx="7" ry="3" transform="rotate(18 88 192)" fill="#F97316" />
        <ellipse cx="74" cy="188" rx="12" ry="6" fill="#C2410C" />
        <ellipse cx="70" cy="186" rx="6" ry="2.2" fill="#FFEDD5" opacity="0.9" />
        <circle cx="58" cy="192" r="1.7" fill="#7C2D12" />
        <circle cx="76" cy="198" r="1.7" fill="#7C2D12" />
        <circle cx="93" cy="192" r="1.6" fill="#7C2D12" />
      </g>
      <g>
        <ellipse cx="114" cy="192" rx="7" ry="3" transform="rotate(-16 114 192)" fill="#F97316" />
        <ellipse cx="126" cy="196" rx="8" ry="3.2" fill="#FB923C" />
        <ellipse cx="138" cy="192" rx="8" ry="3.4" transform="rotate(22 138 192)" fill="#F97316" />
        <ellipse cx="126" cy="188" rx="12" ry="6" fill="#C2410C" />
        <ellipse cx="122" cy="186" rx="6" ry="2.2" fill="#FFEDD5" opacity="0.9" />
        <circle cx="109" cy="192" r="1.6" fill="#7C2D12" />
        <circle cx="126" cy="198" r="1.7" fill="#7C2D12" />
        <circle cx="144" cy="192" r="1.7" fill="#7C2D12" />
      </g>

      <circle cx="100" cy="108" r="36" fill={`url(#${uid}-head)`} stroke="#8A4E2A" strokeWidth="1.25" />
      <ellipse cx="80" cy="92" rx="14" ry="8" fill="#fff" opacity="0.34" />
      <ellipse cx="68" cy="114" rx="8" ry="4.6" fill="#FB7185" opacity={cheer ? 0.62 : oops ? 0.22 : 0.4} />
      <ellipse cx="134" cy="114" rx="8" ry="4.6" fill="#FB7185" opacity={cheer ? 0.62 : oops ? 0.22 : 0.4} />

      <path d="M66 74 C62 46 78 28 102 24 C124 22 142 36 140 60 C138 72 122 70 100 72 C82 74 70 76 66 74 Z" fill={`url(#${uid}-hat)`} stroke="#0C3A44" strokeWidth="1" />
      <g fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.45" strokeLinecap="round">
        <path d="M82 40 L90 48 L98 38" />
        <path d="M104 36 L114 46 L124 38" />
        <path d="M78 54 L88 62 L98 52" />
        <path d="M108 52 L118 62 L128 54" />
      </g>
      <ellipse cx="100" cy="74" rx="40" ry="11" fill="#0C3A44" />
      <ellipse cx="100" cy="71" rx="40" ry="8.5" fill="#176872" />
      <path d="M64 68 H136" stroke="rgba(255,255,255,0.45)" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M66 74 H134" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <path d="M68 79 H132" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
      <ellipse cx="76" cy="68" rx="11" ry="4.2" fill="#fff" />
      <circle cx="92" cy="64" r="2.4" fill="#fff" />
      <circle cx="118" cy="66" r="1.7" fill="#fff" opacity="0.95" />
      <circle cx="130" cy="30" r="13.5" fill={`url(#${uid}-pom)`} stroke="#E2E8F0" strokeWidth="0.6" />
      <circle cx="124" cy="24" r="4" fill="#fff" />
      <circle cx="134" cy="22" r="2.1" fill="#fff" opacity="0.85" />

      <path
        d={oops ? "M66 84 Q80 94 96 86" : hint ? "M64 74 Q82 64 98 82" : "M66 84 Q82 74 98 84"}
        fill="none"
        stroke="#4A2C1A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d={oops ? "M106 86 Q122 94 136 84" : hint ? "M106 84 Q122 80 136 86" : "M104 84 Q120 74 136 84"}
        fill="none"
        stroke="#4A2C1A"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {eye(82)}
      {eye(120)}

      {cheer ? (
        <g>
          <path d="M86 118 C100 108 132 110 140 124 C126 134 102 136 88 126 Z" fill="#4A2016" />
          <path d="M90 116 C106 106 130 108 138 122 C124 116 104 114 92 120 Z" fill={`url(#${uid}-beak)`} />
          <path d="M102 124 C114 134 128 132 136 124 C124 130 112 130 102 124 Z" fill="#FB7185" />
          <ellipse cx="112" cy="112" rx="10" ry="3.2" fill="#FFF6D0" opacity="0.8" />
          <path d="M108 126 C106 140 116 154 128 144 C132 134 120 124 108 126 Z" fill={`url(#${uid}-watt)`} />
          <ellipse cx="118" cy="136" rx="3.4" ry="6.5" fill="#FECDD3" opacity="0.65" />
        </g>
      ) : (
        <g>
          <path d="M90 114 C110 104 136 110 140 124 C124 132 104 130 90 120 Z" fill={`url(#${uid}-beak)`} stroke="#B45309" strokeWidth="1" />
          <ellipse cx="114" cy="112" rx="12" ry="3.4" fill="#FFF3C4" opacity="0.85" />
          <path d="M108 118 C118 122 128 120 132 116" stroke="#C2410C" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.75" />
          <path
            d={oops ? "M98 126 Q116 116 136 126" : "M96 124 Q116 138 138 124"}
            stroke="#7C2D12"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M108 126 C106 142 116 158 130 146 C134 134 122 124 108 126 Z" fill={`url(#${uid}-watt)`} />
          <ellipse cx="120" cy="138" rx="3.6" ry="7" fill="#FECDD3" opacity="0.7" />
        </g>
      )}

      <path d="M56 138 C74 124 132 124 150 140 C156 150 142 160 100 156 C62 160 48 150 56 138 Z" fill={`url(#${uid}-scarf)`} stroke="#7F1D33" strokeWidth="0.8" />
      <path d="M66 136 C90 128 122 128 146 140" stroke="#FDE68A" strokeWidth="4.4" fill="none" strokeLinecap="round" />
      <path d="M62 146 C88 138 126 140 150 150" stroke="#FFF3C4" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M74 132 C96 142 124 142 144 132" stroke="rgba(80,8,20,0.25)" strokeWidth="3.5" fill="none" />
      <path d="M136 142 C156 148 160 166 146 176 C134 168 130 154 136 142 Z" fill="#9F1239" />
      <path d="M140 152 C150 156 152 166 144 172" stroke="#FDE68A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M52 146 C34 156 30 178 44 198 C56 202 66 184 60 164 C64 154 60 148 52 146 Z" fill={`url(#${uid}-scarf)`} />
      <path d="M40 170 H60" stroke="#FDE68A" strokeWidth="3.3" strokeLinecap="round" />
      <path d="M38 182 H62" stroke="#FFF3C4" strokeWidth="3.3" strokeLinecap="round" />
      <path d="M42 196 L40 210" stroke="#7F1D33" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M48 198 L48 214" stroke="#BE123C" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M54 198 L56 212" stroke="#7F1D33" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M60 194 L64 208" stroke="#BE123C" strokeWidth="2.7" strokeLinecap="round" />

      <g transform={cheer ? "translate(2 8) rotate(-22 124 168)" : oops ? "translate(4 6) rotate(7 130 172)" : "translate(6 10)"}>
        <path d="M124 164 C150 156 170 174 160 192 C144 186 126 174 122 166 Z" fill={`url(#${uid}-wing)`} stroke="#6B3414" strokeWidth="0.9" />
        <path d="M130 170 C148 164 160 176 152 188" fill="none" stroke="#FFF1DE" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M120 176 C144 174 156 186 146 198 C128 188 116 180 120 176 Z" fill="#A15B2C" />
        <path d="M128 180 C142 180 150 188 142 196" fill="none" stroke="#F6D7B0" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      <ellipse cx="136" cy="146" rx="9" ry="3.6" fill="#fff" opacity="0.95" />
      <g stroke="#fff" strokeWidth="1.4" strokeLinecap="round">
        <path d="M154 118 V128 M149 123 H159" />
        <path d="M150.6 119.6 L157.4 126.4 M157.4 119.6 L150.6 126.4" />
      </g>

      {cheer && (
        <g>
          <path d="M28 48 L31.5 57 L41 59 L31.5 61 L28 70 L24.5 61 L15 59 L24.5 57 Z" fill="#FDE68A" stroke="#fff" strokeWidth="0.7" />
          <path d="M170 70 L172.4 76 L179 78 L172.4 80 L170 86 L167.6 80 L161 78 L167.6 76 Z" fill="#FFF7C2" stroke="#fff" strokeWidth="0.6" />
        </g>
      )}
      {oops && (
        <g>
          <path d="M156 86 C162 98 156 110 148 100 C146 92 148 82 156 86 Z" fill="#BAE6FD" stroke="#7DD3FC" strokeWidth="1.1" />
          <path d="M151 94 C154 90 156 94 155 98" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {hint && (
        <g stroke="#FDE68A" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <path d="M158 78 V92 M151 85 H165" />
          <path d="M153 80 L163 90 M163 80 L153 90" />
        </g>
      )}
    </svg>
  );
}

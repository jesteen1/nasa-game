"use client";

export type RocketArtMode = "idle" | "launching" | "away";

/**
 * Detailed 2D launch-vehicle illustration used on the briefing page.
 * Pure SVG + CSS animation: idle hover, liftoff rise, flickering exhaust.
 */
export default function RocketArt({ mode }: { mode: RocketArtMode }) {
  return (
    <div
      className={`rocket-craft ${mode === "launching" ? "is-launching" : ""} ${
        mode === "away" ? "is-away" : ""
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 220 480" className="block h-auto w-full">
        <defs>
          <linearGradient id="rs-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9fb0c4" />
            <stop offset="0.18" stopColor="#f7fbff" />
            <stop offset="0.52" stopColor="#dbe5f0" />
            <stop offset="0.82" stopColor="#b7c5d6" />
            <stop offset="1" stopColor="#8597ad" />
          </linearGradient>
          <linearGradient id="rs-nose" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8fa1b6" />
            <stop offset="0.35" stopColor="#f2f7fc" />
            <stop offset="1" stopColor="#a9b8c9" />
          </linearGradient>
          <linearGradient id="rs-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#33455c" />
            <stop offset="1" stopColor="#131d2b" />
          </linearGradient>
          <linearGradient id="rs-glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0a1a2a" />
            <stop offset="1" stopColor="#00e5ff" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="rs-flame-outer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd166" />
            <stop offset="0.45" stopColor="#ff8a1f" />
            <stop offset="1" stopColor="#ff3d00" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="rs-flame-inner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#ffd166" />
            <stop offset="1" stopColor="#ff9f1c" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="rs-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffb300" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffb300" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Engine glow */}
        <ellipse cx="110" cy="404" rx="58" ry="26" fill="url(#rs-glow)" opacity="0.55" />

        {/* Nose cone */}
        <path
          d="M110 10 C 97 50 87 78 87 104 L133 104 C 133 78 123 50 110 10 Z"
          fill="url(#rs-nose)"
          stroke="#93a7c0"
          strokeOpacity="0.7"
          strokeWidth="1"
        />
        <path d="M110 10 L110 104" stroke="#8ea3bf" strokeOpacity="0.35" strokeWidth="1" />

        {/* Fairing seam */}
        <rect x="86" y="104" width="48" height="9" fill="#cbd7e4" />
        <rect x="86" y="111" width="48" height="2" fill="#8ea3bf" opacity="0.5" />

        {/* Body */}
        <rect x="87" y="113" width="46" height="230" rx="4" fill="url(#rs-body)" stroke="#94a8bf" strokeOpacity="0.55" />

        {/* Panel seams */}
        {[150, 195, 240, 285].map((y) => (
          <line key={y} x1="87" y1={y} x2="133" y2={y} stroke="#8ea3bf" strokeOpacity="0.28" strokeWidth="1" />
        ))}

        {/* Black band + cyan stripe */}
        <rect x="87" y="168" width="46" height="14" fill="#162335" />
        <rect x="87" y="184" width="46" height="3" fill="#00e5ff" opacity="0.75" />
        <rect x="87" y="248" width="46" height="6" fill="#00e5ff" opacity="0.5" />

        {/* Porthole */}
        <circle cx="110" cy="140" r="12" fill="url(#rs-glass)" stroke="#8ea3bf" strokeWidth="1.5" />
        <circle cx="106" cy="136" r="3" fill="#ffffff" opacity="0.55" />

        {/* Registry text */}
        <text
          x="110"
          y="222"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          fontSize="13"
          letterSpacing="3"
          fill="#1b2a3d"
        >
          RS
        </text>
        <text
          x="110"
          y="238"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          fontSize="6"
          letterSpacing="1.5"
          fill="#40536b"
        >
          RS-01
        </text>

        {/* Fins */}
        <path d="M87 300 L60 362 L60 378 L87 356 Z" fill="url(#rs-dark)" stroke="#0b1424" strokeWidth="1" />
        <path d="M133 300 L160 362 L160 378 L133 356 Z" fill="url(#rs-dark)" stroke="#0b1424" strokeWidth="1" />
        <path d="M87 306 L66 360 L66 368 L87 348 Z" fill="#00e5ff" opacity="0.14" />
        <path d="M133 306 L154 360 L154 368 L133 348 Z" fill="#00e5ff" opacity="0.14" />

        {/* Engine skirt */}
        <path d="M82 342 L138 342 L131 368 L89 368 Z" fill="url(#rs-dark)" stroke="#0b1424" strokeWidth="1" />
        <line x1="110" y1="344" x2="110" y2="366" stroke="#8ea3bf" strokeOpacity="0.3" />

        {/* Nozzles */}
        <path d="M92 368 L104 368 L106 394 L90 394 Z" fill="#2b3a4f" stroke="#0b1424" strokeWidth="1" />
        <path d="M104 368 L116 368 L118 396 L102 396 Z" fill="#2b3a4f" stroke="#0b1424" strokeWidth="1" />
        <path d="M116 368 L128 368 L130 394 L114 394 Z" fill="#2b3a4f" stroke="#0b1424" strokeWidth="1" />

        {/* Exhaust */}
        <g className="rocket-flame">
          <path
            d="M110 396 C 84 424 90 454 110 466 C 130 454 136 424 110 396 Z"
            fill="url(#rs-flame-outer)"
          />
          <path
            d="M110 400 C 100 422 103 440 110 450 C 117 440 120 422 110 400 Z"
            fill="url(#rs-flame-inner)"
          />
          <path d="M102 396 Q110 416 118 396 Z" fill="#9ff3ff" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}

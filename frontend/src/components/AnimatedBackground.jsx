/**
 * AnimatedBackground
 *
 * Pure-CSS theme-aware animated background for MediLink.
 * Layers (bottom → top):
 *   1. Scrolling grid
 *   2. Floating glowing orbs
 *   3. ECG pulse line
 *   4. Dot particles
 *
 * Theme switching is handled entirely by [data-theme] CSS selectors —
 * no JS re-render needed when the user toggles the theme toggle.
 *
 * All animations use only transform / opacity / background-position
 * so they run on the GPU compositor thread without layout reflow.
 * The @media (prefers-reduced-motion) block disables everything for
 * users who have opted out of motion in their OS settings.
 */
export default function AnimatedBackground() {
  // 12 dots with varied animation timing so they never pulse in sync
  const dots = [
    { top: '8%',  left: '5%',  dur: '4.2s', delay: '0s'   },
    { top: '14%', left: '22%', dur: '6.1s', delay: '1.2s'  },
    { top: '27%', left: '78%', dur: '3.5s', delay: '2.4s'  },
    { top: '35%', left: '48%', dur: '5.7s', delay: '0.7s'  },
    { top: '52%', left: '12%', dur: '4.8s', delay: '3.1s'  },
    { top: '58%', left: '65%', dur: '3.9s', delay: '1.8s'  },
    { top: '63%', left: '33%', dur: '6.5s', delay: '4.2s'  },
    { top: '71%', left: '88%', dur: '5.1s', delay: '0.3s'  },
    { top: '80%', left: '55%', dur: '4.5s', delay: '2.9s'  },
    { top: '88%', left: '18%', dur: '7.0s', delay: '1.5s'  },
    { top: '42%', left: '92%', dur: '3.3s', delay: '4.8s'  },
    { top: '20%', left: '40%', dur: '5.4s', delay: '3.6s'  },
  ];

  return (
    <>
      {/* ── Wrapper ───────────────────────────────────────────────────────── */}
      <div className="ml-bg" aria-hidden="true">

        {/* Layer 1: Scrolling grid */}
        <div className="ml-bg-grid" />

        {/* Layer 2: Floating glowing orbs */}
        <div className="ml-orb ml-orb-1" />
        <div className="ml-orb ml-orb-2" />
        <div className="ml-orb ml-orb-3" />

        {/* Layer 3: ECG heartbeat line */}
        <svg className="ml-ecg-svg" viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <polyline
            className="ml-ecg-line"
            points="
              0,60 80,60 100,60 115,20 130,100 145,60 220,60
              300,60 320,60 335,20 350,100 365,60 440,60
              520,60 540,60 555,20 570,100 585,60 660,60
              740,60 760,60 775,20 790,100 805,60 880,60
              960,60 980,60 995,20 1010,100 1025,60 1100,60
              1180,60 1200,60 1215,20 1230,100 1245,60 1320,60
              1400,60 1440,60
            "
          />
        </svg>

        {/* Layer 4: Dot particles */}
        {dots.map((d, i) => (
          <div
            key={i}
            className="ml-dot"
            style={{
              top: d.top,
              left: d.left,
              animationDuration: d.dur,
              animationDelay: d.delay,
            }}
          />
        ))}
      </div>

      {/* ── All styles scoped with ml- prefix ─────────────────────────────── */}
      <style>{`
        /* ── Wrapper ──────────────────────────────────────────────────── */
        .ml-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }

        /* ── Layer 1: Grid ────────────────────────────────────────────── */
        /* Default (Light) */
        .ml-bg-grid {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%23DDE3EF' stroke-width='0.5'/%3E%3C/svg%3E");
          position: absolute;
          inset: 0;
          background-repeat: repeat;
          animation: ml-gridDrift 8s linear infinite;
        }

        .dark .ml-bg-grid {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%231a2a45' stroke-width='0.5'/%3E%3C/svg%3E");
        }

        @keyframes ml-gridDrift {
          0%   { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }

        /* ── Layer 2: Orbs ────────────────────────────────────────────── */
        .ml-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .ml-orb-1 {
          width: 600px; height: 600px;
          top: -200px; left: -200px;
          animation: ml-floatOrb 12s ease-in-out infinite;
          background: radial-gradient(circle, rgba(229,52,26,0.05) 0%, transparent 70%);
        }
        .ml-orb-2 {
          width: 500px; height: 500px;
          bottom: -100px; right: -100px;
          animation: ml-floatOrb 16s ease-in-out infinite reverse;
          background: radial-gradient(circle, rgba(85,102,170,0.04) 0%, transparent 70%);
        }
        .ml-orb-3 {
          width: 300px; height: 300px;
          top: 40%; left: 60%;
          animation: ml-floatOrb 10s ease-in-out infinite 3s;
          background: radial-gradient(circle, rgba(10,22,40,0.03) 0%, transparent 70%);
        }

        /* Dark orbs */
        .dark .ml-orb-1 {
          background: radial-gradient(circle, rgba(229,52,26,0.04) 0%, transparent 70%);
        }
        .dark .ml-orb-2 {
          background: radial-gradient(circle, rgba(29,158,117,0.03) 0%, transparent 70%);
        }
        .dark .ml-orb-3 {
          background: radial-gradient(circle, rgba(229,52,26,0.03) 0%, transparent 70%);
        }

        @keyframes ml-floatOrb {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-30px); }
        }

        /* ── Layer 3: ECG line ────────────────────────────────────────── */
        .ml-ecg-svg {
          position: absolute;
          bottom: 15%;
          left: 0;
          width: 100%;
          height: 120px;
        }

        .ml-ecg-line {
          fill: none;
          stroke: #E5341A;
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.12; /* Brighter in light */
          stroke-dasharray: 1800;
          stroke-dashoffset: 1800;
          animation: ml-ecgScroll 4s linear infinite;
        }

        .dark .ml-ecg-line {
          opacity: 0.06;
        }

        @keyframes ml-ecgScroll {
          0%   { stroke-dashoffset: 1800; }
          100% { stroke-dashoffset: 0; }
        }

        /* ── Layer 4: Dot particles ───────────────────────────────────── */
        /* Default (Light) dots */
        .ml-dot {
          position: absolute;
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: #5566AA;
          opacity: 0.12;
          animation: ml-dotPulse var(--dot-dur, 4s) ease-in-out infinite var(--dot-delay, 0s);
        }

        /* Dark dots */
        .dark .ml-dot {
          background: #E5341A;
          opacity: 0.1;
        }

        @keyframes ml-dotPulse {
          0%,100% { opacity: 0.08; transform: scale(1); }
          50%     { opacity: 0.22; transform: scale(1.8); }
        }

        /* ── Reduced motion ───────────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .ml-bg-grid,
          .ml-orb,
          .ml-ecg-line,
          .ml-dot {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}

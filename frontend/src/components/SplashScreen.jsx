import { useEffect, useState } from 'react';

// Module-level flag: survives React Strict Mode's double-invoke cleanup cycle.
// This ensures timers are only registered ONCE per page load.
let _splashTimersStarted = false;

/**
 * SplashScreen Component
 * - Inline SVG logo with ECG animation
 * - Curtain split animation on dismiss
 * - Guaranteed dismissal via hardcoded timeouts (no event listeners)
 * - 4s fallback safety timer
 * - Session timestamp check: shows on every refresh, skips on rapid navigation
 */
export default function SplashScreen() {
  const [logoFading, setLogoFading] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splashDone, setSplashDone] = useState(() => {
    // Lazy init: synchronously check if splash was very recently shown.
    // This skips re-rendering the splash on rapid client-side navigation (< 3s).
    try {
      const last = sessionStorage.getItem('medilink_last_splash');
      if (last && Date.now() - parseInt(last, 10) < 3000) return true;
    } catch { /* sessionStorage may not be available in SSR */ }
    return false;
  });

  useEffect(() => {
    // Already decided to skip (from synchronous check above)
    if (splashDone) return;

    // If timers were already started in this page lifecycle (Strict Mode guard),
    // this second invocation does nothing — timers from the first run still fire.
    if (_splashTimersStarted) return;
    _splashTimersStarted = true;

    // Record timestamp so rapid navigation skips the splash
    try {
      sessionStorage.setItem('medilink_last_splash', Date.now().toString());
    } catch { /* ignore */ }

    // ── Guaranteed timeout chain ──────────────────────────────────────────────
    // t1 @ 1400ms — begin logo fade-out
    const t1 = setTimeout(() => setLogoFading(true), 1400);
    // t2 @ 1600ms — trigger curtain split
    const t2 = setTimeout(() => setSplitting(true), 1600);
    // t3 @ 2500ms — unmount splash entirely
    const t3 = setTimeout(() => {
      setSplashDone(true);
      _splashTimersStarted = false; // reset for next page load
    }, 2500);
    // fallback @ 4000ms — hard safety net
    const fallback = setTimeout(() => {
      setSplashDone(true);
      _splashTimersStarted = false;
    }, 4000);

    // NOTE: We intentionally do NOT clear these in cleanup.
    // Clearing them in cleanup causes Strict Mode's remount to kill the timers,
    // which is exactly what made the splash screen stuck before.
    // These timers are harmless if they fire after unmount (setSplashDone is idempotent).
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once done, remove from DOM entirely — site is fully interactive
  if (splashDone) return null;

  return (
    <div className="ml-splash-overlay" id="splash-screen" role="presentation" aria-hidden="true">
      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div
        className="ml-splash-content"
        style={{ opacity: logoFading ? 0 : 1, transition: 'opacity 0.2s ease' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 240 60"
          className="ml-splash-svg"
          aria-label="MediLink logo"
        >
          <defs>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');
              .ml-ecg {
                fill: none;
                stroke: #E5341A;
                stroke-width: 2;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                animation: ml-ecg-scan 1.2s linear infinite;
              }
              @keyframes ml-ecg-scan {
                to { stroke-dashoffset: -100; }
              }
            `}</style>
          </defs>
          {/* Hexagonal shield icon */}
          <path
            fill="#E5341A"
            d="M12 2L2 7v6.5c0 5.55 3.84 10.74 9 12.13 5.16-1.39 9-6.58 9-12.13V7L12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z"
            transform="translate(10,12) scale(1.5)"
          />
          {/* Wordmark — hardcoded white, splash is always on dark #0A1628 */}
          <text x="55" y="42" fill="#FFFFFF" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="22">medi</text>
          <text x="105" y="42" fill="#E5341A" fontFamily="'Space Grotesk', sans-serif" fontWeight="700" fontSize="22">link</text>
          {/* ECG heartbeat line */}
          <path className="ml-ecg" d="M160 40 L170 40 L175 25 L180 50 L185 40 L200 40 L205 35 L210 40 L220 40" />
        </svg>
      </div>

      {/* ── Curtains ─────────────────────────────────────────────────────── */}
      <div className={`ml-curtain ml-curtain-top${splitting ? ' ml-split' : ''}`} />
      <div className={`ml-curtain ml-curtain-bottom${splitting ? ' ml-split' : ''}`} />

      {/* ── Scoped styles ────────────────────────────────────────────────── */}
      <style>{`
        .ml-splash-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #0A1628;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .ml-splash-content {
          position: relative;
          z-index: 10001;
          width: min(520px, 85vw);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .ml-splash-svg {
          width: 100%;
          height: auto;
        }

        .ml-curtain {
          position: absolute;
          left: 0;
          width: 100%;
          height: 50%;
          background: #0A1628;
          z-index: 10000;
          will-change: transform;
          transition: transform 0.8s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .ml-curtain-top  { top: 0; }
        .ml-curtain-bottom { bottom: 0; }

        .ml-curtain-top.ml-split    { transform: translateY(-100%); }
        .ml-curtain-bottom.ml-split { transform: translateY(100%);  }
      `}</style>
    </div>
  );
}

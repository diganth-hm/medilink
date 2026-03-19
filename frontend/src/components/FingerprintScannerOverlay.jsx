import { useEffect, useState } from 'react'

/**
 * FingerprintScannerOverlay
 * Props:
 *   state: 'scanning' | 'processing' | 'success' | 'failed'
 *   onCancel: () => void
 *   mode: 'login' | 'enroll'  (changes header text)
 */
export default function FingerprintScannerOverlay({ state = 'scanning', onCancel, mode = 'login' }) {
  const [progressKey, setProgressKey] = useState(0)

  // Restart progress bar animation each time we enter scanning state
  useEffect(() => {
    if (state === 'scanning') setProgressKey(k => k + 1)
  }, [state])

  // Arc colors by state
  const arcColor = state === 'success'
    ? '#1D9E75'
    : state === 'failed'
    ? '#444'
    : '#E5341A'

  const arcGlow = state === 'scanning' || state === 'processing'
    ? `drop-shadow(0 0 6px #E5341A)`
    : state === 'success'
    ? `drop-shadow(0 0 6px #1D9E75)`
    : 'none'

  // 9 concentric arcs, radii from 14 to 86
  const arcs = [14, 22, 30, 38, 46, 54, 62, 70, 78, 86]

  return (
    <div className="fp-overlay" role="dialog" aria-modal="true" aria-label="Biometric Scanner">
      {/* Grid bg */}
      <div className="fp-grid-bg" />

      <div className={`fp-card ${state === 'failed' ? 'fp-shake' : ''}`}>
        {/* Header */}
        <div className="fp-header">
          <span className="fp-label">
            {mode === 'enroll' ? 'FINGERPRINT ENROLLMENT' : 'BIOMETRIC VERIFICATION'}
          </span>
          <h2 className="fp-title">
            {state === 'success'
              ? 'Identity Confirmed'
              : state === 'failed'
              ? 'No Data Found'
              : mode === 'enroll'
              ? 'Enroll Your Fingerprint'
              : 'Place Your Finger'}
          </h2>
          <p className="fp-subtitle">
            {state === 'failed'
              ? 'Please enroll your fingerprint first'
              : state === 'success'
              ? 'Redirecting to your dashboard…'
              : mode === 'enroll'
              ? 'This fingerprint will be linked to your patient profile'
              : 'Hold your finger steady on the sensor'}
          </p>
        </div>

        {/* Fingerprint graphic */}
        <div className="fp-graphic-wrap">
          {/* Corner brackets */}
          <svg className="fp-brackets" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Top-left */}
            <path className="fp-bracket-path" d="M10 40 L10 10 L40 10" stroke="#E5341A" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Top-right */}
            <path className="fp-bracket-path" d="M160 10 L190 10 L190 40" stroke="#E5341A" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Bottom-left */}
            <path className="fp-bracket-path" d="M10 160 L10 190 L40 190" stroke="#E5341A" strokeWidth="1.5" strokeLinecap="round"/>
            {/* Bottom-right */}
            <path className="fp-bracket-path" d="M160 190 L190 190 L190 160" stroke="#E5341A" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>

          {/* Fingerprint arcs */}
          <svg className="fp-svg" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {arcs.map((r, i) => (
              <ellipse
                key={r}
                cx="100"
                cy="108"
                rx={r}
                ry={r * 0.72}
                className={`fp-arc ${state === 'scanning' ? 'fp-arc-pulse' : ''}`}
                style={{
                  stroke: arcColor,
                  animationDelay: `${i * 0.15}s`,
                  filter: state === 'processing' || state === 'scanning' ? arcGlow : 'none',
                  transition: 'stroke 0.4s ease, filter 0.4s ease',
                }}
              />
            ))}
            {/* Center dot */}
            <circle
              cx="100" cy="108" r="3"
              fill={arcColor}
              style={{ transition: 'fill 0.4s ease' }}
            />
            {/* Success checkmark */}
            {state === 'success' && (
              <path
                className="fp-check"
                d="M80 108 L95 123 L122 96"
                stroke="#1D9E75"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            {/* Failed X */}
            {state === 'failed' && (
              <>
                <path className="fp-x" d="M86 94 L114 122" stroke="#ff4444" strokeWidth="3" strokeLinecap="round" fill="none"/>
                <path className="fp-x" d="M114 94 L86 122" stroke="#ff4444" strokeWidth="3" strokeLinecap="round" fill="none"/>
              </>
            )}
          </svg>

          {/* Scan line */}
          {(state === 'scanning') && (
            <div className="fp-scan-line" />
          )}
        </div>

        {/* Status + dots */}
        <div className="fp-status-row">
          <span className={`fp-status-text ${state === 'success' ? 'fp-status-green' : state === 'failed' ? 'fp-status-red' : 'fp-status-red'}`}>
            {state === 'scanning' && <>Scanning<span className="fp-dot" style={{ animationName: 'fpDot1' }}>.</span><span className="fp-dot" style={{ animationName: 'fpDot2' }}>.</span><span className="fp-dot" style={{ animationName: 'fpDot3' }}>.</span></>}
            {state === 'processing' && <>Verifying identity&nbsp;<span className="fp-spinner" /></>}
            {state === 'success' && 'Identity Confirmed ✓'}
            {state === 'failed' && 'No Data Found'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="fp-progress-track">
          <div
            key={progressKey}
            className={`fp-progress-fill ${state === 'processing' || state === 'success' ? 'fp-progress-full' : ''} ${state === 'scanning' ? 'fp-progress-anim' : ''}`}
            style={{
              background: state === 'success' ? '#1D9E75' : state === 'failed' ? '#444' : '#E5341A',
            }}
          />
        </div>

        {/* Cancel */}
        <button className="fp-cancel-btn" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>

      <style>{`
        /* ── Overlay ──────────────────────────────────────────────── */
        .fp-overlay {
          position: fixed;
          inset: 0;
          z-index: 8000;
          background: #0A1628;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .fp-grid-bg {
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%231a2a45' stroke-width='0.5'/%3E%3C/svg%3E");
          background-repeat: repeat;
          animation: fpGridDrift 8s linear infinite;
          pointer-events: none;
        }
        @keyframes fpGridDrift {
          0%   { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }

        /* ── Card ─────────────────────────────────────────────────── */
        .fp-card {
          position: relative;
          z-index: 1;
          width: min(420px, 90vw);
          background: #111D30;
          border: 1px solid rgba(229,52,26,0.3);
          border-radius: 24px;
          padding: 40px 36px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        /* ── Header ───────────────────────────────────────────────── */
        .fp-header { text-align: center; }
        .fp-label {
          display: block;
          font-size: 11px;
          letter-spacing: 3px;
          color: #8899BB;
          margin-bottom: 10px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .fp-title {
          font-size: 22px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0 0 8px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .fp-subtitle {
          font-size: 14px;
          color: #8899BB;
          margin: 0;
        }

        /* ── Graphic wrapper ──────────────────────────────────────── */
        .fp-graphic-wrap {
          position: relative;
          width: 200px;
          height: 200px;
          flex-shrink: 0;
        }
        .fp-svg, .fp-brackets {
          position: absolute;
          inset: 0;
          width: 200px;
          height: 200px;
        }
        .fp-brackets { z-index: 2; }
        .fp-svg      { z-index: 1; }

        /* ── Bracket draw-in ──────────────────────────────────────── */
        .fp-bracket-path {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: fpBracketDraw 0.6s ease forwards;
        }
        @keyframes fpBracketDraw {
          to { stroke-dashoffset: 0; }
        }

        /* ── Arcs ─────────────────────────────────────────────────── */
        .fp-arc {
          fill: none;
          stroke-width: 1.4;
          stroke-linecap: round;
        }
        .fp-arc-pulse {
          animation: fpArcScan 2.5s ease-in-out infinite both;
        }
        @keyframes fpArcScan {
          0%   { stroke: #1a2a45; filter: none; }
          40%  { stroke: #E5341A; filter: drop-shadow(0 0 6px #E5341A); }
          100% { stroke: rgba(229,52,26,0.35); filter: none; }
        }

        /* ── Success / fail marks ─────────────────────────────────── */
        .fp-check {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          animation: fpDraw 0.5s ease forwards 0.1s;
        }
        .fp-x {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: fpDraw 0.4s ease forwards;
        }
        @keyframes fpDraw { to { stroke-dashoffset: 0; } }

        /* ── Scan line ────────────────────────────────────────────── */
        .fp-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #E5341A, transparent);
          animation: fpScanLine 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 3;
        }
        @keyframes fpScanLine {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        /* ── Status ───────────────────────────────────────────────── */
        .fp-status-row { display: flex; align-items: center; gap: 8px; }
        .fp-status-text {
          font-size: 14px;
          letter-spacing: 2px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'DM Sans', sans-serif;
        }
        .fp-status-red   { color: #E5341A; }
        .fp-status-green { color: #1D9E75; }
        .fp-dot {
          opacity: 0.2;
          animation: fpDotCycle 1.2s ease-in-out infinite;
          font-size: 18px;
          line-height: 1;
        }
        @keyframes fpDot1 { 0%,100%{opacity:0.2} 25%{opacity:1} }
        @keyframes fpDot2 { 0%,100%{opacity:0.2} 50%{opacity:1} }
        @keyframes fpDot3 { 0%,100%{opacity:0.2} 75%{opacity:1} }
        .fp-dot:nth-child(1) { animation-name: fpDot1; }
        .fp-dot:nth-child(2) { animation-name: fpDot2; }
        .fp-dot:nth-child(3) { animation-name: fpDot3; }

        /* ── Spinner ──────────────────────────────────────────────── */
        .fp-spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(229,52,26,0.2);
          border-top-color: #E5341A;
          border-radius: 50%;
          animation: fpSpin 0.8s linear infinite;
        }
        @keyframes fpSpin { to { transform: rotate(360deg); } }

        /* ── Progress ─────────────────────────────────────────────── */
        .fp-progress-track {
          width: 100%;
          height: 3px;
          border-radius: 2px;
          background: #1a2a45;
          overflow: hidden;
        }
        .fp-progress-fill {
          height: 100%;
          width: 0%;
          border-radius: 2px;
          transition: width 0.4s ease;
        }
        .fp-progress-anim { animation: fpProgress 3s linear forwards; }
        .fp-progress-full { width: 100% !important; animation: none; }
        @keyframes fpProgress {
          0%   { width: 0%; }
          100% { width: 100%; }
        }

        /* ── Cancel ───────────────────────────────────────────────── */
        .fp-cancel-btn {
          background: none;
          border: none;
          color: #8899BB;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 12px;
          border-radius: 4px;
          transition: color 0.2s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .fp-cancel-btn:hover { color: #FFFFFF; }

        /* ── Shake ────────────────────────────────────────────────── */
        .fp-shake {
          animation: fpShake 0.5s ease;
        }
        @keyframes fpShake {
          0%,100%{ transform: translateX(0); }
          20%    { transform: translateX(-8px); }
          40%    { transform: translateX(8px); }
          60%    { transform: translateX(-6px); }
          80%    { transform: translateX(6px); }
        }

        /* ── Reduced motion ───────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .fp-scan-line, .fp-arc-pulse, .fp-progress-anim,
          .fp-grid-bg, .fp-bracket-path, .fp-dot { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

import { useEffect, useState } from 'react';

/**
 * SplashScreen Component
 * - 2-cycle ECG heartbeat animation
 * - Logo fade-in and smooth screen fade-out
 * - Callbacks for login/register transitions
 */
export default function SplashScreen({ onComplete }) {
  const [showLogo, setShowLogo] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start ECG animation automatically via CSS
    
    // At 1500ms: fade in logo
    const logoTimer = setTimeout(() => setShowLogo(true), 1500);
    
    // At 2600ms: start total screen fade out
    const fadeTimer = setTimeout(() => setIsFading(true), 2600);
    
    // At 3000ms: complete and unmount
    const doneTimer = setTimeout(() => {
        if (onComplete) onComplete();
    }, 3000);

    return () => {
        clearTimeout(logoTimer);
        clearTimeout(fadeTimer);
        clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-[#0A1628] flex flex-col items-center justify-center transition-opacity duration-400 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative w-full max-w-lg px-8">
        <svg
          viewBox="0 0 400 100"
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E5341A" stopOpacity="0" />
              <stop offset="50%" stopColor="#E5341A" stopOpacity="1" />
              <stop offset="100%" stopColor="#E5341A" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 2 Complete ECG Cycles Path */}
          <path
            className="ml-ecg-path"
            d="M0 50 L40 50 L45 42 L50 50 L55 10 L60 70 L65 50 L85 50 L95 40 L105 50 L140 50 L180 50 L185 42 L190 50 L195 10 L200 70 L205 50 L225 50 L235 40 L245 50 L280 50 L320 50 L325 42 L330 50 L335 10 L340 70 L345 50 L365 50 L375 40 L385 50 L400 50"
            fill="none"
            stroke="#E5341A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Logo fade-in overlay */}
          <g className={`transition-opacity duration-500 ${showLogo ? 'opacity-100' : 'opacity-0'}`}>
            <path
              fill="#E5341A"
              d="M12 2L2 7v6.5c0 5.55 3.84 10.74 9 12.13 5.16-1.39 9-6.58 9-12.13V7L12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z"
              transform="translate(145, 10) scale(1.6)"
            />
            <text x="185" y="48" fill="#FFFFFF" fontFamily="'Space Grotesk', sans-serif" fontWeight="900" fontSize="26">medi</text>
            <text x="245" y="48" fill="#E5341A" fontFamily="'Space Grotesk', sans-serif" fontWeight="900" fontSize="26">link</text>
          </g>
        </svg>

        <div className="mt-8 text-center">
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 transition-opacity duration-500 ${showLogo ? 'opacity-100' : 'opacity-0'}`}>
                Emergency Medical Record Access
            </p>
        </div>
      </div>

      <style>{`
        .ml-ecg-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: ml-draw 2.5s ease-out forwards;
        }
        @keyframes ml-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

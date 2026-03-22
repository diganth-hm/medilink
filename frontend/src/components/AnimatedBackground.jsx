import { useEffect, useRef, useState } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let width, height;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ECG line state
    let ecgX = 0;
    const ecgSpeed = 2;
    
    // Dynamic colors based on isDark
    const ecgColor = isDark ? 'rgba(239,68,68,0.3)' : 'rgba(220,38,38,0.15)';
    const gridColor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.05)';
    const bgColor = isDark ? '#0f172a' : '#f1f5f9';
    const particlePrefix = isDark ? 'rgba(239,68,68,' : 'rgba(220,38,38,';

    // Floating particles
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines (subtle medical monitor feel)
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Draw multiple ECG lines
      const ecgRows = [0.3, 0.5, 0.7]; 
      ecgRows.forEach((rowFrac, i) => {
        const baseY = height * rowFrac;
        const offset = i * 60; 

        ctx.beginPath();
        ctx.strokeStyle = ecgColor;
        ctx.lineWidth = 1.2;
        ctx.shadowBlur = isDark ? 6 : 0;
        ctx.shadowColor = 'rgba(239,68,68,0.5)';

        for (let x = 0; x < width; x += 2) {
          const ecgPhase = ((x + ecgX + offset) % 180) / 180;
          const t = ecgPhase;
          let y = baseY;
          const amp = height * 0.05;

          // PQRST waveform segments
          if (t < 0.1) y = baseY + Math.sin(t/0.1*Math.PI)*amp*0.15;
          else if (t < 0.15) y = baseY;
          else if (t < 0.18) y = baseY + amp*0.4;
          else if (t < 0.22) y = baseY - amp*2.2;
          else if (t < 0.26) y = baseY + amp*0.6;
          else if (t < 0.3)  y = baseY;
          else if (t < 0.5)  y = baseY - Math.sin((t-0.3)/0.2*Math.PI)*amp*0.4;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      ecgX = (ecgX + ecgSpeed) % 180;

      // Draw floating particles
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${particlePrefix}${p.opacity})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none"
    />
  );
}

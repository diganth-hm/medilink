import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

const FRONT_STYLES = {
  wrapper: {
    perspective: '1000px',
    width: '100%',
    maxWidth: '420px',
    margin: '0 auto',
    aspectRatio: '1.586',
  },
  inner: (isFlipped) => ({
    position: 'relative',
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  }),
  front: {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #1e3a5f 100%)',
    padding: '24px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
  },
  back: {
    position: 'absolute',
    inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
    borderRadius: '16px',
    background: '#ffffff',
    padding: '24px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  },
};

export default function MedicalCard({ data }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  if (!data) return null;

  const conditions = [];
  if (data.is_diabetic) conditions.push('Diabetic');
  if (data.is_cardiac_patient) conditions.push('Cardiac');
  if (data.is_epileptic) conditions.push('Epileptic');
  if (data.is_asthmatic) conditions.push('Asthmatic');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const cardEl = document.getElementById('medical-card-capture');
      if (!cardEl) throw new Error('Card element not found');

      // Temporarily flatten the 3D transform for capture
      const innerEl = cardEl.firstElementChild;
      const originalTransform = innerEl.style.transform;
      const originalTransformStyle = innerEl.style.transformStyle;
      const originalTransition = innerEl.style.transition;

      // Show whichever face is currently visible flat
      innerEl.style.transform = isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
      innerEl.style.transformStyle = 'flat';
      innerEl.style.transition = 'none';

      // Clone the card
      const clone = cardEl.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.zIndex = '-9999';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';

      // CRITICAL: Walk clone and replace ALL oklch computed colors with hex
      const allEls = [clone, ...clone.querySelectorAll('*')];
      allEls.forEach(el => {
        const computed = window.getComputedStyle(el);
        const props = ['color', 'backgroundColor', 'borderColor',
                       'borderTopColor', 'borderBottomColor',
                       'borderLeftColor', 'borderRightColor'];
        props.forEach(prop => {
          try {
            const val = computed.getPropertyValue(
              prop.replace(/([A-Z])/g, '-$1').toLowerCase()
            );
            if (val && val.includes('oklch')) {
              // Replace oklch with safe fallback
              if (val.includes('0.985') || val.includes('0.98')) {
                el.style[prop] = '#f8fafc';
              } else if (val.includes('0.145') || val.includes('0.14')) {
                el.style[prop] = '#0f172a';
              } else if (val.includes(' 0 0)')) {
                // oklch(L 0 0) — achromatic, map by lightness
                const lMatch = val.match(/oklch\(([\d.]+)/);
                if (lMatch) {
                  const l = parseFloat(lMatch[1]);
                  el.style[prop] = l > 0.5 ? '#f1f5f9' : '#1e293b';
                }
              } else {
                el.style[prop] = prop.includes('background') ? '#ffffff' : '#0f172a';
              }
            }
          } catch(e) {}
        });
      });

      document.body.appendChild(clone);
      await new Promise(r => setTimeout(r, 100)); // let styles settle

      const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        removeContainer: true,
      });

      document.body.removeChild(clone);

      // Restore original transform
      innerEl.style.transform = originalTransform;
      innerEl.style.transformStyle = originalTransformStyle;
      innerEl.style.transition = originalTransition;

      // Trigger download
      const link = document.createElement('a');
      link.download = `medilink-card-${isFlipped ? 'back' : 'front'}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();

      toast.success('Card downloaded successfully!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div id="medical-card-capture" style={FRONT_STYLES.wrapper}>
        <div style={FRONT_STYLES.inner(isFlipped)}>
          {/* FRONT FACE */}
          <div style={FRONT_STYLES.front}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'auto' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <svg style={{ color: '#ef4444', width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  <span style={{ color: '#ef4444', fontWeight: 800, fontSize: '18px' }}>MediLink</span>
                </div>
                <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Medical ID Card</div>
              </div>
              <div style={ { background: '#dc2626', color: '#ffffff', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 } }>
                {data.blood_group || 'O+'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Patient Name</div>
              <div style={{ color: '#ffffff', fontSize: '22px', fontWeight: 700 }}>{data.full_name || 'Medical Access'}</div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {conditions.map((c, i) => (
                <span key={i} style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', padding: '3px 8px', borderRadius: '12px', fontSize: '11px' }}>
                  {c}
                </span>
              ))}
              {data.is_organ_donor && (
                <span style={{ background: '#15803d', color: '#ffffff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>
                  Organ Donor
                </span>
              )}
            </div>

            <div style={{ marginTop: 'auto' }}>
              <div style={{ color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>MediLink ID</div>
              <div style={{ color: '#93c5fd', fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.15em' }}>
                {data.medilink_id || 'PENDING'}
              </div>
            </div>

            <div style={{ background: '#1d4ed8', color: '#ffffff', textAlign: 'center', padding: '8px', borderRadius: '8px', fontSize: '11px', marginTop: '16px' }}>
               EMERGENCY MEDICAL INFORMATION
            </div>
          </div>

          {/* BACK FACE */}
          <div style={FRONT_STYLES.back}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: '#0f172a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Critical Allergies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {data.allergies ? data.allergies.split(',').map((a, i) => (
                  <span key={i} style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 500 }}>
                    {a.trim()}
                  </span>
                )) : <span style={{ color: '#64748b', fontSize: '11px' }}>None Reported</span>}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ color: '#0f172a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Current Medications</div>
              <div style={{ color: '#0f172a', fontSize: '12px' }}>{data.current_medications || 'None'}</div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: '#0f172a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Emergency Contact</div>
                <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '13px' }}>{data.emergency_contact_name}</div>
                <div style={{ color: '#2563eb', fontSize: '13px', fontFamily: 'monospace' }}>{data.emergency_contact_phone}</div>
              </div>
              <div>
                <div style={{ color: '#0f172a', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Primary Doctor</div>
                <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '13px' }}>{data.doctor_name || 'Dr. Not Assigned'}</div>
                <div style={{ color: '#2563eb', fontSize: '13px', fontFamily: 'monospace' }}>{data.doctor_phone || '---'}</div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ color: '#64748b', fontSize: '10px' }}>
                Issued: {new Date().toLocaleDateString()}
              </div>
              <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '14px' }}>MediLink</div>
            </div>

            <div style={{ background: '#1e40af', color: '#ffffff', textAlign: 'center', padding: '8px', borderRadius: '8px', fontSize: '11px', marginTop: '12px' }}>
              SCAN QR ON FRONT FOR FULL PROFILE
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '420px' }}>
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
        >
          {isFlipped ? 'Show Front' : 'Flip Card'}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
        >
          {downloading ? 'Downloading...' : 'Download PNG'}
        </button>
      </div>
    </div>
  );
}

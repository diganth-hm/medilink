import React, { useState } from 'react';
import html2canvas from 'html2canvas';

export default function MedicalCard({ data }) {
  const [isFlipped, setIsFlipped] = useState(false);
  
  if (!data) return null;

  const conditions = [];
  if (data.is_diabetic) conditions.push({ label: 'Diabetic', icon: '💉' });
  if (data.is_cardiac_patient) conditions.push({ label: 'Cardiac Patient', icon: '❤️' });
  if (data.is_epileptic) conditions.push({ label: 'Epileptic', icon: '⚡' });
  if (data.is_asthmatic) conditions.push({ label: 'Asthmatic', icon: '💨' });
  if (data.has_pacemaker) conditions.push({ label: 'Pacemaker', icon: '🔋' });
  if (data.has_implants) conditions.push({ label: 'Medical Implants', icon: '🔩' });

  const handleDownload = async () => {
    const cardEl = document.getElementById('medical-card-capture');
    if (!cardEl) return;

    // Deep clone so we don't mutate the live DOM
    const clone = cardEl.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.zIndex = '-1';
    document.body.appendChild(clone);

    // Walk every element in the clone and replace oklch computed styles
    // with safe hex fallbacks that html2canvas can parse
    const oklchToHex = {
      'oklch(0.145 0 0)': '#0f172a',
      'oklch(0.985 0 0)': '#f8fafc',
      'oklch(1 0 0)': '#ffffff',
      'oklch(0 0 0)': '#000000',
    };

    clone.querySelectorAll('*').forEach(el => {
      const computed = window.getComputedStyle(el);
      ['color', 'backgroundColor', 'borderColor'].forEach(prop => {
        const val = computed[prop];
        if (val && val.includes('oklch')) {
          // Replace known oklch values, fall back to black/white
          el.style[prop] = oklchToHex[val] || (val.includes('0.985') ? '#f8fafc' : '#0f172a');
        }
      });
    });

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = 'medilink-card.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      document.body.removeChild(clone);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-fade-in">
      {/* 3D CARD WRAPPER */}
      <div id="medical-card-capture" style={{ perspective: '1000px', width: '100%', maxWidth: '400px', aspectRatio: '1.586' }}>

        {/* INNER — this is what rotates */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>

          {/* FRONT FACE */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            color: '#ffffff',
            padding: '24px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.05em', margin: 0 }}>MEDICAL ID</h2>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, marginTop: '2px', textTransform: 'uppercase' }}>Emergency Health Profile</p>
              </div>
              <div style={{ fontSize: '1.75rem' }}>🩸</div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Blood Group</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: '900', color: '#ffffff', margin: 0, lineHeight: 1 }}>{data.blood_group || 'O+'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ background: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>Blood Type</span>
                    {data.is_organ_donor && (
                      <span style={{ background: '#15803d', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>Organ Donor</span>
                    )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
               <div>
                 <p style={{ fontSize: '0.6rem', color: '#94a3b8', margin: 0, textTransform: 'uppercase' }}>Verification</p>
                 <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#93c5fd', margin: 0 }}>SECURE ID: {data.id?.slice(-6).toUpperCase() || 'M-ID'}</p>
               </div>
               <div style={{ width: '45px', height: '30px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🆔</div>
            </div>
          </div>

          {/* BACK FACE — rotated 180deg so it starts hidden */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            background: '#ffffff',
            color: '#0f172a',
            padding: '24px',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Clinical Records
            </h3>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Allergies and Conditions Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {data.allergies && (
                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '700' }}>
                    🚫 {data.allergies}
                  </span>
                )}
                {conditions.map((c, i) => (
                  <span key={i} style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '700' }}>
                    {c.icon} {c.label}
                  </span>
                ))}
              </div>

              {/* Medications */}
              {data.current_medications && (
                <div>
                  <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', marginBottom: '2px' }}>Active Medications</p>
                  <p style={{ fontSize: '0.85rem', color: '#0f172a', margin: 0, fontWeight: '500', lineHeight: 1.2 }}>{data.current_medications}</p>
                </div>
              )}

              {/* Contacts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                <div>
                  <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', marginBottom: '2px' }}>Emergency Contact</p>
                  <p style={{ fontSize: '0.8rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>{data.emergency_contact_name || 'Not Provided'}</p>
                  <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: 0 }}>{data.emergency_contact_phone}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '800', marginBottom: '2px' }}>Primary Doctor</p>
                  <p style={{ fontSize: '0.8rem', color: '#0f172a', margin: 0, fontWeight: 600 }}>{data.doctor_name || 'Not Provided'}</p>
                  <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: 0 }}>{data.doctor_phone}</p>
                </div>
              </div>
            </div>

            {/* Bottom strip */}
            <div style={{ background: '#1e40af', color: '#ffffff', margin: '16px -24px -24px -24px', padding: '8px', fontSize: '0.7rem', textAlign: 'center', fontWeight: '700' }}>
              🚨 In emergency, scan QR or call 112
            </div>
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '400px' }}>
        {/* Toggling Button */}
        <button 
          onClick={() => setIsFlipped(prev => !prev)}
          className="btn-primary"
          style={{ 
            width: '100%', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>{isFlipped ? "Show Front" : "Flip Card"}</span>
          <span style={{ fontSize: '1.2rem' }}>↻</span>
        </button>

        {/* Download Button */}
        <button 
          onClick={handleDownload}
          className="btn-secondary"
          style={{ 
            width: '100%', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>Download Card PNG</span>
          <span style={{ fontSize: '1.2rem' }}>💾</span>
        </button>
      </div>
    </div>
  );
}



import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      height: '64px',
      padding: '0 20px',
      backgroundColor: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      marginTop: 'auto',
      zIndex: 10,
      position: 'relative'
    }}>
      <p style={{
        fontSize: '12px',
        color: 'var(--text-secondary)',
        margin: '0 0 4px 0',
        fontWeight: 500
      }}>
        Bridging the gap in emergency medical care.
      </p>
      <p style={{
        fontSize: '11px',
        color: 'var(--text-secondary)',
        margin: 0,
        opacity: 0.7
      }}>
        &copy; 2026 MediLink. All rights reserved.
      </p>
    </footer>
  );
}

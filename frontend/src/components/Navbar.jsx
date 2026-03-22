import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar Component
 * Features:
 * - Animated ECG line on logo svg
 * - Hamburger sidebar replacing top navigation links
 * - Theme toggle and login fixed in header
 */
export default function Navbar() {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('medilink_theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', savedTheme);

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setTheme('light');
      localStorage.setItem('medilink_theme', 'light');
    } else {
      html.classList.add('dark');
      setTheme('dark');
      localStorage.setItem('medilink_theme', 'dark');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const handleNavClick = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  const publicLinks = [
    { name: 'Scan QR', path: '/scan-qr', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    )},
    { name: 'Fundraising', path: '/fundraising', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )}
  ];

  const dashboardLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
    )},
    { name: 'My Profile', path: '/dashboard/profile', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    )},
    { name: 'My QR Code', path: '/dashboard/qr-code', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
    )},
    { name: 'Medical Card', path: '/dashboard/medical-card', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
    )},
    { name: 'Emergency Contacts', path: '/dashboard/emergency-contacts', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
    )},
    { name: 'Health Records', path: '/dashboard/health-records', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
    )},
    { name: 'Appointments', path: '/dashboard/appointments', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
    )},
    { name: 'Prescriptions', path: '/dashboard/prescriptions', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/></svg>
    )},
    { name: 'Settings', path: '/dashboard/settings', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
    )},
    { name: 'Nearby Hospitals', path: '/dashboard/nearby-hospitals', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
    )},
    { name: 'Chatbot AI', path: '/dashboard/chatbot', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
    )},
    { name: 'Fundraising Apply', path: '/dashboard/fundraising-apply', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    )},
    { name: 'Hospital Benefits', path: '/dashboard/concessions', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
    )},
    { name: 'Biometric Portal', path: '/dashboard/biometric-portal', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.248 0 2.442.243 3.535.66m-10.44 14.12a10.05 10.05 0 001.373 1.453m10.16-10.16a10.05 10.05 0 011.453 1.373M16.47 16.47a10.05 10.05 0 001.373 1.453m-12.014-4.82a13.31 13.31 0 015.014-5.014m5.24 10.48a13.31 13.31 0 01-5.04 5.04"/></svg>
    )}
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[1000] h-[64px] transition-all duration-300 ${
        scrolled ? 'ml-navbar-scrolled' : 'ml-navbar-default'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Logo Section */}
          <Link to="/" className="flex flex-col justify-center h-full relative" style={{ textDecoration: 'none' }}>
            <svg viewBox="0 0 200 64" className="h-[48px] w-auto">
              <defs>
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap');
                  .nav-logo-medi {
                    font-family: 'Space Grotesk', sans-serif;
                    font-weight: 700;
                    font-size: 22px;
                    transition: fill 0.3s ease;
                  }
                  .nav-logo-link {
                    font-family: 'Space Grotesk', sans-serif;
                    font-weight: 700;
                    font-size: 22px;
                    fill: #E5341A;
                  }
                  .nav-ecg-line {
                    fill: none;
                    stroke: #E5341A;
                    stroke-width: 1.2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    stroke-dasharray: 300;
                    opacity: 0;
                    animation: navEcgDraw 1.8s ease-out 0.3s forwards;
                  }
                  @keyframes navEcgDraw {
                    0%   { stroke-dashoffset: 300; opacity: 0; }
                    20%  { opacity: 1; }
                    70%  { stroke-dashoffset: 0; opacity: 0.7; }
                    100% { stroke-dashoffset: 0; opacity: 0.25; }
                  }
                  .nav-pulse-dot {
                    animation: navLivePulse 2s ease-in-out infinite;
                  }
                  @keyframes navLivePulse {
                    0%,100% { opacity: 1; transform: scale(1); }
                    50%     { opacity: 0.3; transform: scale(1.1); }
                  }
                `}</style>
              </defs>
              
              {/* Hex Shield */}
              <path 
                fill="#E5341A" 
                d="M12 2L2 7v6.5c0 5.55 3.84 10.74 9 12.13 5.16-1.39 9-6.58 9-12.13V7L12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z" 
                transform="translate(0, 10) scale(1.5)"
              />
              
              {/* Live pulsing dot center of cross */}
              <circle cx="18" cy="28" r="1.5" fill="white" className="nav-pulse-dot" />

              {/* Wordmark */}
              <text x="42" y="38" className="nav-logo-medi">medi</text>
              <text x="94" y="38" className="nav-logo-link">link</text>

              {/* Decorative ECG baseline */}
              <path 
                className="nav-ecg-line" 
                d="M42 46 L80 46 L85 41 L90 52 L95 46 L130 46 M1 1" 
              />
            </svg>
          </Link>

          {/* Right Area: Theme, Login, Hamburger */}
          <div className="flex items-center gap-2 flex-row">
            
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="ml-theme-btn"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Login / Output Button */}
            {isAuthenticated ? (
              <button onClick={handleLogout} className="ml-login-btn ml-login-outline">Logout</button>
            ) : (
              <Link to="/login" className="ml-login-btn">Login</Link>
            )}

            {/* Hamburger Button */}
            <button 
              className="ml-hamburger" 
              onClick={() => setMenuOpen(true)}
              aria-label="Open Menu"
            >
              <span className="ml-hamburger-line"></span>
              <span className="ml-hamburger-line"></span>
              <span className="ml-hamburger-line"></span>
            </button>
          </div>
        </div>
      </nav>

      {/* --- Sidebar & Backdrop --- */}
      {menuOpen && (
        <div className="ml-backdrop" onClick={() => setMenuOpen(false)}></div>
      )}
      
      <aside className={`ml-sidebar ${menuOpen ? 'ml-sidebar-open' : ''}`}>
        
        {/* Sidebar Header */}
        <div className="ml-sidebar-header">
          {/* Logo Hex Only */}
          <svg viewBox="0 0 24 24" className="w-7 h-7">
            <path fill="#E5341A" d="M12 2L2 7v6.5c0 5.55 3.84 10.74 9 12.13 5.16-1.39 9-6.58 9-12.13V7L12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z" />
            <circle cx="12" cy="12" r="1.5" fill="white" className="nav-pulse-dot" />
          </svg>
          
          <button className="ml-sidebar-close" onClick={() => setMenuOpen(false)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sidebar Links */}
        <div className="ml-sidebar-nav">
          {publicLinks.map((link) => (
            <div 
              key={link.path} 
              className={`ml-sidebar-link ${isActive(link.path) ? 'ml-sidebar-link-active' : ''}`}
              onClick={() => handleNavClick(link.path)}
            >
              <div className="ml-sidebar-icon">{link.icon}</div>
              <span>{link.name}</span>
            </div>
          ))}

          {isAuthenticated && (
            <>
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '11px',
                letterSpacing: '3px',
                padding: '16px 24px 8px',
                textTransform: 'uppercase',
                fontFamily: `'Space Grotesk', sans-serif`,
                marginTop: '8px'
              }}>
                My Account
              </div>
              {dashboardLinks.map((link) => (
                <div 
                  key={link.path} 
                  className={`ml-sidebar-link ${isActive(link.path) ? 'ml-sidebar-link-active' : ''}`}
                  onClick={() => handleNavClick(link.path)}
                >
                  <div className="ml-sidebar-icon">{link.icon}</div>
                  <span>{link.name}</span>
                </div>
              ))}
              <div 
                className="ml-sidebar-logout"
                onClick={handleLogout}
              >
                <div className="ml-sidebar-icon">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <span>Logout</span>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="ml-sidebar-footer">
          <div className="ml-tagline">Emergency Medical Record Access</div>
          <div className="ml-live-badge">
            <span className="ml-live-dot"></span>
            LIVE
          </div>
        </div>

      </aside>

      <style>{`
        /* --- Navbar Base --- */
        .ml-navbar-default {
          background-color: var(--bg-primary);
          border-bottom: 1px solid var(--border);
        }
        
        .ml-navbar-scrolled {
          background-color: var(--navbar-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        /* Inline SVG theme responses */
        .nav-logo-medi {
           fill: #0A1628; /* Light default */
        }
        .dark .nav-logo-medi {
          fill: #FFFFFF;
        }

        /* --- Right Controls --- */
        .ml-hamburger {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: transparent;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ml-hamburger-line {
          width: 18px;
          height: 2px;
          background: var(--text-primary);
          border-radius: 2px;
          transition: all 0.2s ease;
        }
        .ml-hamburger:hover {
          border-color: #E5341A;
        }
        .ml-hamburger:hover .ml-hamburger-line {
          background: #E5341A;
        }

        .ml-theme-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ml-theme-btn:hover {
          color: #E5341A;
          transform: rotate(15deg);
        }

        .ml-login-btn {
          background: #E5341A;
          color: #FFFFFF;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          padding: 0 20px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .ml-login-btn:hover {
          background: #c42d16;
          transform: translateY(-1px);
        }
        .ml-login-outline {
          background: transparent;
          color: var(--text-primary);
          border: 1px solid var(--border);
        }
        .ml-login-outline:hover {
          border-color: #E5341A;
          color: #E5341A;
          background: rgba(229, 52, 26, 0.05);
        }

        /* --- Sidebar & Backdrop --- */
        .ml-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1999;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          animation: mlFadeIn 0.3s ease forwards;
        }
        @keyframes mlFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .ml-sidebar {
          width: min(320px, 85vw);
          height: 100vh;
          position: fixed;
          top: 0;
          right: 0;
          z-index: 2000;
          background: var(--bg-secondary);
          border-left: 1px solid var(--border);
          padding: 0;
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.76, 0, 0.24, 1);
          display: flex;
          flex-direction: column;
        }
        .ml-sidebar-open {
          transform: translateX(0);
        }

        .ml-sidebar-header {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .ml-sidebar-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 4px;
        }
        .ml-sidebar-close:hover {
          color: #E5341A;
        }

        .ml-sidebar-nav {
          flex: 1;
          padding: 16px 0;
          overflow-y: auto;
        }

        .ml-sidebar-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
          border-left: 3px solid transparent;
          transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
        }
        .ml-sidebar-link:hover, .ml-sidebar-link-active {
          background: rgba(229, 52, 26, 0.06);
          border-left-color: #E5341A;
          color: #E5341A;
        }

        .ml-sidebar-footer {
          padding: 24px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
        }

        .ml-tagline {
          font-size: 11px;
          letter-spacing: 3px;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 10px;
          font-family: 'Space Grotesk', sans-serif;
        }

        .ml-live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #E5341A;
          font-weight: 700;
          font-size: 12px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .ml-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #E5341A;
          animation: mlPulse 2s infinite;
        }
        @keyframes mlPulse {
          0% { box-shadow: 0 0 0 0 rgba(229, 52, 26, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(229, 52, 26, 0); }
        }

        .ml-sidebar-icon svg {
          width: 20px;
          height: 20px;
        }

        .ml-sidebar-link:hover .ml-sidebar-icon svg, 
        .ml-sidebar-link-active .ml-sidebar-icon svg {
          color: #E5341A;
        }

        .ml-sidebar-logout {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 500;
          color: #E5341A;
          cursor: pointer;
          border-top: 1px solid var(--border);
          transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
          margin-top: 8px;
        }
        
        .ml-sidebar-logout:hover {
          background: rgba(229, 52, 26, 0.06);
        }

      `}</style>
    </>
  );
}

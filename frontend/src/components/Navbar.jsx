import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar Component for MediLink
 * Features include sticky behavior, theme toggle, and responsive design.
 */
export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Sync React state with the data-theme attribute set in index.html/localStorage
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme);

    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('medilink_theme', newTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[1000] h-[64px] transition-all duration-300 ${
        scrolled 
          ? 'navbar-scrolled' 
          : 'navbar-default'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-2 group" style={{ textDecoration: 'none' }}>
            <div className="h-[36px] w-[36px]">
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path fill="#E5341A" d="M12 2L2 7v6.5c0 5.55 3.84 10.74 9 12.13 5.16-1.39 9-6.58 9-12.13V7L12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z" />
              </svg>
            </div>
            <span className="text-[22px] font-[700] tracking-tight flex items-center logo-wordmark">
              <span className="logo-medi-text transition-colors duration-300">medi</span>
              <span className="text-[#E5341A]">link</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/scan" className={`nav-link ${isActive('/scan') ? 'active' : ''}`}>Scan QR</Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>Dashboard</Link>
                <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>Profile</Link>
                <Link to="/records" className={`nav-link ${isActive('/records') ? 'active' : ''}`}>Records</Link>
              </>
            ) : (
              <Link to="/explore-fundraising" className={`nav-link ${isActive('/explore-fundraising') ? 'active' : ''}`}>Fundraising</Link>
            )}

            <div className="flex items-center gap-4 ml-2">
              {/* Theme Toggle Button */}
              <button 
                onClick={toggleTheme}
                className="theme-toggle-btn"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {isAuthenticated ? (
                <button onClick={handleLogout} className="btn-action">Logout</button>
              ) : (
                <Link to="/login" className="btn-action">Login</Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-[var(--text-primary)] transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden mobile-menu-overlay animate-slideDown">
            <div className="px-6 py-8 flex flex-col gap-6">
              <Link to="/scan" onClick={() => setMenuOpen(false)} className="nav-link text-lg">Scan QR</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="nav-link text-lg">Dashboard</Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="nav-link text-lg">Profile</Link>
                  <button onClick={handleLogout} className="btn-action w-full text-center">Logout</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-action w-full text-center">Login</Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <style>{`
        .navbar-default {
          background-color: var(--bg-primary);
          border-bottom: 1px solid var(--border);
        }
        
        .navbar-scrolled {
          background-color: var(--navbar-bg);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }

        [data-theme="light"] .navbar-default {
          background-color: var(--bg-primary);
          border-bottom-color: var(--border);
        }

        .logo-medi-text {
          color: var(--text-primary);
        }

        [data-theme="light"] .logo-medi-text {
          color: var(--text-primary);
        }

        .nav-link {
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          font-size: 15px;
          color: var(--text-secondary);
          transition: color 0.3s ease;
          text-decoration: none;
        }

        .nav-link:hover, .nav-link.active {
          color: var(--text-primary);
        }

        .theme-toggle-btn {
          padding: 8px;
          border-radius: 9999px;
          color: var(--text-primary);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        
        .theme-toggle-btn:hover {
          background-color: rgba(128, 128, 128, 0.15);
          transform: rotate(15deg);
        }

        .btn-action {
          background-color: #E5341A;
          color: var(--text-primary);
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          padding: 10px 24px;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          text-decoration: none;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(229, 52, 26, 0.3);
        }

        .btn-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(229, 52, 26, 0.4);
        }

        .mobile-menu-overlay {
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease forwards;
        }
      `}</style>
    </>
  );
}

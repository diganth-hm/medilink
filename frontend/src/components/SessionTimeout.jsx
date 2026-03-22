import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const WARNING_DURATION = 60 * 1000;      // 60 seconds

export default function SessionTimeout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60);
  
  const timeoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const resetTimers = useCallback(() => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setShowWarning(false);
    setRemainingTime(60);

    if (isAuthenticated) {
      timeoutTimerRef.current = setTimeout(() => {
        handleWarning();
      }, TIMEOUT_DURATION - WARNING_DURATION);
    }
  }, [isAuthenticated]);

  const handleWarning = () => {
    setShowWarning(true);
    let secondsLeft = 60;
    
    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setRemainingTime(secondsLeft);
      if (secondsLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
        handleLogout();
      }
    }, 1000);
  };

  const handleLogout = useCallback(() => {
    logout();
    setShowWarning(false);
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    if (isAuthenticated) {
      resetTimers();
      events.forEach(event => window.addEventListener(event, resetTimers));
    }

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimers));
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isAuthenticated, resetTimers]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-300">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">Session Expiring</h3>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-6">
          You have been inactive for a while. You will be logged out in <span className="font-bold text-red-600">{remainingTime}s</span> for security reasons.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={resetTimers}
            className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}

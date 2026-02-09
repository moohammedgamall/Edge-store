
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onAdminTrigger: () => void;
  onLogout: () => void;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  logoUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ onAdminTrigger, onLogout, onThemeToggle, isDarkMode, logoUrl }) => {
  const [clickCount, setClickCount] = useState(0);
  const [imgError, setImgError] = useState(false);
  const isAdminPath = window.location.hash === '#/admin';

  const handleTitleClick = () => {
    setClickCount(prev => prev + 1);
  };

  useEffect(() => {
    if (clickCount === 3) {
      onAdminTrigger();
      setClickCount(0);
    }
    const timer = setTimeout(() => {
      if (clickCount > 0) setClickCount(0);
    }, 1000);

    return () => clearTimeout(timer);
  }, [clickCount, onAdminTrigger]);

  const defaultLogo = "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa";
  const finalLogo = logoUrl || defaultLogo;

  return (
    <header className="sticky top-0 z-40 w-full flex justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="w-full max-w-7xl px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        <div 
          onClick={handleTitleClick}
          className="flex items-center gap-3 md:gap-4 cursor-pointer select-none active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full overflow-hidden relative shadow-md bg-zinc-100 dark:bg-zinc-800 shrink-0">
            {!imgError ? (
              <img 
                src={finalLogo}
                alt="Mohamed Edge" 
                className="w-full h-full object-cover rounded-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center rounded-full">
                <span className="text-white font-black text-[10px] tracking-tighter">ME</span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 leading-none truncate max-w-[120px] md:max-w-none">Mohamed Edge</h1>
            <span className="text-[7px] md:text-[9px] font-bold text-[#007AFF] uppercase tracking-[0.2em] mt-0.5 md:mt-1">Solo Entrepreneur</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={onThemeToggle}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-[#007AFF] transition-all"
          >
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
          </button>

          {isAdminPath && (
            <div className="flex items-center gap-2 md:gap-3 animate-in fade-in slide-in-from-right-4">
              <span className="hidden sm:inline-block bg-red-500/10 text-red-600 text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20">
                Admin
              </span>
              <button 
                onClick={onLogout}
                className="text-zinc-400 font-bold text-xs md:text-sm hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

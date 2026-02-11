
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  isAdmin: boolean;
  onAdminTrigger: () => void;
  onLogout: () => void;
  onThemeToggle: () => void;
  isDarkMode: boolean;
  logoUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, onAdminTrigger, onLogout, onThemeToggle, isDarkMode, logoUrl }) => {
  const [imgError, setImgError] = useState(false);

  // إعادة ضبط الخطأ وإجبار المتصفح على تحميل الصورة الجديدة
  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const defaultLogo = "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa";
  const finalLogo = logoUrl || defaultLogo;

  return (
    <header className="sticky top-0 z-40 w-full flex justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="w-full max-w-7xl px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4 select-none">
          <div className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center rounded-full overflow-hidden relative shadow-md bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-white/10">
            {!imgError ? (
              <img 
                key={finalLogo} // استخدام الرابط كـ key لإجبار React على إعادة بناء العنصر
                src={finalLogo}
                alt="Branding" 
                className="w-full h-full object-cover"
                onError={() => {
                  console.warn("Logo failed to load, using placeholder");
                  setImgError(true);
                }}
              />
            ) : (
              <div className="w-full h-full bg-[#007AFF] flex items-center justify-center">
                <span className="text-white font-black text-xs">ME</span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-2xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 leading-none whitespace-nowrap">Mohamed Edge</h1>
            <span className="text-[7px] md:text-[9px] font-bold text-[#007AFF] uppercase tracking-[0.2em] mt-0.5 md:mt-1">Digital Craftsman</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <button 
            onClick={onThemeToggle}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-[#007AFF] transition-all"
            aria-label="Toggle Dark Mode"
          >
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
          </button>

          {isAdmin && (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="hidden sm:inline-block bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-[#007AFF]/20">
                PRO
              </span>
              <button 
                onClick={onLogout}
                className="text-zinc-400 font-bold text-xs md:text-sm hover:text-red-500 transition-colors"
              >
                Exit
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

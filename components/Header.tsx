
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onAdminTrigger: () => void;
  onLogout: () => void;
  logoUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ onAdminTrigger, onLogout, logoUrl }) => {
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
    <header className="sticky top-0 z-40 w-full flex justify-center bg-white/80 backdrop-blur-3xl border-b border-zinc-200/50">
      <div className="w-full max-w-7xl px-8 py-5 flex items-center justify-between">
        <div 
          onClick={handleTitleClick}
          className="flex items-center gap-4 cursor-pointer select-none active:scale-95 transition-transform"
        >
          {/* حاوية الشعار */}
          <div className="w-12 h-12 flex items-center justify-center bg-white rounded-xl overflow-hidden shadow-sm border border-zinc-100 p-1 relative">
            {!imgError ? (
              <img 
                src={finalLogo}
                alt="Edge Store" 
                className="w-full h-full object-contain block"
                onError={() => setImgError(true)}
              />
            ) : (
              // تصميم بديل احترافي في حال لم تظهر الصورة
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center rounded-lg">
                <span className="text-white font-black text-[10px] tracking-tighter">ME</span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-zinc-900 leading-none">Edge Store</h1>
            <span className="text-[9px] font-bold text-[#007AFF] uppercase tracking-[0.2em]">Digital Assets</span>
          </div>
        </div>

        {isAdminPath && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
            <span className="bg-red-500/10 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20">
              Admin Mode
            </span>
            <button 
              onClick={onLogout}
              className="text-zinc-400 font-bold text-sm hover:text-zinc-900 transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

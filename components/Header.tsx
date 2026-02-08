
import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onAdminTrigger: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAdminTrigger, onLogout }) => {
  const [clickCount, setClickCount] = useState(0);
  const isAdminPath = window.location.hash === '#/admin';

  // Detect triple click on the title
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
    }, 1000); // Reset clicks if more than 1s passes

    return () => clearTimeout(timer);
  }, [clickCount, onAdminTrigger]);

  return (
    <header className="sticky top-0 z-40 w-full flex justify-center bg-white/80 backdrop-blur-3xl border-b border-zinc-200/50">
      <div className="w-full max-w-7xl px-8 py-5 flex items-center justify-between">
        <div 
          onClick={handleTitleClick}
          className="flex items-center gap-3 cursor-pointer select-none active:scale-95 transition-transform"
        >
          {/* استبدال شعار الحرف بصورة logo.jpg */}
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 bg-zinc-100">
            <img 
              src="images/logo.jpg" 
              alt="Edge Store Logo" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback in case image doesn't exist yet
                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=E&background=007AFF&color=fff';
              }}
            />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-zinc-900">Edge Store</h1>
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

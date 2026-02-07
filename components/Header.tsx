import React from 'react';

interface HeaderProps {
  onAdminClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAdminClick }) => {
  const isAdminPath = window.location.hash === '#/admin';

  return (
    <header className="sticky top-0 z-40 w-full flex justify-center bg-white/80 backdrop-blur-3xl border-b border-zinc-200/50">
      <div className="w-full max-w-7xl px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0051FF] flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-black text-xl">E</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-zinc-900">Edge Store</h1>
        </div>

        {isAdminPath && (
          <div className="flex items-center gap-3">
            <span className="bg-red-500/10 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-red-500/20">
              Admin Mode
            </span>
            <button 
              onClick={() => window.location.hash = '#/'}
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
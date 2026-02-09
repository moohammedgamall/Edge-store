
import React from 'react';
import { Section } from '../types';
import { NAV_ITEMS } from '../constants';

interface BottomNavProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeSection, onSectionChange }) => {
  const ALL_ITEMS = [
    ...NAV_ITEMS,
    { id: 'Order' as Section, label: 'ORDER', icon: 'fa-solid fa-bag-shopping' }
  ];

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 px-4 flex justify-center">
      <div className="w-full max-w-[420px] bg-white/80 dark:bg-[#2C2C2E]/90 backdrop-blur-2xl rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/40 dark:border-white/5 p-1.5">
        <nav className="flex items-center justify-between relative">
          {ALL_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const isOrder = item.id === 'Order';
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center py-2.5 transition-all duration-300 outline-none group"
              >
                {/* Active Pill Background */}
                {isActive && (
                  <div className="absolute inset-y-1 inset-x-1 bg-blue-50 dark:bg-blue-900/30 rounded-full animate-in fade-in zoom-in-95 duration-300 -z-10" />
                )}
                
                <div className="relative">
                  <div className={`
                    transition-all duration-300 mb-1 flex items-center justify-center
                    ${isActive ? 'text-[#007AFF] scale-110' : 'text-zinc-400 dark:text-zinc-500'}
                  `}>
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  
                  {/* NEW Badge for Order */}
                  {isOrder && (
                    <div className="absolute -top-1.5 -right-3 bg-[#007AFF] text-white text-[7px] font-black px-1 py-0.5 rounded-md shadow-sm border border-white dark:border-zinc-800 scale-90 group-hover:scale-100 transition-transform">
                      NEW
                    </div>
                  )}
                </div>
                
                <span className={`
                  text-[9px] font-black tracking-tighter transition-colors duration-300
                  ${isActive ? 'text-[#007AFF]' : 'text-zinc-400 dark:text-zinc-500'}
                `}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default BottomNav;

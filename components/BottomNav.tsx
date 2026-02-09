
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
    <div className="fixed bottom-3 left-0 right-0 z-50 px-4 flex justify-center">
      <div className="w-full max-w-[420px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/40 dark:border-white/5 p-1">
        <nav className="flex items-center justify-between relative">
          {ALL_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const isOrder = item.id === 'Order';
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`
                  relative flex-1 flex flex-col items-center justify-center py-1.5 px-0.5
                  transition-all duration-300 outline-none
                  ${isActive ? 'z-10' : 'z-0'}
                `}
              >
                {/* Active Pill Background - Sleeker and smaller */}
                {isActive && (
                  <div className="absolute inset-y-0.5 inset-x-1 bg-[#E8F2FF] dark:bg-blue-600/20 rounded-full animate-in fade-in zoom-in-95 duration-300 -z-10 shadow-sm" />
                )}
                
                <div className="relative flex flex-col items-center">
                  <div className={`
                    transition-all duration-300 flex items-center justify-center mb-0.5
                    ${isActive ? 'text-[#007AFF] scale-105' : 'text-[#8E8E93] dark:text-[#98989D]'}
                  `}>
                    <i className={`${item.icon} ${isActive ? 'text-sm' : 'text-[13px]'}`}></i>
                  </div>
                  
                  {/* NEW Badge for Order */}
                  {isOrder && (
                    <div className="absolute -top-1.5 -right-4 bg-[#007AFF] text-white text-[6px] font-black px-1 py-0.5 rounded-sm shadow-sm border border-white dark:border-zinc-800">
                      NEW
                    </div>
                  )}

                  <span className={`
                    text-[7.5px] font-black tracking-tighter transition-colors duration-300 uppercase
                    ${isActive ? 'text-[#007AFF]' : 'text-[#8E8E93] dark:text-[#98989D]'}
                  `}>
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default BottomNav;

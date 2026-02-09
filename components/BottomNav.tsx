
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
      <div className="w-full max-w-[500px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/40 dark:border-white/5 p-1.5">
        <nav className="flex items-center justify-between relative px-1">
          {ALL_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const isOrder = item.id === 'Order';
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`
                  relative flex-1 flex flex-col items-center justify-center py-2.5 px-1
                  transition-all duration-300 outline-none
                  ${isActive ? 'z-10' : 'z-0'}
                `}
              >
                {/* Active Pill Background - Exactly as in the image */}
                {isActive && (
                  <div className="absolute inset-y-1 inset-x-0.5 bg-[#E8F2FF] dark:bg-blue-600/20 rounded-[1.8rem] animate-in fade-in zoom-in-95 duration-300 -z-10 shadow-sm" />
                )}
                
                <div className="relative flex flex-col items-center gap-0.5">
                  <div className={`
                    transition-all duration-300 flex items-center justify-center
                    ${isActive ? 'text-[#007AFF] scale-110' : 'text-[#8E8E93] dark:text-[#98989D]'}
                  `}>
                    <i className={`${item.icon} ${isActive ? 'text-lg' : 'text-base'}`}></i>
                  </div>
                  
                  {/* NEW Badge for Order - Adjusted Position */}
                  {isOrder && (
                    <div className="absolute -top-2.5 -right-5 bg-[#007AFF] text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm border border-white dark:border-zinc-800">
                      NEW
                    </div>
                  )}

                  <span className={`
                    text-[9px] font-black tracking-tighter transition-colors duration-300 uppercase
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

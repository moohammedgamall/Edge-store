
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
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 flex justify-center">
      <div className="w-full max-w-[440px] bg-white/90 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/5 p-1">
        <nav className="flex items-center justify-around relative">
          {ALL_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            const isOrder = item.id === 'Order';
            
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center py-2 transition-all duration-300 outline-none group"
              >
                {/* Active Pill Background */}
                {isActive && (
                  <div className="absolute inset-y-1 inset-x-1.5 bg-[#EBF5FF] dark:bg-blue-600/20 rounded-2xl animate-in fade-in zoom-in-95 duration-300 -z-10" />
                )}
                
                <div className="relative flex flex-col items-center">
                  <div className={`
                    transition-all duration-300 mb-0.5 flex items-center justify-center
                    ${isActive ? 'text-[#007AFF] scale-105' : 'text-[#8E8E93] dark:text-[#98989D]'}
                  `}>
                    <i className={`${item.icon} ${isActive ? 'text-lg' : 'text-base'}`}></i>
                  </div>
                  
                  {/* NEW Badge for Order */}
                  {isOrder && (
                    <div className="absolute -top-1.5 -right-5 bg-[#007AFF] text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm border border-white dark:border-zinc-800 scale-90">
                      NEW
                    </div>
                  )}

                  <span className={`
                    text-[8px] font-black tracking-tighter transition-colors duration-300 uppercase
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

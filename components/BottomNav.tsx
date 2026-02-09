
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
      <div className="w-full max-w-[420px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl rounded-full shadow-2xl border border-white/40 dark:border-white/5 p-1">
        <nav className="flex items-center justify-between relative">
          {ALL_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className="relative flex-1 flex flex-col items-center justify-center py-2 transition-all outline-none"
              >
                {isActive && (
                  <div className="absolute inset-y-0.5 inset-x-1 bg-[#E8F2FF] dark:bg-blue-600/20 rounded-full animate-in fade-in zoom-in-95 duration-300 -z-10 shadow-sm" />
                )}
                <div className={`transition-all duration-300 ${isActive ? 'text-[#007AFF] scale-110' : 'text-zinc-400'}`}>
                  <i className={`${item.icon} text-sm mb-0.5`}></i>
                </div>
                <span className={`text-[7.5px] font-black tracking-tighter uppercase ${isActive ? 'text-[#007AFF]' : 'text-zinc-400'}`}>
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

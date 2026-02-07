
import React from 'react';
import { Section } from '../types';
import { NAV_ITEMS } from '../constants';

interface BottomNavProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeSection, onSectionChange }) => {
  // Combine all items including Order for uniform rendering
  const ALL_ITEMS = [
    ...NAV_ITEMS,
    { id: 'Order' as Section, label: 'Order', icon: 'fa-solid fa-bag-shopping' }
  ];

  const getIconColor = (isActive: boolean) => {
    if (isActive) return 'text-[#007AFF]';
    return 'text-zinc-500';
  };

  const getBgStyle = (isActive: boolean) => {
    if (isActive) return 'bg-[#E5E5EA]';
    return 'hover:bg-zinc-100/30';
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none px-4 flex justify-center">
      <div className="w-full max-w-lg flex items-center justify-center pointer-events-auto">
        <div className="w-full flex items-center bg-white/90 backdrop-blur-3xl p-1.5 rounded-full shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-white/40 transition-all duration-300">
          <nav className="flex-1 flex items-center justify-between w-full">
            {ALL_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`relative flex-1 flex flex-col items-center justify-center transition-all duration-300 py-2.5 rounded-full
                    ${getBgStyle(isActive)}
                  `}
                >
                  <div className={`transition-all duration-300 ${getIconColor(isActive)} ${isActive ? 'scale-110' : 'scale-100'}`}>
                    <i className={`${item.icon} text-lg`}></i>
                  </div>
                  <span className={`
                    text-[10px] font-bold mt-0.5 transition-colors duration-300 whitespace-nowrap tracking-tight
                    ${isActive ? 'text-[#007AFF]' : 'text-zinc-600'}
                  `}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default BottomNav;

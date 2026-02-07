
import React from 'react';
import { Section } from '../types';
import { NAV_ITEMS } from '../constants';

interface BottomNavProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeSection, onSectionChange }) => {
  // دمج العناصر الأساسية مع عنصر الطلب (Order)
  const ALL_ITEMS = [
    ...NAV_ITEMS,
    { id: 'Order' as Section, label: 'Order', icon: 'fa-solid fa-bag-shopping' }
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none px-4 flex justify-center">
      {/* تقليل العرض الأقصى للحاوية قليلاً */}
      <div className="w-full max-w-[360px] flex items-center justify-center pointer-events-auto">
        {/* تقليل الحشو الداخلي (Padding) لتقليل الارتفاع العام */}
        <div className="w-full flex items-center bg-white/95 backdrop-blur-3xl p-1.5 rounded-full shadow-[0_15px_40px_-10px_rgba(0,0,0,0.12)] border border-white/50">
          <nav className="flex items-center justify-around w-full">
            {ALL_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className="relative flex-1 flex items-center justify-center transition-all duration-300 group outline-none"
                >
                  {/* خلفية الكبسولة (Pill) - تم تصغيرها قليلاً وضبط الحشو لمنع الخروج عن الإطار */}
                  <div className={`
                    relative flex flex-col items-center justify-center px-3 py-1.5 rounded-full transition-all duration-400 ease-out min-w-[60px]
                    ${isActive ? 'bg-[#007AFF]/10' : 'bg-transparent group-hover:bg-zinc-100/50'}
                  `}>
                    <div className={`
                      transition-all duration-300 text-base mb-0.5
                      ${isActive ? 'text-[#007AFF] scale-105' : 'text-zinc-400 group-hover:text-zinc-600'}
                    `}>
                      <i className={item.icon}></i>
                    </div>
                    
                    {/* نص التبويب - تصغير الخط قليلاً لضمان الاحتواء */}
                    <span className={`
                      text-[8px] font-black tracking-tight transition-colors duration-300 uppercase
                      ${isActive ? 'text-[#007AFF]' : 'text-zinc-500'}
                    `}>
                      {item.label}
                    </span>

                    {/* شارة التنبيه النشطة - تحسين موقعها لمنع الخروج عن الإطار */}
                    {item.id === 'Order' && isActive && (
                      <span className="absolute top-0 right-1 bg-[#007AFF] text-white text-[6px] font-black px-1 py-0.5 rounded-full border border-white shadow-sm scale-90">
                        NEW
                      </span>
                    )}
                  </div>
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

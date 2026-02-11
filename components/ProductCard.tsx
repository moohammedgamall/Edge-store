import React from 'react';
import { Product, Section } from '../types';

interface ProductCardProps {
  product: Product;
  onBuy: (productId: string, category: string) => void;
  onPreview: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onBuy, onPreview }) => {
  return (
    <div className="glass-panel group flex flex-col h-full relative overflow-hidden rounded-[2.5rem] transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/5 hover:border-[#007AFF]/40">
      {/* Image Container */}
      <div 
        onClick={() => onPreview(product.id)}
        className="aspect-[4/5] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 cursor-pointer relative shrink-0"
      >
        {/* Main sharp image - Using object-cover for card consistency as requested */}
        <img 
          src={product.image} 
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Dynamic Overlay */}
        <div className="absolute inset-0 z-20 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
           <div className="bg-white/20 backdrop-blur-xl px-6 py-2.5 rounded-full border border-white/30 text-white font-black text-[10px] uppercase tracking-widest translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
             Preview Details
           </div>
        </div>
        
        {/* Android Version Badge */}
        {product.android_version && (
          <div className="absolute top-5 left-5 z-30 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-2">
            <i className="fa-brands fa-android text-green-400"></i>
            {product.android_version}
          </div>
        )}

        {/* Premium Badge */}
        {product.is_premium && (
          <div className="absolute top-5 right-5 z-30 w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center border border-white/20 shadow-lg shadow-blue-500/40">
            <i className="fa-solid fa-crown text-[10px] text-white"></i>
          </div>
        )}
      </div>

      {/* Content Section - Flex-grow to fill card height */}
      <div className="p-8 flex flex-col flex-grow gap-4">
        <div 
          onClick={() => onPreview(product.id)}
          className="space-y-1 cursor-pointer"
        >
          <div className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest opacity-80">
            {product.category}
          </div>
          <h3 className="font-black text-2xl tracking-tighter text-zinc-900 dark:text-zinc-100 group-hover:text-[#007AFF] transition-colors line-clamp-1">
            {product.title}
          </h3>
        </div>
        
        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium line-clamp-2 flex-grow">
          {product.description}
        </p>

        <div className="pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50 mt-auto">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pricing</span>
            <span className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              {product.price === 0 ? 'FREE' : `${product.price.toLocaleString()} EGP`}
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onBuy(product.id, product.category);
            }}
            className="px-6 py-3.5 rounded-2xl bg-[#007AFF] text-white font-black text-[11px] uppercase tracking-widest transition-all hover:bg-blue-600 active:scale-95 shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            {product.price === 0 ? 'Download' : 'Buy'}
            <i className={`fa-solid ${product.price === 0 ? 'fa-download' : 'fa-cart-shopping'} text-[10px]`}></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
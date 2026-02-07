import React from 'react';
import { Product, Section } from '../types';

interface ProductCardProps {
  product: Product;
  onBuy: (productId: string, category: string) => void;
  onPreview: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onBuy, onPreview }) => {
  return (
    <div className="glass-panel group relative overflow-hidden rounded-[2rem] transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:border-[#007AFF]/30">
      {/* Image Preview Trigger */}
      <div 
        onClick={() => onPreview(product.id)}
        className="aspect-[16/9] w-full overflow-hidden bg-zinc-100 cursor-pointer relative"
      >
        <img 
          src={product.image} 
          alt={product.title}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
           <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-black text-xs uppercase tracking-widest translate-y-4 group-hover:translate-y-0 duration-500">
             View Preview
           </div>
        </div>
      </div>

      <div className="p-7 flex flex-col gap-3">
        <div 
          onClick={() => onPreview(product.id)}
          className="flex justify-between items-start cursor-pointer"
        >
          <h3 className="font-black text-xl tracking-tight text-zinc-900 group-hover:text-[#007AFF] transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg">
            <i className="fa-solid fa-star text-xs"></i>
            <span className="text-xs font-black">{product.rating}</span>
          </div>
        </div>
        
        <p className="text-zinc-500 text-sm leading-relaxed min-h-[40px] font-medium">
          {product.description}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-[#1C1C1E]">
              {product.price === 0 ? 'FREE' : `$${product.price.toFixed(2)}`}
            </span>
            {product.isPremium && (
              <div className="p-1.5 bg-blue-50 rounded-full">
                <i className="fa-solid fa-shield-halved text-sm text-[#007AFF]"></i>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onBuy(product.id, product.category);
          }}
          className="mt-4 w-full py-4 rounded-xl bg-[#007AFF] text-white font-black text-sm transition-all hover:bg-blue-600 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
        >
          {product.price === 0 ? 'DOWNLOAD' : 'BUY NOW'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
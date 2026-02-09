import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings, YoutubeVideo } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [banner, setBanner] = useState<BannerSettings>(DEFAULT_BANNER);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');

  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Sync Theme
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sync Routing
  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        setSelectedProductId(hash.replace('#/preview/', ''));
        setActiveSection('Preview');
      } else if (hash === '#/order') setActiveSection('Order');
      else if (hash === '#/themes') setActiveSection('Themes');
      else if (hash === '#/widgets') setActiveSection('Widgets');
      else if (hash === '#/walls') setActiveSection('Walls');
      else if (hash === '#/admin' && isAdminMode) setActiveSection('Admin');
      else setActiveSection('Home');
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode]);

  // Fetch Database
  useEffect(() => {
    const fetchDB = async () => {
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) setProducts(data);
      else setProducts(MOCK_PRODUCTS);
      setTimeout(() => setIsLoading(false), 1200);
    };
    fetchDB();
  }, []);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);
  const filteredOrderItems = useMemo(() => products.filter(p => p.category === orderCategory), [products, orderCategory]);

  const handleOrderTelegram = () => {
    if (!orderProduct) return;
    const msg = `New Order Request:%0A- Device: ${orderPhoneType}%0A- Category: ${orderCategory}%0A- Asset: ${orderProduct.title}%0A- Price: ${orderProduct.price} EGP`;
    window.open(`https://t.me/Mohamed_edge?text=${msg}`);
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="w-32 h-32 animate-pulse bg-[#007AFF] rounded-full flex items-center justify-center shadow-2xl">
        <span className="text-white font-black text-4xl">ME</span>
      </div>
      <h3 className="mt-8 text-2xl font-black tracking-tighter">Mohamed Edge</h3>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      <Header 
        onAdminTrigger={() => {}} 
        onLogout={() => setIsAdminMode(false)} 
        onThemeToggle={() => setIsDarkMode(!isDarkMode)} 
        isDarkMode={isDarkMode} 
      />

      <main className="max-w-7xl mx-auto px-4 pt-8">
        {activeSection === 'Home' && (
          <div className="space-y-12">
            <section className="relative w-full aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800">
              <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-12">
                <h2 className="text-5xl font-black text-white leading-tight">
                  {banner.title} <br/> <span className="text-[#007AFF]">{banner.highlight}</span>
                </h2>
              </div>
            </section>
            
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
              {products.map(p => (
                <ProductCard 
                  key={p.id} 
                  product={p} 
                  onPreview={(id) => window.location.hash = `#/preview/${id}`} 
                  onBuy={(id, cat) => { setOrderProductId(id); setOrderCategory(cat as Section); window.location.hash = '#/order'; }} 
                />
              ))}
            </section>
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <button 
              onClick={() => {
                const prev = selectedProduct.category === 'Home' ? '' : selectedProduct.category.toLowerCase();
                window.location.hash = `#/${prev}`;
              }}
              className="mb-8 w-14 h-14 bg-white dark:bg-zinc-800 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all"
            >
              <i className="fa-solid fa-chevron-left text-xl"></i>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="glass-panel p-4 rounded-[3.5rem] border-8 border-white dark:border-zinc-800">
                <img src={selectedProduct.image} className="w-full h-auto rounded-[2.5rem]" />
              </div>
              <div className="space-y-8 py-8">
                <div>
                  <span className="text-xs font-black text-[#007AFF] uppercase tracking-widest">{selectedProduct.category}</span>
                  <h2 className="text-5xl font-black tracking-tighter mt-2">{selectedProduct.title}</h2>
                </div>
                <p className="text-4xl font-black text-zinc-900 dark:text-white">{selectedProduct.price} EGP</p>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed text-lg">{selectedProduct.description}</p>
                <button 
                  onClick={() => { setOrderProductId(selectedProduct.id); setOrderCategory(selectedProduct.category as Section); window.location.hash = '#/order'; }}
                  className="w-full py-6 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all"
                >
                  Get This Asset
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto space-y-10 animate-in slide-in-from-bottom-10">
            <div className="text-center">
              <h2 className="text-5xl font-black tracking-tighter">Secure Checkout</h2>
              <p className="text-zinc-500 mt-2">Finish your order to receive your digital content.</p>
            </div>

            <div className="flex justify-center">
              <button onClick={() => window.open('https://t.me/Mohamed_edge')} className="px-8 py-4 bg-[#24A1DE] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                <i className="fa-brands fa-telegram text-xl"></i>
                Direct Contact @Mohamed_edge
              </button>
            </div>

            <div className="glass-panel p-10 rounded-[3.5rem] space-y-10 border-white dark:border-zinc-800 shadow-2xl">
              <div className="space-y-4">
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-2">1. Select Device</p>
                <div className="grid grid-cols-2 gap-4">
                  {['Realme', 'Oppo'].map(t => (
                    <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`p-6 rounded-3xl border-2 transition-all font-black uppercase text-xs tracking-widest ${orderPhoneType === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-2">2. Select Category</p>
                <div className="grid grid-cols-3 gap-3">
                  {['Themes', 'Widgets', 'Walls'].map(cat => (
                    <button key={cat} onClick={() => setOrderCategory(cat as any)} className={`py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${orderCategory === cat ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-2">3. Select Product</p>
                <select value={orderProductId} onChange={e => setOrderProductId(e.target.value)} className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all text-zinc-900 dark:text-white">
                  <option value="" disabled>Choose an item...</option>
                  {filteredOrderItems.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              {orderProduct && (
                <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-700 space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-6">
                    <img src={orderProduct.image} className="w-20 h-20 rounded-2xl object-cover" />
                    <div>
                      <h4 className="text-xl font-black">{orderProduct.title}</h4>
                      <p className="text-2xl font-black text-[#007AFF]">{orderProduct.price} EGP</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t dark:border-zinc-700 text-center">
                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Before clicking the buy button, transfer the amount to Vodafone Cash at <span className="text-zinc-900 dark:text-white font-black underline">01091931466</span>
                    </p>
                  </div>

                  <button onClick={handleOrderTelegram} className="w-full py-6 bg-[#24A1DE] text-white rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <i className="fa-brands fa-telegram text-2xl"></i>
                    Order via Telegram
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.filter(p => p.category === activeSection).map(p => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onPreview={(id) => window.location.hash = `#/preview/${id}`} 
                onBuy={(id, cat) => { setOrderProductId(id); setOrderCategory(cat as Section); window.location.hash = '#/order'; }} 
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav activeSection={activeSection} onSectionChange={(s) => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />
    </div>
  );
};

export default App;
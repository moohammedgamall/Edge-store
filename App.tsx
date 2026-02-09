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
  
  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [banner, setBanner] = useState<BannerSettings & { isVisible?: boolean }>(DEFAULT_BANNER);
  const [youtubeVideos, setYoutubeVideos] = useState<YoutubeVideo[]>([]);
  const [siteLogo, setSiteLogo] = useState<string>(localStorage.getItem('site_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // UI States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Admin Tool States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ is_premium: false });
  const [isPublishing, setIsPublishing] = useState(false);

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

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (prodData && prodData.length > 0) setProducts(prodData);
        else setProducts(MOCK_PRODUCTS);

        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
          const pass = settingsData.find(s => s.key === 'admin_password');
          if (pass) setAdminPassword(pass.value);
          const logo = settingsData.find(s => s.key === 'site_logo');
          if (logo) setSiteLogo(logo.value);
        }

        const { data: bannerData } = await supabase.from('banner').select('*').eq('id', 1).maybeSingle();
        if (bannerData) setBanner({ ...bannerData, isVisible: true });

        const { data: videosData } = await supabase.from('youtube_videos').select('*').order('created_at', { ascending: false });
        if (videosData) setYoutubeVideos(videosData);

      } catch (e) {
        setProducts(MOCK_PRODUCTS);
      } finally {
        setTimeout(() => setIsLoading(false), 1500);
      }
    };
    fetchData();
  }, []);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);
  const filteredOrderItems = useMemo(() => products.filter(p => p.category === orderCategory), [products, orderCategory]);

  const showNotification = (message: string) => {
    setNotification({ message, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdminAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotification("Welcome Back, Master");
    } else {
      setPasswordInput('');
      showNotification("Invalid Security Key");
    }
  };

  const handleOrderTelegram = () => {
    if (!orderProduct) return;
    const msg = `New Order Request:%0A- Device: ${orderPhoneType}%0A- Category: ${orderCategory}%0A- Asset: ${orderProduct.title}%0A- Price: ${orderProduct.price} EGP`;
    window.open(`https://t.me/Mohamed_edge?text=${msg}`);
  };

  const handleSaveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return;
    setIsPublishing(true);
    const productToSave = { 
      id: editProduct.id || Date.now().toString(),
      title: editProduct.title,
      description: editProduct.description || '',
      category: editProduct.category || 'Themes',
      price: editProduct.price || 0,
      image: editProduct.image,
      rating: 5.0, 
      downloads: '0',
      is_premium: editProduct.is_premium || false,
      compatibility: editProduct.compatibility || 'ColorOS 15'
    };
    try {
      await supabase.from('products').upsert(productToSave);
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
      setIsEditing(false);
      showNotification("Asset Synced to Cloud!");
    } catch (err) { console.error(err); }
    finally { setIsPublishing(false); }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="w-32 h-32 animate-pulse bg-[#007AFF] rounded-full flex items-center justify-center shadow-2xl">
        <span className="text-white font-black text-4xl">ME</span>
      </div>
      <h3 className="mt-8 text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">Mohamed Edge</h3>
      <div className="w-12 h-1 bg-[#007AFF] rounded-full mt-4 animate-bounce"></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header 
        onAdminTrigger={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} 
        onThemeToggle={() => setIsDarkMode(!isDarkMode)} 
        isDarkMode={isDarkMode} 
        logoUrl={siteLogo}
      />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[3rem] space-y-6 shadow-2xl border-white dark:border-zinc-800">
              <div className="text-center">
                <h3 className="text-xl font-black">Admin Access</h3>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">Key Required</p>
              </div>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-3xl font-black tracking-[0.5em] outline-none" placeholder="••••" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-xs font-black text-zinc-400 uppercase">Exit</button>
                <button onClick={handleAdminAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase shadow-lg">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 pb-32">
            <section className="relative w-full aspect-[4/5] sm:aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-[5px] border-white dark:border-zinc-800 group">
              <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-16">
                <h2 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                  {banner.title} <br/> <span className="text-[#007AFF]">{banner.highlight}</span>
                </h2>
                <button onClick={() => window.location.hash = '#/themes'} className="mt-8 px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase tracking-widest self-start shadow-xl active:scale-95 transition-all">Explore Collections</button>
              </div>
            </section>
            
            <section className="space-y-8">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 px-2">
                <div className="w-2 h-8 bg-[#007AFF] rounded-full"></div> Latest Releases
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-8">
                {products.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => window.location.hash = `#/preview/${id}`} 
                    onBuy={(id, cat) => { setOrderProductId(id); setOrderCategory(cat as Section); window.location.hash = '#/order'; }} 
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-5xl mx-auto pb-32 animate-in fade-in zoom-in-95 duration-500">
            <button 
              onClick={() => {
                const prev = selectedProduct.category === 'Home' ? '' : selectedProduct.category.toLowerCase();
                window.location.hash = `#/${prev}`;
              }}
              className="mb-8 w-14 h-14 bg-white dark:bg-zinc-800 rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-all text-zinc-900 dark:text-zinc-100"
            >
              <i className="fa-solid fa-chevron-left text-xl"></i>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 glass-panel p-4 rounded-[3.5rem] border-8 border-white dark:border-zinc-800 shadow-2xl">
                <img src={selectedProduct.image} className="w-full h-auto rounded-[2.5rem] object-contain" />
              </div>
              <div className="lg:col-span-5 space-y-8 py-8">
                <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-white dark:border-zinc-800 shadow-2xl">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#007AFF] tracking-widest">{selectedProduct.category}</span>
                    <h2 className="text-4xl font-black tracking-tighter mt-1">{selectedProduct.title}</h2>
                  </div>
                  <p className="text-5xl font-black text-zinc-900 dark:text-zinc-100">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{selectedProduct.description}</p>
                  <button onClick={() => { setOrderProductId(selectedProduct.id); setOrderCategory(selectedProduct.category as Section); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-xl shadow-xl active:scale-95 transition-all">Get Full Access</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto space-y-10 pb-32 animate-in slide-in-from-bottom-10">
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black tracking-tighter">Secure Checkout</h2>
              <p className="text-zinc-500 font-medium">Generate your order details and contact support.</p>
            </div>

            <div className="flex justify-center">
              <button onClick={() => window.open('https://t.me/Mohamed_edge')} className="px-8 py-4 bg-[#24A1DE] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                <i className="fa-brands fa-telegram text-xl"></i> Direct Contact @Mohamed_edge
              </button>
            </div>

            <div className="glass-panel p-10 rounded-[3.5rem] space-y-10 border-white dark:border-zinc-800 shadow-2xl">
              <div className="space-y-4">
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-2">1. Select Device</p>
                <div className="grid grid-cols-2 gap-4">
                  {['Realme', 'Oppo'].map(t => (
                    <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`p-6 rounded-3xl border-2 transition-all font-black uppercase text-xs tracking-widest ${orderPhoneType === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-lg' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-2">2. Select Category</p>
                <div className="grid grid-cols-3 gap-3">
                  {['Themes', 'Widgets', 'Walls'].map(cat => (
                    <button key={cat} onClick={() => setOrderCategory(cat as any)} className={`py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${orderCategory === cat ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md' : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black uppercase text-zinc-400 tracking-widest ml-2">3. Select Asset</p>
                <select value={orderProductId} onChange={e => setOrderProductId(e.target.value)} className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all text-zinc-900 dark:text-white">
                  <option value="" disabled>Choose an item...</option>
                  {filteredOrderItems.map(p => <option key={p.id} value={p.id}>{p.title} - {p.price} EGP</option>)}
                </select>
              </div>

              {orderProduct && (
                <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-700 space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-6">
                    <img src={orderProduct.image} className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-[#007AFF] tracking-widest">Summary</p>
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
                    <i className="fa-brands fa-telegram text-2xl"></i> Order via Telegram
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="space-y-12 pb-32">
            <h2 className="text-4xl font-black tracking-tighter px-2">{activeSection}</h2>
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
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10 pb-32 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black tracking-tighter">Cloud Master</h2>
              <button onClick={() => { setEditProduct({ is_premium: false }); setIsEditing(true); }} className="px-6 py-3 bg-[#007AFF] text-white rounded-2xl font-black text-xs uppercase shadow-xl">New Asset</button>
            </div>

            {isEditing && (
              <div className="glass-panel p-10 rounded-[3rem] space-y-6 border-white dark:border-zinc-800 shadow-2xl relative animate-in slide-in-from-top-6">
                <div className="flex justify-between items-center"><h3 className="text-2xl font-black">Asset Editor</h3><button onClick={() => setIsEditing(false)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-900 dark:text-zinc-100"><i className="fa-solid fa-xmark"></i></button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <input placeholder="Asset Name" className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none text-zinc-900 dark:text-white" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                   <input placeholder="Price (EGP)" type="number" className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none text-zinc-900 dark:text-white" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <select className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none appearance-none text-zinc-900 dark:text-white" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                     <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                   </select>
                   <input placeholder="Image URL" className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none text-zinc-900 dark:text-white" value={editProduct.image || ''} onChange={e => setEditProduct({...editProduct, image: e.target.value})} />
                </div>
                <textarea placeholder="Description" className="w-full p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium h-40 outline-none resize-none text-zinc-900 dark:text-white" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                <button onClick={handleSaveProduct} disabled={isPublishing} className="w-full py-6 bg-[#007AFF] text-white rounded-[1.5rem] font-black text-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">{isPublishing ? "Publishing..." : "Sync Asset to Cloud"}</button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {products.map(p => (
                <div key={p.id} className="p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] flex justify-between items-center shadow-sm border border-transparent dark:border-zinc-800">
                  <div className="flex items-center gap-6">
                    <img src={p.image} className="w-20 h-20 rounded-[1.5rem] object-cover shadow-lg" />
                    <div>
                      <p className="font-black text-xl">{p.title}</p>
                      <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{p.category} • {p.price} EGP</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => {setEditProduct(p); setIsEditing(true);}} className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center hover:bg-[#007AFF] hover:text-white transition-all"><i className="fa-solid fa-pen"></i></button>
                    <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('products').delete().eq('id', p.id); setProducts(ps => ps.filter(x => x.id !== p.id)); showNotification("Deleted"); } }} className="w-12 h-12 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-8">
           <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-10 py-5 rounded-full font-black text-[10px] shadow-2xl flex items-center gap-4 uppercase tracking-[0.2em] border border-white/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              {notification.message}
           </div>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && (
        <BottomNav activeSection={activeSection} onSectionChange={(s) => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />
      )}
    </div>
  );
};

export default App;
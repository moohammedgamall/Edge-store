
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings, YoutubeVideo } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// Supabase Configuration
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
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [banner, setBanner] = useState<BannerSettings>(DEFAULT_BANNER);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // UI States
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ is_premium: false });

  // Sync Theme
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sync Routing (Hash-based)
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

  // Fetch Database Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Products
        const { data: prodData, error: prodError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!prodError && prodData && prodData.length > 0) {
          setProducts(prodData);
        }

        // 2. Fetch Global Settings
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
          const pass = settingsData.find(s => s.key === 'admin_password');
          if (pass) setAdminPassword(pass.value);
          const logo = settingsData.find(s => s.key === 'site_logo');
          if (logo) setSiteLogo(logo.value);
        }

        // 3. Fetch Banner
        const { data: bannerData } = await supabase.from('banner').select('*').eq('id', 1).maybeSingle();
        if (bannerData) {
          setBanner({
            title: bannerData.title || DEFAULT_BANNER.title,
            highlight: bannerData.highlight || DEFAULT_BANNER.highlight,
            description: DEFAULT_BANNER.description,
            imageUrl: bannerData.imageUrl || DEFAULT_BANNER.imageUrl,
            buttonText: DEFAULT_BANNER.buttonText
          });
        }

      } catch (e) {
        console.error("Database connection issue. Using local fallback.", e);
      } finally {
        setTimeout(() => setIsLoading(false), 500);
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
      showNotification("Welcome Back, Mohamed Edge");
    } else {
      setPasswordInput('');
      showNotification("Access Denied: Wrong Key");
    }
  };

  const handleOrderTelegram = () => {
    if (!orderProduct) return;
    const msg = `New Order Request:%0A- Asset: ${orderProduct.title}%0A- Device: ${orderPhoneType}%0A- Price: ${orderProduct.price} EGP`;
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
      is_premium: editProduct.is_premium || false,
      compatibility: editProduct.compatibility || 'ColorOS 15'
    };
    try {
      const { error } = await supabase.from('products').upsert(productToSave);
      if (error) throw error;
      
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setProducts(data);
      
      setIsEditing(false);
      showNotification("Asset Synced to Cloud Successfully");
    } catch (err) {
      console.error(err);
      showNotification("Error Syncing Asset");
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="w-20 h-20 animate-pulse bg-[#007AFF] rounded-full flex items-center justify-center shadow-2xl">
        <span className="text-white font-black text-xl">ME</span>
      </div>
      <h3 className="mt-5 text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">Mohamed Edge Store</h3>
      <div className="w-6 h-0.5 bg-[#007AFF] rounded-full mt-3 animate-bounce"></div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-xl">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-2xl border-white dark:border-zinc-800">
              <div className="text-center">
                <h3 className="text-lg font-black uppercase tracking-tight">Cloud Access</h3>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">Enter Master Key</p>
              </div>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} 
                className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black tracking-[0.3em] outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" 
                placeholder="••••" 
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cancel</button>
                <button onClick={handleAdminAuth} className="py-3 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Login</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 pb-44 animate-in fade-in duration-500">
            <section className="relative w-full aspect-[4/5] sm:aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-white dark:border-zinc-800">
              <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[4s] hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-14">
                <h2 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                  {banner.title} <br/> <span className="text-[#007AFF]">{banner.highlight}</span>
                </h2>
                <button onClick={() => window.location.hash = '#/themes'} className="mt-8 px-8 py-3.5 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] self-start shadow-xl active:scale-95 transition-all">Explore Assets</button>
              </div>
            </section>
            
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> New Additions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
          <div className="max-w-5xl mx-auto pb-44 animate-in fade-in zoom-in-95 duration-500">
            <button 
              onClick={() => window.history.back()}
              className="mb-8 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-all text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
            >
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 glass-panel p-3 rounded-[3rem] border-4 border-white dark:border-zinc-800 shadow-2xl">
                <img src={selectedProduct.image} className="w-full h-auto rounded-[2.2rem] object-contain" />
              </div>
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white dark:border-zinc-800 shadow-xl">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#007AFF] tracking-widest">{selectedProduct.category}</span>
                    <h2 className="text-3xl font-black tracking-tighter mt-1">{selectedProduct.title}</h2>
                  </div>
                  <p className="text-4xl font-black text-zinc-900 dark:text-zinc-100">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">{selectedProduct.description}</p>
                  <div className="pt-4 border-t dark:border-zinc-700">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Compatibility</p>
                    <div className="flex gap-2">
                       <span className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[10px] font-bold">{selectedProduct.compatibility}</span>
                    </div>
                  </div>
                  <button onClick={() => { setOrderProductId(selectedProduct.id); setOrderCategory(selectedProduct.category as Section); window.location.hash = '#/order'; }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Buy Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-xl mx-auto space-y-8 pb-44 animate-in slide-in-from-bottom-10">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black tracking-tighter">Fast Order</h2>
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Pay via Vodafone Cash</p>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] space-y-8 border-white dark:border-zinc-800 shadow-2xl">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] ml-2">1. Device Model</p>
                <div className="grid grid-cols-2 gap-3">
                  {['Realme', 'Oppo'].map(t => (
                    <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`py-4 rounded-2xl border-2 transition-all font-black uppercase text-[10px] tracking-widest ${orderPhoneType === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xl' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] ml-2">2. Digital Item</p>
                <select value={orderProductId} onChange={e => setOrderProductId(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-[#007AFF] transition-all text-sm text-zinc-900 dark:text-white appearance-none">
                  <option value="" disabled>Search your item...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.title} ({p.price} EGP)</option>)}
                </select>
              </div>

              {orderProduct && (
                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-[2rem] border border-zinc-100 dark:border-zinc-700 space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-5">
                    <img src={orderProduct.image} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                    <div>
                      <h4 className="text-lg font-black">{orderProduct.title}</h4>
                      <p className="text-xl font-black text-[#007AFF]">{orderProduct.price} EGP</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t dark:border-zinc-700">
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed text-center">
                      Send payment to Vodafone Cash: <br/> <span className="text-zinc-900 dark:text-white font-black text-lg tracking-tight select-all">01091931466</span>
                    </p>
                  </div>

                  <button onClick={handleOrderTelegram} className="w-full py-5 bg-[#24A1DE] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                    <i className="fa-brands fa-telegram text-xl"></i> Send Screenshot
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="space-y-10 pb-44">
            <h2 className="text-3xl font-black tracking-tighter px-2 uppercase">{activeSection}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.filter(p => p.category === activeSection).length > 0 ? (
                products.filter(p => p.category === activeSection).map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => window.location.hash = `#/preview/${id}`} 
                    onBuy={(id, cat) => { setOrderProductId(id); setOrderCategory(cat as Section); window.location.hash = '#/order'; }} 
                  />
                ))
              ) : (
                <div className="col-span-full py-20 text-center glass-panel rounded-[2rem]">
                  <p className="text-zinc-400 font-black tracking-[0.2em] uppercase text-[10px]">No items found in this section</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-4xl mx-auto space-y-10 pb-44 animate-in fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">Cloud Management</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Manage your digital inventory</p>
              </div>
              <button onClick={() => { setEditProduct({ is_premium: false }); setIsEditing(true); }} className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95">Add Asset</button>
            </div>

            {isEditing && (
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white dark:border-zinc-800 shadow-2xl relative animate-in slide-in-from-top-6">
                <div className="flex justify-between items-center"><h3 className="text-xl font-black uppercase">Editor</h3><button onClick={() => setIsEditing(false)} className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500"><i className="fa-solid fa-xmark"></i></button></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <input placeholder="Asset Title" className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none text-sm" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                   <input placeholder="Price (EGP)" type="number" className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none text-sm" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <select className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none appearance-none text-sm" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                     <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                   </select>
                   <input placeholder="Image URL" className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none text-sm" value={editProduct.image || ''} onChange={e => setEditProduct({...editProduct, image: e.target.value})} />
                </div>
                <textarea placeholder="Description" className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-medium h-32 outline-none resize-none text-sm" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                <button onClick={handleSaveProduct} disabled={isPublishing} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl disabled:opacity-50">{isPublishing ? "Syncing..." : "Publish to Store"}</button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {products.map(p => (
                <div key={p.id} className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] flex justify-between items-center shadow-sm border border-transparent dark:border-zinc-800">
                  <div className="flex items-center gap-5">
                    <img src={p.image} className="w-14 h-14 rounded-xl object-cover" />
                    <div>
                      <p className="font-black text-sm">{p.title}</p>
                      <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{p.category} • {p.price} EGP</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setEditProduct(p); setIsEditing(true);}} className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center"><i className="fa-solid fa-pen text-sm"></i></button>
                    <button onClick={async () => { if(confirm('Delete from Cloud?')) { await supabase.from('products').delete().eq('id', p.id); setProducts(ps => ps.filter(x => x.id !== p.id)); showNotification("Deleted"); } }} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl flex items-center justify-center"><i className="fa-solid fa-trash text-sm"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4">
           <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-8 py-4 rounded-full font-black text-[9px] shadow-2xl flex items-center gap-3 uppercase tracking-[0.2em]">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
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

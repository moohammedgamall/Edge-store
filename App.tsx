
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
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [banner, setBanner] = useState<BannerSettings>(DEFAULT_BANNER);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // Merged Products (Mock + DB)
  const products = useMemo(() => {
    const merged = [...dbProducts, ...MOCK_PRODUCTS];
    return Array.from(new Map(merged.map(item => [item.id, item])).values());
  }, [dbProducts]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ is_premium: false });

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (prodData && prodData.length > 0) setDbProducts(prodData);

        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
          const pass = settingsData.find(s => s.key === 'admin_password');
          if (pass) setAdminPassword(pass.value);
          const logo = settingsData.find(s => s.key === 'site_logo');
          if (logo) setSiteLogo(logo.value);
        }

        const { data: bannerData } = await supabase.from('banner').select('*').eq('id', 1).maybeSingle();
        if (bannerData) {
          setBanner(prev => ({ ...prev, title: bannerData.title, highlight: bannerData.highlight, imageUrl: bannerData.imageUrl }));
        }
      } catch (e) {
        console.error("DB Fetch Error", e);
      } finally {
        setTimeout(() => setIsLoading(false), 800);
      }
    };
    fetchData();
  }, []);

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);

  const showNotification = (message: string) => {
    setNotification({ message, type: 'success' });
    setTimeout(() => setNotification(null), 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification("Number Copied!");
  };

  const handleAdminAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotification("Welcome Mohamed Edge");
    } else {
      setPasswordInput('');
      showNotification("Incorrect Key");
    }
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
      await supabase.from('products').upsert(productToSave);
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setDbProducts(data);
      setIsEditing(false);
      showNotification("Cloud Synced!");
    } catch (err) { console.error(err); }
    finally { setIsPublishing(false); }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="w-20 h-20 animate-pulse bg-[#007AFF] rounded-full flex items-center justify-center shadow-2xl">
        <span className="text-white font-black text-xl">ME</span>
      </div>
      <h3 className="mt-5 text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">Edge Marketplace</h3>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
              <div className="text-center"><h3 className="text-lg font-black uppercase">Admin Login</h3></div>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-3 text-[10px] font-black text-zinc-400 uppercase">Exit</button>
                <button onClick={handleAdminAuth} className="py-3 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 pb-44 animate-in fade-in duration-500">
            <section className="relative w-full aspect-[4/5] sm:aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-white dark:border-zinc-800">
              <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[5s] hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-14">
                <h2 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                  {banner.title} <br/> <span className="text-[#007AFF]">{banner.highlight}</span>
                </h2>
                <button onClick={() => window.location.hash = '#/themes'} className="mt-8 px-8 py-3.5 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] self-start shadow-xl active:scale-95 transition-all">Explore Assets</button>
              </div>
            </section>
            
            <section className="space-y-8">
              <div className="flex justify-between items-end px-2">
                <h2 className="text-xl font-black tracking-tight flex items-center gap-3 uppercase">
                  <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> Featured Assets
                </h2>
              </div>
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

            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Latest Tutorials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-[2rem] overflow-hidden shadow-lg border-4 border-white dark:border-zinc-700">
                   <iframe className="w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
                <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-[2rem] overflow-hidden shadow-lg border-4 border-white dark:border-zinc-700">
                   <iframe className="w-full h-full" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
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
                  <button onClick={() => { setOrderProductId(selectedProduct.id); setOrderCategory(selectedProduct.category as Section); window.location.hash = '#/order'; }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Buy Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto space-y-10 pb-44 animate-in slide-in-from-bottom-10 duration-500">
            <div className="text-center space-y-3">
              <h2 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">Checkout</h2>
              <p className="text-zinc-500 dark:text-zinc-400 font-bold text-xs uppercase tracking-[0.3em]">Premium Digital Asset</p>
            </div>

            <div className="glass-panel p-10 rounded-[3rem] space-y-10 border-white dark:border-zinc-800 shadow-2xl relative overflow-hidden">
              {/* Device Selection */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-xs">1</div>
                  <p className="text-[11px] font-black uppercase text-zinc-500 tracking-widest">Select Your Device</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['Realme', 'Oppo'].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setOrderPhoneType(t as any)} 
                      className={`py-5 rounded-[1.5rem] border-2 transition-all font-black text-xs tracking-widest uppercase flex flex-col items-center gap-2 ${orderPhoneType === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xl scale-[1.02]' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200'}`}
                    >
                      <i className={`fa-solid ${t === 'Realme' ? 'fa-mobile-screen' : 'fa-mobile'} text-xl`}></i>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Selection */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-xs">2</div>
                  <p className="text-[11px] font-black uppercase text-zinc-500 tracking-widest">Select Item</p>
                </div>
                <div className="relative group">
                  <select 
                    value={orderProductId} 
                    onChange={e => setOrderProductId(e.target.value)} 
                    className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all text-sm text-zinc-900 dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Choose from store...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.title} — {p.price} EGP</option>)}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                    <i className="fa-solid fa-chevron-down"></i>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              {orderProduct && (
                <div className="p-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-700 space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-zinc-700">
                      <img src={orderProduct.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[9px] font-black uppercase text-[#007AFF] tracking-widest">{orderProduct.category}</span>
                      <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{orderProduct.title}</h4>
                      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{orderProduct.price} EGP</p>
                    </div>
                  </div>
                  
                  <div className="pt-8 border-t dark:border-zinc-700 space-y-6">
                    <div className="text-center space-y-4">
                      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Payment Method: Vodafone Cash</p>
                      <div 
                        onClick={() => copyToClipboard("01091931466")}
                        className="group relative inline-flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
                      >
                        <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter hover:text-[#007AFF] transition-colors">01091931466</span>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-zinc-900 dark:group-hover:text-white">
                          <i className="fa-solid fa-copy"></i> Click to copy number
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const msg = `Checkout Request:%0A- Asset: ${orderProduct.title}%0A- Device: ${orderPhoneType}%0A- Price: ${orderProduct.price} EGP%0A---%0AAttached below is the transaction screenshot.`;
                      window.open(`https://t.me/Mohamed_edge?text=${msg}`);
                    }} 
                    className="w-full py-6 bg-[#24A1DE] text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                  >
                    <i className="fa-brands fa-telegram text-2xl"></i> Send Screenshot to Edge
                  </button>
                </div>
              )}
              
              {!orderProduct && (
                <div className="py-20 text-center space-y-4 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2.5rem]">
                   <i className="fa-solid fa-cart-arrow-down text-4xl text-zinc-200"></i>
                   <p className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Please select an asset above to continue</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="space-y-10 pb-44">
            <h2 className="text-3xl font-black tracking-tighter px-2 uppercase">{activeSection}</h2>
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
          <div className="max-w-4xl mx-auto space-y-10 pb-44 animate-in fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-6 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
              <h2 className="text-2xl font-black uppercase">Inventory</h2>
              <button onClick={() => { setEditProduct({ is_premium: false }); setIsEditing(true); }} className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase shadow-xl">Add Asset</button>
            </div>

            {isEditing && (
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-white dark:border-zinc-800 shadow-2xl relative animate-in slide-in-from-top-6">
                <input placeholder="Title" className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                <input placeholder="Image URL" className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold" value={editProduct.image || ''} onChange={e => setEditProduct({...editProduct, image: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Price" type="number" className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                  <select className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                    <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                  </select>
                </div>
                <button onClick={handleSaveProduct} disabled={isPublishing} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase tracking-widest">{isPublishing ? "Syncing..." : "Publish Now"}</button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {dbProducts.map(p => (
                <div key={p.id} className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] flex justify-between items-center shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-5">
                    <img src={p.image} className="w-12 h-12 rounded-xl object-cover" />
                    <div><p className="font-black text-sm">{p.title}</p><p className="text-[9px] font-black uppercase text-zinc-400">{p.category}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setEditProduct(p); setIsEditing(true);}} className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg flex items-center justify-center"><i className="fa-solid fa-pen text-xs"></i></button>
                    <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('products').delete().eq('id', p.id); setDbProducts(ps => ps.filter(x => x.id !== p.id)); } }} className="w-9 h-9 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center"><i className="fa-solid fa-trash text-xs"></i></button>
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

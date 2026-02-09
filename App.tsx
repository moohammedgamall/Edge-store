
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { MOCK_PRODUCTS, MOCK_VIDEOS } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

// Supabase Configuration
const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const App: React.FC = () => {
  // Global App State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Database Driven Data
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // Merged Data Logic
  const products = useMemo(() => dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS, [dbProducts]);
  const videos = useMemo(() => dbVideos.length > 0 ? dbVideos : MOCK_VIDEOS, [dbVideos]);

  // Modals & UI Controls
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  
  // Admin Contexts
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '' });
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  // Notifications Utility
  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Dark Mode Synchronization
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Initial Data Fetching
  const refreshData = async () => {
    try {
      const [prodRes, vidRes, setRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*')
      ]);

      if (prodRes.data) setDbProducts(prodRes.data);
      if (vidRes.data) setDbVideos(vidRes.data);
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loading_logo') setLoadingLogo(s.value);
        });
      }
    } catch (err) {
      console.error("Database Connection Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Routing Logic
  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        setSelectedProductId(hash.replace('#/preview/', ''));
        setActiveSection('Preview');
      } else if (hash === '#/order') setActiveSection('Order');
      else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as any);
      } else if (hash === '#/admin' && isAdminMode) setActiveSection('Admin');
      else setActiveSection('Home');
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode]);

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = e => reject(e);
  });

  const handleAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Authorized Access");
    } else {
      showNotify("Wrong Password", "error");
    }
  };

  const syncMocksToCloud = async () => {
    if (!window.confirm("Upload default items to cloud?")) return;
    setIsPublishing(true);
    try {
      const formattedMocks = MOCK_PRODUCTS.map(p => ({
        id: p.id + "_" + Date.now(),
        title: p.title,
        description: p.description,
        category: p.category,
        price: p.price,
        image: p.image,
        is_premium: p.is_premium,
        compatibility: p.compatibility
      }));
      await supabase.from('products').upsert(formattedMocks);
      await refreshData();
      showNotify("Sync Completed");
    } catch (err) { showNotify("Sync Error", "error"); }
    finally { setIsPublishing(false); }
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Incomplete data", "error");
    setIsPublishing(true);
    try {
      await supabase.from('products').upsert({
        id: editProduct.id || Date.now().toString(),
        title: editProduct.title,
        description: editProduct.description || '',
        category: editProduct.category || 'Themes',
        price: editProduct.price || 0,
        image: editProduct.image,
        is_premium: (editProduct.price || 0) > 0,
        compatibility: 'Realme UI / ColorOS'
      });
      await refreshData();
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' });
      showNotify("Product Saved");
    } catch (err) { showNotify("Action Failed", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Remove this product?")) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setDbProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Deleted Successfully");
    } catch (err) { showNotify("Could not delete mock item", "error"); }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("Incomplete info", "error");
    setIsPublishing(true);
    try {
      const url = new URL(editVideo.url);
      const vidId = url.searchParams.get('v') || url.pathname.split('/').pop();
      if (!vidId) throw new Error();
      await supabase.from('videos').upsert({ id: vidId, title: editVideo.title, url: editVideo.url });
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("Tutorial Added");
    } catch (e) { showNotify("Invalid YouTube Link", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteVideo = async (id: string) => {
    if (!window.confirm("Delete tutorial?")) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
      setDbVideos(prev => prev.filter(v => v.id !== id));
      showNotify("Deleted");
    } catch (err) { showNotify("Error", "error"); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      if (key === 'admin_password') setAdminPassword(value);
      if (key === 'site_logo') setSiteLogo(value);
      if (key === 'loading_logo') setLoadingLogo(value);
      showNotify("Setting Synchronized");
    } catch (err) { showNotify("Sync Failed", "error"); }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-xl">
          <img src={loadingLogo} className="w-full h-full object-cover" />
        </div>
        <div className="absolute -inset-3 border-2 border-dashed border-[#007AFF] rounded-full animate-[spin_10s_linear_infinite]"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32">
      <Header 
        isAdmin={isAdminMode} 
        onAdminTrigger={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} 
        onThemeToggle={() => setIsDarkMode(!isDarkMode)} 
        isDarkMode={isDarkMode} 
        logoUrl={siteLogo}
      />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 animate-in zoom-in duration-300">
              <h3 className="text-center font-black uppercase text-sm tracking-widest">Admin Authentication</h3>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" />
              <button onClick={handleAuth} className="w-full py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-xs">Verify</button>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight uppercase px-1 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> Latest Releases
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(p => <ProductCard key={p.id} product={p} onPreview={(id) => window.location.hash = `#/preview/${id}`} onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
           <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <button onClick={() => window.history.back()} className="mb-8 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center"><i className="fa-solid fa-arrow-left"></i></button>
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-7 glass-panel p-2 rounded-[2.5rem] overflow-hidden shadow-2xl"><img src={selectedProduct.image} className="w-full rounded-[2rem]" /></div>
               <div className="lg:col-span-5 glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <h2 className="text-3xl font-black tracking-tight">{selectedProduct.title}</h2>
                 <p className="text-4xl font-black text-[#007AFF]">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                 <p className="text-zinc-500 font-medium leading-relaxed">{selectedProduct.description}</p>
                 <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Acquire Now</button>
               </div>
             </div>
           </div>
        )}

        {activeSection === 'Order' && (
           <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-12">
             <div className="glass-panel p-8 rounded-[3rem] space-y-8 shadow-2xl">
                <h2 className="text-4xl font-black tracking-tight text-center">Checkout</h2>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400 ml-2">Select Device</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Realme', 'Oppo'].map(t => <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`py-4 rounded-2xl border-2 font-black transition-all ${orderPhoneType === t ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'border-zinc-100 dark:border-zinc-800'}`}>{t}</button>)}
                  </div>
                </div>
                {orderProduct && (
                  <div className="p-6 bg-[#007AFF]/5 rounded-[2rem] space-y-6 text-center border-2 border-dashed border-[#007AFF]/20">
                    <h4 className="font-black text-xl">{orderProduct.title}</h4>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vodafone Cash Number</p>
                    <h3 onClick={() => { navigator.clipboard.writeText("01091931466"); showNotify("Copied"); }} className="text-3xl font-black tracking-tight cursor-pointer hover:text-[#007AFF]">01091931466</h3>
                    <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=Purchase: ${orderProduct.title}`)} className="w-full py-5 bg-[#24A1DE] text-white rounded-2xl font-black flex items-center justify-center gap-3"><i className="fa-brands fa-telegram text-xl"></i> Telegram Support</button>
                  </div>
                )}
             </div>
           </div>
        )}

        {/* SECTION: ADMIN PANEL */}
        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
            {/* Responsive Admin Tab Navigation */}
            <div className="w-full max-w-md mx-auto">
              <div className="flex p-1.5 bg-zinc-200/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[1.8rem] shadow-inner border border-white/40 dark:border-white/5">
                {[
                  { id: 'Inventory', icon: 'fa-box-open', label: 'Vault' },
                  { id: 'Videos', icon: 'fa-play-circle', label: 'Learn' },
                  { id: 'Settings', icon: 'fa-gears', label: 'Core' }
                ].map(tab => {
                  const isActive = adminTab === tab.id;
                  return (
                    <button 
                      key={tab.id} 
                      onClick={() => setAdminTab(tab.id as any)} 
                      className={`flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-[1.4rem] transition-all duration-300 relative ${isActive ? 'bg-white dark:bg-zinc-800 shadow-lg scale-[1.02]' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      <i className={`fa-solid ${tab.icon} text-sm mb-1 ${isActive ? 'text-[#007AFF]' : 'text-zinc-400'}`}></i>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${isActive ? 'text-[#007AFF]' : 'text-zinc-400'}`}>
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content for Inventory */}
            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <div className="glass-panel p-6 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Cloud Inventory</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{dbProducts.length} Items Managed</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={syncMocksToCloud} className="flex-1 sm:flex-none px-5 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black uppercase text-[9px] hover:bg-zinc-200 transition-colors">Import Local</button>
                    <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' }); setIsEditingProduct(true); }} className="flex-1 sm:flex-none px-8 py-3.5 bg-[#007AFF] text-white rounded-xl font-black uppercase text-[9px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all">Create New</button>
                  </div>
                </div>

                {isEditingProduct && (
                  <div id="product-form" className="glass-panel p-6 sm:p-10 rounded-[3rem] space-y-8 border-2 border-[#007AFF]/30 animate-in zoom-in duration-300 shadow-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Name</label>
                        <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Theme Name..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Cover Asset</label>
                        <label className="block w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black text-center cursor-pointer text-[9px] border-2 border-dashed border-zinc-300 hover:border-[#007AFF]">
                          {editProduct.image ? 'Change Image' : 'Click to Upload'}
                          <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}) }} className="hidden" />
                        </label>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Classification</label>
                        <select className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Price (EGP)</label>
                        <input type="number" className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <textarea className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-medium text-sm h-32 outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="Full description..." value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    <div className="flex gap-4">
                       <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-xl">Discard</button>
                       <button onClick={saveProduct} className="flex-[2] py-4 bg-[#007AFF] text-white font-black text-[10px] uppercase rounded-xl shadow-lg active:scale-95 transition-all">
                        {isPublishing ? "Syncing..." : "Publish to Cloud"}
                       </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {(dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS).map(p => (
                    <div key={p.id} className="p-4 glass-panel rounded-[2rem] flex items-center justify-between gap-4 group hover:border-[#007AFF]/30 transition-all">
                      <div className="flex items-center gap-4 flex-1">
                        <img src={p.image} className="w-16 h-16 rounded-xl object-cover border-2 border-white dark:border-zinc-800 shadow-sm" />
                        <div className="min-w-0">
                          <h4 className="font-black text-sm tracking-tight truncate">{p.title}</h4>
                          <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{p.category} • {p.price} EGP</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-[#007AFF] rounded-full flex items-center justify-center active:scale-90"><i className="fa-solid fa-pen text-xs"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center active:scale-90"><i className="fa-solid fa-trash text-xs"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: VIDEOS */}
            {adminTab === 'Videos' && (
              <div className="space-y-6">
                <button onClick={() => setIsEditingVideo(true)} className="w-full py-5 bg-red-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95">Add New Tutorial</button>
                {isEditingVideo && (
                  <div className="glass-panel p-6 rounded-[2.5rem] space-y-4 animate-in zoom-in border-2 border-red-500/20">
                    <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none" placeholder="Title" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} />
                    <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none" placeholder="YouTube URL" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} />
                    <button onClick={saveVideo} className="w-full py-4 bg-red-500 text-white rounded-xl font-black uppercase text-[10px]">Save Video</button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-3 glass-panel rounded-2xl flex items-center justify-between">
                       <span className="font-bold text-xs truncate ml-2">{v.title}</span>
                       <button onClick={() => deleteVideo(v.id)} className="w-8 h-8 text-red-500"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {adminTab === 'Settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <div className="glass-panel p-8 rounded-[3rem] space-y-8 shadow-2xl border border-white/40 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div>
                    <h3 className="font-black text-xl tracking-tight">Identity Hub</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block space-y-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Site Header Logo</span>
                      <div className="relative group">
                         <input type="file" className="hidden" id="site-logo-up" onChange={async e => { if(e.target.files?.[0]) { const b = await fileToBase64(e.target.files[0]); await updateSetting('site_logo', b); } }} />
                         <label htmlFor="site-logo-up" className="w-full flex items-center gap-4 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                           <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 bg-white">
                              <img src={siteLogo} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1">
                             <p className="text-[10px] font-black uppercase">Replace Site Icon</p>
                             <p className="text-[8px] text-zinc-400">Visible in navigation bar</p>
                           </div>
                           <i className="fa-solid fa-cloud-arrow-up text-zinc-300"></i>
                         </label>
                      </div>
                    </label>

                    <label className="block space-y-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Splash Preloader Asset</span>
                      <div className="relative group">
                         <input type="file" className="hidden" id="loading-logo-up" onChange={async e => { if(e.target.files?.[0]) { const b = await fileToBase64(e.target.files[0]); await updateSetting('loading_logo', b); } }} />
                         <label htmlFor="loading-logo-up" className="w-full flex items-center gap-4 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                           <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 bg-white">
                              <img src={loadingLogo} className="w-full h-full object-cover" />
                           </div>
                           <div className="flex-1">
                             <p className="text-[10px] font-black uppercase">Replace Loading Logo</p>
                             <p className="text-[8px] text-zinc-400">Visible during app startup</p>
                           </div>
                           <i className="fa-solid fa-bolt-lightning text-zinc-300"></i>
                         </label>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="glass-panel p-8 rounded-[3rem] space-y-8 shadow-2xl border border-white/40 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                    <h3 className="font-black text-xl tracking-tight">Access Control</h3>
                  </div>
                  <div className="space-y-4">
                    <label className="block space-y-3">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Admin Master Key</span>
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="Update Admin Key" 
                          className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-lg outline-none border-2 border-transparent focus:border-red-500 transition-all" 
                          onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} 
                        />
                        <i className="fa-solid fa-key absolute right-5 top-1/2 -translate-y-1/2 text-zinc-300"></i>
                      </div>
                      <p className="text-[8px] text-zinc-400 font-bold px-2 italic">Key is updated immediately upon focus loss.</p>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl animate-in fade-in slide-in-from-top-8 flex items-center gap-3 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-500 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-lg`}></i>
          {notification.message}
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && (
        <BottomNav activeSection={activeSection} onSectionChange={(s) => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />
      )}
    </div>
  );
};

export default App;

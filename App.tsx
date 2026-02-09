
import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { MOCK_PRODUCTS, MOCK_VIDEOS } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const App: React.FC = () => {
  // UI State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Database Data State
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // Combined State (Priority to DB, Fallback to Mocks if DB is empty)
  const products = useMemo(() => dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS, [dbProducts]);
  const videos = useMemo(() => dbVideos.length > 0 ? dbVideos : MOCK_VIDEOS, [dbVideos]);

  // Modals & Forms State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  
  // Admin Editing State
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '' });
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  // Notifications
  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Dark Mode Toggle
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Initial Data Fetch
  useEffect(() => {
    const initFetch = async () => {
      try {
        const [pRes, vRes, sRes] = await Promise.all([
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('videos').select('*').order('created_at', { ascending: false }),
          supabase.from('settings').select('*')
        ]);

        if (pRes.data) setDbProducts(pRes.data);
        if (vRes.data) setDbVideos(vRes.data);
        if (sRes.data) {
          sRes.data.forEach(s => {
            if (s.key === 'admin_password') setAdminPassword(s.value);
            if (s.key === 'site_logo') setSiteLogo(s.value);
            if (s.key === 'loading_logo') setLoadingLogo(s.value);
          });
        }
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setTimeout(() => setIsLoading(false), 800);
      }
    };
    initFetch();
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

  // Helper: Image to Base64
  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => res(reader.result as string);
    reader.onerror = e => rej(e);
  });

  // Actions: Admin Auth
  const handleAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Authorized Successfully");
    } else {
      showNotify("Incorrect Key", "error");
    }
  };

  // Actions: Product Management
  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Fill required fields", "error");
    setIsPublishing(true);
    const payload = {
      id: editProduct.id || Date.now().toString(),
      title: editProduct.title,
      description: editProduct.description || '',
      category: editProduct.category || 'Themes',
      price: editProduct.price || 0,
      image: editProduct.image,
      is_premium: (editProduct.price || 0) > 0,
      compatibility: 'Realme UI / ColorOS'
    };
    try {
      await supabase.from('products').upsert(payload);
      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (data) setDbProducts(data);
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' });
      showNotify("Product Published!");
    } catch (err) { showNotify("Failed to save", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Delete this product permanently?")) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setDbProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Product Deleted");
    } catch (err) { showNotify("Delete failed", "error"); }
  };

  // Actions: Video Management
  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("Missing info", "error");
    setIsPublishing(true);
    try {
      const url = new URL(editVideo.url);
      const vidId = url.searchParams.get('v') || url.pathname.split('/').pop();
      if (!vidId) throw new Error();
      
      const payload = { id: vidId, title: editVideo.title, url: editVideo.url };
      await supabase.from('videos').upsert(payload);
      const { data } = await supabase.from('videos').select('*');
      if (data) setDbVideos(data);
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("Tutorial Saved");
    } catch (e) { showNotify("Invalid YouTube Link", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteVideo = async (id: string) => {
    if (!window.confirm("Remove tutorial?")) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
      setDbVideos(prev => prev.filter(v => v.id !== id));
      showNotify("Tutorial Removed");
    } catch (err) { showNotify("Delete failed", "error"); }
  };

  // Actions: Site Settings
  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      showNotify("Settings Updated");
    } catch (err) { showNotify("Failed to update", "error"); }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] animate-pulse">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800">
          <img src={loadingLogo} className="w-full h-full object-cover" />
        </div>
        <div className="absolute -inset-2 rounded-full border-2 border-dashed border-[#007AFF] animate-[spin_10s_linear_infinite]"></div>
      </div>
      <h3 className="mt-8 text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">MOHAMED EDGE</h3>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[2.5rem] space-y-6 animate-in zoom-in duration-300">
              <h3 className="text-center text-lg font-black uppercase tracking-widest text-[#007AFF]">Admin Access</h3>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" placeholder="••••" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-3 text-[10px] font-black text-zinc-400 uppercase">Cancel</button>
                <button onClick={handleAuth} className="py-3 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-500/30">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> New Arrivals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} onPreview={(id) => window.location.hash = `#/preview/${id}`} onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} />
                ))}
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Master Tutorials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {videos.map(v => (
                  <div key={v.id} onClick={() => window.open(v.url, '_blank')} className="group relative aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white dark:border-zinc-800 cursor-pointer transition-all active:scale-95">
                    <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30">
                          <i className="fa-solid fa-play text-2xl ml-1"></i>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            <button onClick={() => window.history.back()} className="mb-8 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 border border-zinc-200 dark:border-zinc-700">
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 glass-panel p-3 rounded-[3rem] border-4 border-white dark:border-zinc-800 shadow-2xl">
                <img src={selectedProduct.image} className="w-full rounded-[2.2rem] shadow-sm" />
              </div>
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-xl sticky top-28">
                  <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-[0.2em]">{selectedProduct.category}</span>
                  <h2 className="text-3xl font-black tracking-tighter leading-tight">{selectedProduct.title}</h2>
                  <div className="flex items-center gap-4">
                    <p className="text-4xl font-black text-[#007AFF]">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                    {selectedProduct.price > 0 && <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">One-time payment</span>}
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">{selectedProduct.description}</p>
                  <div className="pt-6 border-t dark:border-zinc-800 space-y-4">
                    <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95">Instant Access</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-10 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black tracking-tighter">Order Placement</h2>
              <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Digital Asset Acquisition</p>
            </div>
            <div className="glass-panel p-8 rounded-[3rem] space-y-8 shadow-2xl border-2 border-white dark:border-zinc-800">
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">1. Your Device</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Realme', 'Oppo'].map(t => (
                      <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${orderPhoneType === t ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-lg shadow-blue-500/20' : 'border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}>{t}</button>
                    ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">2. Selection</p>
                  <select value={orderProductId} onChange={e => setOrderProductId(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-[#007AFF] appearance-none cursor-pointer">
                    <option value="">Choose your asset...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.title} - {p.price} EGP</option>)}
                  </select>
               </div>
               {orderProduct && (
                 <div className="p-8 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-[2.5rem] space-y-8 text-center border-2 border-dashed border-[#007AFF]/30 animate-in zoom-in duration-300">
                    <div className="flex items-center gap-6 justify-center">
                      <img src={orderProduct.image} className="w-24 h-24 rounded-2xl object-cover shadow-2xl" />
                      <div className="text-left">
                        <h4 className="font-black text-lg">{orderProduct.title}</h4>
                        <p className="text-2xl font-black text-[#007AFF]">{orderProduct.price} EGP</p>
                      </div>
                    </div>
                    <div className="pt-6 border-t-2 border-zinc-200 dark:border-zinc-800">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Payment: Vodafone Cash</p>
                       <div onClick={() => { navigator.clipboard.writeText("01091931466"); showNotify("Number Copied"); }} className="cursor-pointer group">
                         <h3 className="text-4xl font-black tracking-tighter group-hover:text-[#007AFF] transition-colors">01091931466</h3>
                         <span className="text-[9px] font-black text-[#007AFF] uppercase tracking-tighter bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">Tap to Copy Number</span>
                       </div>
                    </div>
                    <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=I want to buy: ${orderProduct.title}%0ADevice: ${orderPhoneType}`)} className="w-full py-5 bg-[#24A1DE] text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-sky-500/20 transition-all hover:bg-[#1E88BE] active:scale-95"><i className="fa-brands fa-telegram text-xl"></i> Confirm via Telegram</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {['Themes', 'Widgets', 'Walls'].includes(activeSection) && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <h2 className="text-4xl font-black uppercase tracking-tighter">{activeSection}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.filter(p => p.category === activeSection).map(p => (
                <ProductCard key={p.id} product={p} onPreview={(id) => window.location.hash = `#/preview/${id}`} onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} />
              ))}
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-right-10 duration-500">
            <div className="flex gap-4 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-[2rem] w-max mx-auto shadow-inner">
              {(['Inventory', 'Videos', 'Settings'] as const).map(tab => (
                <button key={tab} onClick={() => setAdminTab(tab)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === tab ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-lg scale-105' : 'text-zinc-400'}`}>{tab}</button>
              ))}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white dark:bg-zinc-800/50 p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Product Catalog</h3>
                  <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' }); setIsEditingProduct(true); }} className="px-8 py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-500/30">Add New Asset</button>
                </div>

                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-2 border-[#007AFF]/30 animate-in zoom-in duration-300 shadow-2xl">
                    <div className="flex justify-between items-center">
                       <h4 className="text-xl font-black uppercase text-[#007AFF] tracking-widest">{editProduct.id ? 'Edit Entry' : 'New Entry'}</h4>
                       <button onClick={() => setIsEditingProduct(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Display Title</label>
                        <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="e.g. Minimal Glass Theme" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Visual Content</label>
                        <div className="flex gap-4 items-center">
                          <label className="flex-1 p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold text-center cursor-pointer text-xs border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#007AFF] transition-all">Upload File<input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await toBase64(e.target.files[0])}) }} className="hidden" /></label>
                          {editProduct.image && <img src={editProduct.image} className="w-16 h-16 rounded-2xl object-cover shadow-xl border-2 border-white dark:border-zinc-700" />}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Asset Type</label>
                        <select className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Pricing (EGP)</label>
                        <input type="number" className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Description</label>
                      <textarea className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium h-40 outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="Detail your product features..." value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    </div>
                    <button onClick={saveProduct} className="w-full py-6 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-[2rem] font-black uppercase text-sm shadow-2xl transition-all active:scale-[0.98]">
                      {isPublishing ? <i className="fa-solid fa-circle-notch animate-spin"></i> : "Synchronize Asset"}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-6 glass-panel rounded-[2.5rem] flex justify-between items-center group transition-all hover:scale-[1.01] hover:border-[#007AFF]/40">
                      <div className="flex items-center gap-6">
                        <img src={p.image} className="w-20 h-20 rounded-3xl object-cover shadow-2xl border-2 border-white dark:border-zinc-800" />
                        <div>
                          <h4 className="font-black text-xl tracking-tighter">{p.title}</h4>
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{p.category} • {p.price} EGP</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-[#007AFF] rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-sm"><i className="fa-solid fa-pen text-sm"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-sm"><i className="fa-solid fa-trash-can text-sm"></i></button>
                      </div>
                    </div>
                  ))}
                  {dbProducts.length === 0 && <div className="p-20 text-center font-black text-zinc-300 uppercase tracking-widest text-sm border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[3rem]">No assets found in database</div>}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center bg-white dark:bg-zinc-800/50 p-6 rounded-[2.5rem] shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Video Tutorials</h3>
                  <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-red-500/30">Add Tutorial</button>
                </div>
                {isEditingVideo && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-6 border-2 border-red-500/30 animate-in zoom-in duration-300">
                    <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-red-500" placeholder="Video Heading" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} />
                    <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-red-500" placeholder="YouTube URL" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase">Cancel</button>
                      <button onClick={saveVideo} className="flex-[2] py-5 bg-red-500 text-white rounded-2xl font-black uppercase shadow-xl shadow-red-500/20">{isPublishing ? "Syncing..." : "Publish Video"}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-5 glass-panel rounded-[2.5rem] flex justify-between items-center transition-all hover:scale-[1.01]">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-14 rounded-2xl overflow-hidden bg-zinc-100 shadow-lg">
                          <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-black text-lg tracking-tight">{v.title}</h4>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">ID: {v.id}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditVideo(v); setIsEditingVideo(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center transition-all active:scale-90"><i className="fa-solid fa-pen text-sm"></i></button>
                        <button onClick={() => deleteVideo(v.id)} className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center transition-all active:scale-90 hover:text-red-500"><i className="fa-solid fa-trash text-sm"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-panel p-10 rounded-[3rem] space-y-8">
                  <div className="space-y-2">
                    <h3 className="font-black text-xl tracking-tighter">Branding</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global Logo Configuration</p>
                  </div>
                  <div className="space-y-6">
                    <label className="block space-y-3">
                      <span className="text-[10px] font-black uppercase text-zinc-400 ml-2">Header Signature</span>
                      <div className="flex items-center gap-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                        <i className="fa-solid fa-image text-zinc-400"></i>
                        <span className="text-xs font-bold flex-1">Upload Site Logo</span>
                        <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b = await toBase64(e.target.files[0]); setSiteLogo(b); await updateSetting('site_logo', b); } }} />
                      </div>
                    </label>
                    <label className="block space-y-3">
                      <span className="text-[10px] font-black uppercase text-zinc-400 ml-2">Preloader Graphic</span>
                      <div className="flex items-center gap-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                        <i className="fa-solid fa-spinner text-zinc-400"></i>
                        <span className="text-xs font-bold flex-1">Update Loading Logo</span>
                        <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b = await toBase64(e.target.files[0]); setLoadingLogo(b); await updateSetting('loading_logo', b); } }} />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[3rem] space-y-8">
                  <div className="space-y-2">
                    <h3 className="font-black text-xl tracking-tighter">Security</h3>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Master Key Configuration</p>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Admin Password</label>
                      <input type="password" placeholder="Set New Master Key" className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xl outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} />
                      <p className="text-[9px] font-bold text-zinc-400 italic mt-2 px-2">* Note: Changes take effect immediately upon loss of focus.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-3xl font-black text-[10px] uppercase shadow-2xl animate-in fade-in slide-in-from-top-10 duration-500 flex items-center gap-3 border ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-500 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-sm`}></i>
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

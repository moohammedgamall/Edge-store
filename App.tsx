
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

  // Merged Data Logic: If DB is empty, show Mocks for user. 
  // IMPORTANT: For Admin list, we want to show everything manageable.
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

  // Initial Data Fetching from Supabase
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

  // Hash Routing Logic
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
      showNotify("Welcome Back, Mohamed");
    } else {
      showNotify("Unauthorized Access", "error");
    }
  };

  // --- DATABASE ACTIONS ---

  // Bulk Sync Mocks to Supabase (Useful for initial setup)
  const syncMocksToCloud = async () => {
    if (!window.confirm("Do you want to upload all default products to Supabase?")) return;
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
      showNotify("Cloud Sync Completed");
    } catch (err) {
      showNotify("Sync Failed", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Required fields missing", "error");
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
      await refreshData();
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' });
      showNotify("Asset Saved Successfully");
    } catch (err) { showNotify("Save Failed", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product forever?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setDbProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Product Deleted");
    } catch (err) { 
      showNotify("Only Database items can be deleted", "error"); 
    }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("Tutorial info missing", "error");
    setIsPublishing(true);
    try {
      const url = new URL(editVideo.url);
      const vidId = url.searchParams.get('v') || url.pathname.split('/').pop();
      if (!vidId) throw new Error();
      
      const payload = { id: vidId, title: editVideo.title, url: editVideo.url };
      await supabase.from('videos').upsert(payload);
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("Tutorial Published");
    } catch (e) { showNotify("Invalid URL Format", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteVideo = async (id: string) => {
    if (!window.confirm("Delete tutorial?")) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
      setDbVideos(prev => prev.filter(v => v.id !== id));
      showNotify("Tutorial Deleted");
    } catch (err) { showNotify("Action Failed", "error"); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      if (key === 'admin_password') setAdminPassword(value);
      if (key === 'site_logo') setSiteLogo(value);
      if (key === 'loading_logo') setLoadingLogo(value);
      showNotify("Settings Updated");
    } catch (err) { showNotify("Failed to update settings", "error"); }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="relative scale-90 sm:scale-100">
        <div className="w-28 h-28 rounded-full overflow-hidden shadow-[0_0_50px_rgba(0,122,255,0.2)] border-4 border-white dark:border-zinc-800">
          <img src={loadingLogo} className="w-full h-full object-cover" />
        </div>
        <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#007AFF] animate-[spin_15s_linear_infinite]"></div>
      </div>
      <div className="mt-12 space-y-2 text-center">
        <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">MOHAMED EDGE</h3>
        <p className="text-[10px] font-bold text-[#007AFF] uppercase tracking-[0.3em]">Authenticating Cloud...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 selection:bg-[#007AFF]/20">
      <Header 
        isAdmin={isAdminMode} 
        onAdminTrigger={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} 
        onThemeToggle={() => setIsDarkMode(!isDarkMode)} 
        isDarkMode={isDarkMode} 
        logoUrl={siteLogo}
      />

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in">
           <div className="w-full max-w-[340px] glass-panel p-10 rounded-[2.5rem] sm:rounded-[3rem] space-y-8 animate-in zoom-in duration-300 shadow-2xl">
              <div className="text-center space-y-2">
                <i className="fa-solid fa-shield-halved text-4xl text-[#007AFF]"></i>
                <h3 className="text-lg font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Admin Login</h3>
              </div>
              <input 
                type="password" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAuth()} 
                className="w-full p-4 sm:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl sm:text-3xl font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all shadow-inner" 
                placeholder="••••" 
                autoFocus 
              />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-[10px] sm:text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:text-red-500 transition-colors">Close</button>
                <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/40 active:scale-95 transition-all">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Sections for Users */}
        {activeSection === 'Home' && (
          <div className="space-y-12 sm:space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <section className="space-y-6 sm:space-y-10">
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter flex items-center gap-3 sm:gap-4 px-1 uppercase">
                <div className="w-1.5 h-6 sm:w-2 sm:h-8 bg-[#007AFF] rounded-full shadow-[0_0_15px_rgba(0,122,255,0.5)]"></div> New Arrivals
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                {products.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onPreview={(id) => window.location.hash = `#/preview/${id}`} 
                    onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} 
                  />
                ))}
              </div>
            </section>

            <section className="space-y-6 sm:space-y-10">
              <h2 className="text-xl sm:text-2xl font-black tracking-tighter flex items-center gap-3 sm:gap-4 px-1 uppercase">
                <div className="w-1.5 h-6 sm:w-2 sm:h-8 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div> Setup Tutorials
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10">
                {videos.map(v => (
                  <div key={v.id} onClick={() => window.open(v.url, '_blank')} className="group relative aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-2 sm:border-4 border-white dark:border-zinc-800 cursor-pointer transition-all active:scale-95">
                    <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                       <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/40 shadow-2xl">
                          <i className="fa-solid fa-play text-2xl sm:text-3xl ml-1"></i>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            <button onClick={() => window.history.back()} className="mb-6 sm:mb-10 w-12 h-12 sm:w-14 sm:h-14 bg-white dark:bg-zinc-800 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 border border-zinc-100 dark:border-zinc-700">
              <i className="fa-solid fa-arrow-left text-base sm:text-lg"></i>
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              <div className="lg:col-span-7 glass-panel p-2 sm:p-4 rounded-[2.5rem] sm:rounded-[3.5rem] border-2 sm:border-4 border-white dark:border-zinc-800 shadow-2xl">
                <img src={selectedProduct.image} className="w-full rounded-[2rem] sm:rounded-[2.8rem] shadow-lg" />
              </div>
              <div className="lg:col-span-5 space-y-6 sm:space-y-8">
                <div className="glass-panel p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] space-y-6 sm:space-y-8 shadow-2xl sticky top-28 border border-white/50 dark:border-white/5">
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter leading-none">{selectedProduct.title}</h2>
                  <p className="text-4xl sm:text-5xl font-black text-[#007AFF] tracking-tighter">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed font-medium">{selectedProduct.description}</p>
                  <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-5 sm:py-6 bg-[#007AFF] text-white rounded-2xl sm:rounded-3xl font-black text-lg sm:text-xl shadow-2xl active:scale-95 transition-all">Order Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-xl mx-auto space-y-8 sm:space-y-10 animate-in slide-in-from-bottom-12 duration-700">
            <div className="text-center space-y-2 sm:space-y-3">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tighter">Checkout</h2>
              <p className="text-zinc-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.4em]">Direct Purchase</p>
            </div>
            <div className="glass-panel p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] space-y-8 sm:space-y-10 shadow-2xl">
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400 ml-2">Device Brand</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Realme', 'Oppo'].map(t => (
                      <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${orderPhoneType === t ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'border-zinc-100 dark:border-zinc-800'}`}>{t}</button>
                    ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400 ml-2">Target Asset</p>
                  <select value={orderProductId} onChange={e => setOrderProductId(e.target.value)} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none border-2 border-transparent focus:border-[#007AFF]">
                    <option value="">Choose your product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.title} - {p.price} EGP</option>)}
                  </select>
               </div>
               {orderProduct && (
                 <div className="p-6 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-[2.5rem] space-y-8 text-center border-2 border-dashed border-[#007AFF]/30">
                    <div className="flex items-center gap-6 justify-center">
                      <img src={orderProduct.image} className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-zinc-700" />
                      <div className="text-left">
                        <h4 className="font-black text-xl tracking-tighter">{orderProduct.title}</h4>
                        <p className="text-2xl font-black text-[#007AFF]">{orderProduct.price} EGP</p>
                      </div>
                    </div>
                    <div className="pt-6 border-t-2 border-zinc-200 dark:border-zinc-800">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Vodafone Cash Number</p>
                       <h3 onClick={() => { navigator.clipboard.writeText("01091931466"); showNotify("Copied to clipboard"); }} className="text-3xl sm:text-4xl font-black tracking-tighter cursor-pointer hover:text-[#007AFF] transition-colors">01091931466</h3>
                    </div>
                    <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=I want to buy: ${orderProduct.title}%0ADevice: ${orderPhoneType}`)} className="w-full py-5 bg-[#24A1DE] text-white rounded-[2rem] font-black text-base flex items-center justify-center gap-3 shadow-xl"><i className="fa-brands fa-telegram text-xl"></i> Telegram Support</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* SECTION: ADMIN PANEL */}
        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12 animate-in slide-in-from-right-10 duration-500">
            <div className="w-full flex justify-center">
              <div className="flex gap-2 sm:gap-6 p-2 bg-zinc-100/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[2rem] shadow-inner border border-white/40 dark:border-white/5 overflow-x-auto no-scrollbar max-w-full">
                {(['Inventory', 'Videos', 'Settings'] as const).map(tab => (
                  <button key={tab} onClick={() => setAdminTab(tab)} className={`px-6 sm:px-10 py-3 sm:py-4 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${adminTab === tab ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-xl' : 'text-zinc-400'}`}>{tab}</button>
                ))}
              </div>
            </div>

            {/* TAB: INVENTORY (Edit/Delete Products) */}
            {adminTab === 'Inventory' && (
              <div className="space-y-8 sm:space-y-10">
                <div className="flex flex-col sm:flex-row justify-between items-center glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">Manage Shop</h3>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Total Assets: {dbProducts.length}</p>
                  </div>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button onClick={syncMocksToCloud} className="flex-1 sm:flex-none px-6 py-4 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 rounded-2xl font-black uppercase text-[10px] transition-all active:scale-95" title="Import initial products">Sync Mocks</button>
                    <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' }); setIsEditingProduct(true); }} className="flex-[2] sm:flex-none px-10 py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Add New</button>
                  </div>
                </div>

                {/* Edit/Add Form */}
                {isEditingProduct && (
                  <div id="product-form" className="glass-panel p-6 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] space-y-8 sm:space-y-10 border-2 border-[#007AFF]/40 animate-in zoom-in duration-300 shadow-2xl">
                    <div className="flex justify-between items-center border-b pb-4 sm:pb-6 dark:border-zinc-800">
                       <h4 className="text-xl font-black uppercase text-[#007AFF] tracking-widest">{editProduct.id ? 'Modify Product' : 'Create Product'}</h4>
                       <button onClick={() => setIsEditingProduct(false)} className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Name</label>
                        <input className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Cyber Glass" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Thumbnail</label>
                        <div className="flex gap-4 items-center">
                          <label className="flex-1 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-center cursor-pointer text-[10px] border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#007AFF]">Upload Image<input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}) }} className="hidden" /></label>
                          {editProduct.image && <img src={editProduct.image} className="w-14 h-14 rounded-xl object-cover border-2 border-white dark:border-zinc-700 shadow-md" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Category</label>
                        <select className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-sm outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Price (EGP)</label>
                        <input type="number" className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-sm outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Description</label>
                      <textarea className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium text-sm h-32 outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="Product details..." value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    </div>
                    <button onClick={saveProduct} className="w-full py-5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-2xl font-black uppercase text-sm shadow-xl active:scale-95 transition-all">
                      {isPublishing ? <i className="fa-solid fa-circle-notch animate-spin mr-3"></i> : <i className="fa-solid fa-cloud-arrow-up mr-3"></i>}
                      {isPublishing ? "Publishing..." : "Save to Cloud"}
                    </button>
                  </div>
                )}

                {/* Inventory List */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Show both DB products and Mocks in admin for easy onboarding */}
                  {(dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS).map(p => (
                    <div key={p.id} className="p-4 sm:p-6 glass-panel rounded-[2rem] sm:rounded-[3rem] flex flex-col sm:flex-row justify-between items-center group transition-all hover:border-[#007AFF]/40 shadow-lg gap-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left w-full sm:w-auto">
                        <img src={p.image} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 sm:border-4 border-white dark:border-zinc-800 shadow-md" />
                        <div>
                          <h4 className="font-black text-lg sm:text-xl tracking-tighter line-clamp-1">{p.title}</h4>
                          <div className="flex items-center gap-2 justify-center sm:justify-start">
                             <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">{p.category}</span>
                             <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                             <span className="text-[9px] font-black text-[#007AFF] uppercase">{p.price} EGP</span>
                             {/* Indicator if it's mock or real */}
                             {!dbProducts.find(db => db.id === p.id) && <span className="ml-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-700 rounded text-[7px] text-zinc-500 font-black">LOCAL</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        <button 
                          onClick={() => { 
                            setEditProduct(p); 
                            setIsEditingProduct(true); 
                            document.getElementById('product-form')?.scrollIntoView({ behavior: 'smooth' });
                          }} 
                          className="flex-1 sm:flex-none w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-[#007AFF] rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-sm"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen text-sm"></i>
                        </button>
                        <button 
                          onClick={() => deleteProduct(p.id)} 
                          className="flex-1 sm:flex-none w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-sm"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: VIDEOS */}
            {adminTab === 'Videos' && (
              <div className="space-y-8 sm:space-y-10">
                <div className="flex justify-between items-center glass-panel p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-sm">
                  <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">Tutorial Archive</h3>
                  <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Add New</button>
                </div>
                {isEditingVideo && (
                  <div className="glass-panel p-6 sm:p-10 rounded-[2.5rem] space-y-6 border-2 border-red-500/30 animate-in zoom-in duration-300">
                    <input className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-sm outline-none border-2 border-transparent focus:border-red-500" placeholder="Tutorial Heading" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} />
                    <input className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-sm outline-none border-2 border-transparent focus:border-red-500" placeholder="YouTube URL" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-2xl font-black uppercase text-[10px]">Cancel</button>
                      <button onClick={saveVideo} className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">{isPublishing ? "Syncing..." : "Publish Tutorial"}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-4 glass-panel rounded-[2rem] flex justify-between items-center shadow-lg gap-4">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-14 rounded-xl overflow-hidden bg-zinc-100 border-2 border-white dark:border-zinc-800 shadow-sm">
                          <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-full h-full object-cover" />
                        </div>
                        <h4 className="font-black text-lg tracking-tighter line-clamp-1">{v.title}</h4>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditVideo(v); setIsEditingVideo(true); }} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center active:scale-90"><i className="fa-solid fa-pen text-xs"></i></button>
                        <button onClick={() => deleteVideo(v.id)} className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center active:scale-90"><i className="fa-solid fa-trash text-xs"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {adminTab === 'Settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <div className="glass-panel p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] space-y-8 shadow-2xl">
                  <h3 className="font-black text-2xl tracking-tighter">Branding</h3>
                  <div className="space-y-6">
                    <label className="block space-y-3">
                      <span className="text-[10px] font-black uppercase text-zinc-400 ml-2">Header Logo</span>
                      <div className="flex items-center gap-4 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                        <i className="fa-solid fa-signature text-xl text-zinc-400"></i>
                        <span className="text-xs font-bold flex-1">Change Site Logo</span>
                        <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b = await fileToBase64(e.target.files[0]); await updateSetting('site_logo', b); } }} />
                      </div>
                    </label>
                    <label className="block space-y-3">
                      <span className="text-[10px] font-black uppercase text-zinc-400 ml-2">Preloader Icon</span>
                      <div className="flex items-center gap-4 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                        <i className="fa-solid fa-bolt-lightning text-xl text-zinc-400"></i>
                        <span className="text-xs font-bold flex-1">Update Loading Icon</span>
                        <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b = await fileToBase64(e.target.files[0]); await updateSetting('loading_logo', b); } }} />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="glass-panel p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] space-y-8 shadow-2xl">
                  <h3 className="font-black text-2xl tracking-tighter">Security</h3>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Admin Key</label>
                      <input 
                        type="password" 
                        placeholder="Set New Master Password" 
                        className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xl outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" 
                        onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} 
                      />
                      <p className="text-[9px] font-bold text-zinc-400 italic px-4 leading-relaxed">System updates instantly upon leaving the input field.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Notification */}
      {notification && (
        <div className={`fixed top-8 sm:top-12 left-1/2 -translate-x-1/2 z-[200] w-[90%] sm:w-auto px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl animate-in fade-in slide-in-from-top-12 duration-500 flex items-center justify-center gap-3 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-500 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-lg`}></i>
          <span className="tracking-[0.1em]">{notification.message}</span>
        </div>
      )}

      {/* Navigation */}
      {!isAdminMode && activeSection !== 'Preview' && (
        <BottomNav activeSection={activeSection} onSectionChange={(s) => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />
      )}
    </div>
  );
};

export default App;

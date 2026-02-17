
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, YoutubeVideo } from './types';
import { NAV_ITEMS } from './constants';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import ProductCard from './components/ProductCard';

const SUPABASE_URL = 'https://nlqnbfvsghlomuugixlk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5scW5iZnZzZ2hsb211dWdpeGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mjk4NzUsImV4cCI6MjA4NjAwNTg3NX0.KXLd6ISgf31DBNaU33fp0ZYLlxyrr62RfrxwYPIMk34';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility for image conversion
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  // Global States
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);

  // Data States from Supabase
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [siteName, setSiteName] = useState("Mohamed Edge");
  const [siteSlogan, setSiteSlogan] = useState("Solo Entrepreneur");
  const [paymentNumber, setPaymentNumber] = useState("01091931466");
  const [telegramUser, setTelegramUser] = useState("Mohamed_edge");
  const [siteLogo, setSiteLogo] = useState("");
  const [loaderLogo, setLoaderLogo] = useState("");
  const [adminPassword, setAdminPassword] = useState("1234");

  // Interaction States
  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(-1);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ 
    title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' 
  });
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [isFetchingVideo, setIsFetchingVideo] = useState(false);

  const showNotify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Fetch Logic (The Core Sync)
  const refreshData = async () => {
    try {
      const [settRes, prodRes, vidRes] = await Promise.all([
        supabase.from('settings').select('*'),
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('videos').select('*').order('created_at', { ascending: false })
      ]);

      if (settRes.data) {
        settRes.data.forEach(s => {
          if (s.key === 'admin_password') setAdminPassword(s.value);
          if (s.key === 'site_name') setSiteName(s.value);
          if (s.key === 'site_slogan') setSiteSlogan(s.value);
          if (s.key === 'payment_number') setPaymentNumber(s.value);
          if (s.key === 'telegram_user') setTelegramUser(s.value);
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loader_logo') {
            setLoaderLogo(s.value);
            localStorage.setItem('cached_loader_logo', s.value);
          }
        });
      }
      setDbProducts(prodRes.data || []);
      setDbVideos(vidRes.data || []);
      
      if (typeof (window as any).hideSplash === 'function') (window as any).hideSplash();
      setIsLoading(false);
    } catch (err) {
      console.error("Database Sync Error:", err);
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  // Auto-fetch YouTube title
  useEffect(() => {
    const fetchTitle = async () => {
      const videoId = getYouTubeId(videoUrlInput);
      if (!videoId) return;
      setIsFetchingVideo(true);
      try {
        const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (response.ok) {
          const data = await response.json();
          setVideoTitleInput(data.title);
        }
      } catch (err) {} finally { setIsFetchingVideo(false); }
    };
    const timer = setTimeout(fetchTitle, 500);
    return () => clearTimeout(timer);
  }, [videoUrlInput]);

  const handleAuth = () => {
    if (passwordInput === adminPassword) {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Cloud Access Granted");
    } else {
      showNotify("Incorrect Password", "error");
    }
  };

  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        const id = hash.replace('#/preview/', '');
        const found = dbProducts.find(p => p.id === id);
        if (found) { setSelectedProduct(found); setPreviewImageIndex(-1); setActiveSection('Preview'); window.scrollTo(0,0); }
      } else if (hash === '#/order') { setActiveSection('Order'); }
      else if (hash === '#/admin') { if (isAdminMode) setActiveSection('Admin'); else setIsAuthModalOpen(true); }
      else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as Section);
      } else { setActiveSection('Home'); }
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode, dbProducts]);

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    return dbProducts.filter(p => p.category === activeSection);
  }, [dbProducts, activeSection]);

  // DB Sync Actions
  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Required fields missing", "error");
    setIsPublishing(true);
    try {
      const payload = {
        id: editProduct.id || Date.now().toString(),
        title: editProduct.title,
        description: editProduct.description || '',
        category: editProduct.category || 'Themes',
        price: Number(editProduct.price) || 0,
        image: editProduct.image,
        gallery: editProduct.gallery || [],
        android_version: editProduct.android_version || ''
      };
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;
      await refreshData();
      setIsEditingProduct(false);
      showNotify("Product Published Successfully");
    } catch (err: any) { showNotify(err.message, "error"); }
    finally { setIsPublishing(false); }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files) return;
    const current = editProduct.gallery || [];
    const remaining = 20 - current.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const base64s = await Promise.all(toProcess.map(file => fileToBase64(file)));
    setEditProduct({ ...editProduct, gallery: [...current, ...base64s] });
  };

  const addVideo = async () => {
    const videoId = getYouTubeId(videoUrlInput);
    if (!videoId) return showNotify("Invalid YouTube Link", "error");
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('videos').upsert({ id: videoId, title: videoTitleInput, url: videoUrlInput });
      if (error) throw error;
      setVideoUrlInput(''); setVideoTitleInput('');
      await refreshData();
      showNotify("Video Synced");
    } catch (err: any) { showNotify(err.message, "error"); }
    finally { setIsPublishing(false); }
  };

  const saveGlobalSettings = async () => {
    setIsPublishing(true);
    try {
      const settings = [
        { key: 'admin_password', value: adminPassword },
        { key: 'site_name', value: siteName },
        { key: 'site_slogan', value: siteSlogan },
        { key: 'payment_number', value: paymentNumber },
        { key: 'telegram_user', value: telegramUser }
      ];
      const { error } = await supabase.from('settings').upsert(settings);
      if (error) throw error;
      showNotify("System Settings Updated on Cloud");
      await refreshData();
    } catch (err: any) { showNotify(err.message, "error"); }
    finally { setIsPublishing(false); }
  };

  const handleTelegramOrder = () => {
    const selectedProd = dbProducts.find(p => p.id === orderProductId);
    if (!selectedProd) return;

    const message = `Hello, I would like to order a digital product:

📱 Phone Type: ${orderDevice}
📦 Category: ${selectedProd.category}
🏷 Product: ${selectedProd.title}
💰 Price: ${selectedProd.price.toLocaleString()} EGP

✅ Payment has been sent via Vodafone Cash.`;

    window.open(`https://t.me/${telegramUser}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-32 bg-[#F2F2F7]">
      <Header 
        isAdmin={isAdminMode} 
        onAdminTrigger={() => setIsAuthModalOpen(true)} 
        onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} 
        onThemeToggle={() => {}} isDarkMode={false}
        logoUrl={siteLogo} siteName={siteName} siteSlogan={siteSlogan}
      />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500">
          <div className="w-full max-w-[380px] bg-white/90 rounded-[3rem] p-10 space-y-10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-white/50 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#007AFF] to-transparent opacity-50"></div>
            
            <div className="space-y-4">
              <div className="w-20 h-20 bg-[#007AFF] text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                <i className="fa-solid fa-shield-halved text-3xl"></i>
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-2xl tracking-tighter text-zinc-900">Admin Console</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007AFF]">System Authentication</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <input 
                  type="password" 
                  value={passwordInput} 
                  onChange={e => setPasswordInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleAuth()} 
                  className="w-full p-6 rounded-2xl bg-zinc-100/50 text-center text-3xl font-black outline-none border-2 border-transparent focus:border-[#007AFF] focus:bg-white transition-all duration-300 text-zinc-900 tracking-[0.5em] placeholder:tracking-normal placeholder:text-zinc-300" 
                  placeholder="••••" 
                  autoFocus 
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                   <div className="w-12 h-1 bg-[#007AFF] rounded-full"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setIsAuthModalOpen(false); window.location.hash = '#/'; }} 
                  className="py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAuth} 
                  className="py-5 bg-[#007AFF] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Authorize
                </button>
              </div>
            </div>

            <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Secure Cloud Database v2.5</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-400">
            <i className="fa-solid fa-circle-notch fa-spin text-4xl mb-4"></i>
            <p className="font-black uppercase text-[10px] tracking-widest">Connecting to database...</p>
          </div>
        ) : (
          (['Home', 'Themes', 'Widgets', 'Walls'].includes(activeSection)) && (
            <div className="space-y-16 animate-in fade-in duration-700">
              <section className="space-y-8">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> {activeSection === 'Home' ? 'New Assets' : activeSection}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.length > 0 ? filteredProducts.map(p => <ProductCard key={p.id} product={p} onPreview={id => window.location.hash = `#/preview/${id}`} onBuy={id => { setOrderProductId(id); window.location.hash = '#/order'; }} />) : (
                    <div className="col-span-full py-20 text-center opacity-40">
                      <i className="fa-solid fa-ghost text-4xl mb-4"></i>
                      <p className="font-black uppercase text-[10px] tracking-widest">No assets found in cloud</p>
                    </div>
                  )}
                </div>
              </section>

              {activeSection === 'Home' && dbVideos.length > 0 && (
                <section className="space-y-8 pb-10">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Featured Reviews
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {dbVideos.map(vid => (
                      <div key={vid.id} onClick={() => window.open(vid.url, '_blank')} className="glass-panel group overflow-hidden rounded-[2.5rem] cursor-pointer transition-all border border-white/20 relative shadow-lg">
                        <div className="aspect-video relative overflow-hidden bg-zinc-900">
                           <img loading="lazy" src={`https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80" alt="" />
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-110 transition-all">
                                 <i className="fa-solid fa-play text-xl translate-x-0.5"></i>
                              </div>
                           </div>
                        </div>
                        <div className="p-7"><h3 className="font-black text-lg tracking-tight line-clamp-2 group-hover:text-[#007AFF] transition-colors">{vid.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-12 pb-24">
            <div className="max-w-6xl mx-auto glass-panel overflow-hidden rounded-[3rem] shadow-3xl border border-white/40 flex flex-col md:flex-row min-h-[600px]">
              {/* Left Side: Image Showcase */}
              <div className="w-full md:w-[45%] bg-zinc-100/50 dark:bg-zinc-900/20 p-6 md:p-12 flex flex-col gap-6 items-center justify-center border-r border-zinc-200/50">
                <div className="w-full aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl bg-white dark:bg-zinc-800 flex items-center justify-center group relative">
                  <img 
                    src={previewImageIndex === -1 ? selectedProduct.image : (selectedProduct.gallery ? selectedProduct.gallery[previewImageIndex] : selectedProduct.image)} 
                    className="h-full w-full object-contain animate-in fade-in zoom-in-95 duration-500" 
                    alt={selectedProduct.title}
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
                
                {selectedProduct.gallery && selectedProduct.gallery.length > 0 && (
                  <div className="w-full flex gap-3 overflow-x-auto py-2 scrollbar-hide snap-x">
                    <div 
                      onClick={() => setPreviewImageIndex(-1)} 
                      className={`snap-start w-20 h-24 rounded-2xl overflow-hidden shrink-0 border-4 transition-all cursor-pointer ${previewImageIndex === -1 ? 'border-[#007AFF] scale-110' : 'border-transparent opacity-60'}`}
                    >
                      <img src={selectedProduct.image} className="w-full h-full object-cover" />
                    </div>
                    {selectedProduct.gallery.map((img, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setPreviewImageIndex(idx)} 
                        className={`snap-start w-20 h-24 rounded-2xl overflow-hidden shrink-0 border-4 transition-all cursor-pointer ${previewImageIndex === idx ? 'border-[#007AFF] scale-110' : 'border-transparent opacity-60'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: Product Details */}
              <div className="flex-1 p-8 md:p-16 flex flex-col justify-between space-y-10">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-[#007AFF]/10 text-[#007AFF] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#007AFF]/20">
                        {selectedProduct.category}
                      </span>
                      {selectedProduct.android_version && (
                        <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
                          Android {selectedProduct.android_version}
                        </span>
                      )}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 leading-tight">
                      {selectedProduct.title}
                    </h2>
                  </div>

                  <div className="p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-[2rem] border border-zinc-200/50">
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium text-lg leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-[#007AFF] shadow-sm">
                        <i className="fa-solid fa-mobile-screen-button text-lg"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Compatibility</span>
                        <span className="text-sm font-bold text-zinc-800">Realme / Oppo</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-[#007AFF] shadow-sm">
                        <i className="fa-solid fa-shield-check text-lg"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</span>
                        <span className="text-sm font-bold text-zinc-800">Verified Asset</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-10 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="flex flex-col items-center sm:items-start">
                     <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mb-1">Asset Value</span>
                     <div className="text-4xl font-black text-zinc-900 tracking-tighter">
                       {selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price.toLocaleString()} EGP`}
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-4 w-full sm:w-auto">
                     <button 
                       onClick={() => window.location.hash = '#/'} 
                       className="flex-1 sm:flex-none px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                     >
                       Close
                     </button>
                     <button 
                       onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} 
                       className="flex-1 sm:flex-none px-12 py-5 bg-[#007AFF] text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                     >
                       {selectedProduct.price === 0 ? 'Download' : 'Order Asset'}
                       <i className="fa-solid fa-chevron-right text-[10px]"></i>
                     </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeSection === 'Order' && (
          <div className="max-w-4xl mx-auto py-8 animate-in slide-in-from-bottom-8">
            <div className="glass-panel p-10 rounded-[4rem] space-y-10 shadow-2xl border-white/20">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#007AFF]/20 shadow-lg"><i className="fa-solid fa-cart-shopping text-2xl"></i></div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter text-zinc-900">Checkout</h2>
                  <p className="text-zinc-500 font-medium">Connect on Telegram to finalize your order.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-2">Your Device</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Realme', 'Oppo'].map(d => (
                            <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-4 rounded-2xl font-black text-sm transition-all border-2 ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-lg' : 'bg-zinc-100 border-transparent text-zinc-500'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-2">Selected Product</label>
                        <select className="w-full p-4 rounded-2xl bg-zinc-100 font-black outline-none text-zinc-900 border-2 border-transparent focus:border-[#007AFF]" value={orderProductId} onChange={e => setOrderProductId(e.target.value)}>
                          <option value="">Choose asset...</option>
                          {dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} ({p.price} EGP)</option>)}
                        </select>
                      </div>
                   </div>
                   <div className="relative">
                      {dbProducts.find(p => p.id === orderProductId) ? (
                        <div className="space-y-6">
                           <div className="p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-200 space-y-6">
                              <h3 className="text-xl font-black tracking-tight text-zinc-900">Payment Steps</h3>
                              <div className="space-y-4">
                                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Vodafone Cash Number:</p>
                                 <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-between">
                                    <span className="text-lg font-black tracking-widest font-mono text-zinc-900">{paymentNumber}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(paymentNumber); showNotify('Copied to clipboard'); }} className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all"><i className="fa-solid fa-copy text-xs"></i></button>
                                 </div>
                              </div>
                           </div>
                           <button onClick={handleTelegramOrder} className="w-full py-5 bg-[#0088CC] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform">
                             <i className="fa-brands fa-telegram text-2xl"></i> Message Telegram
                           </button>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-50 rounded-[2.5rem] border-2 border-dashed border-zinc-200 opacity-50">
                           <i className="fa-solid fa-magnifying-glass text-4xl mb-4 text-zinc-300"></i>
                           <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Select an asset to see payment info</p>
                        </div>
                      )}
                   </div>
                </div>
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in pb-24">
            <div className="flex p-2 bg-zinc-200/50 rounded-[2.5rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-3xl transition-all text-[10px] uppercase font-black ${adminTab === tab ? 'bg-white text-[#007AFF] shadow-lg' : 'text-zinc-400'}`}>{tab}</button>)}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-blue-600 transition-colors">Add New Cloud Asset</button>
                {isEditingProduct && (
                  <div className="glass-panel p-8 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <input className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Title" />
                          <textarea className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Description" rows={4} />
                          <div className="grid grid-cols-2 gap-4">
                             <input type="number" className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price" />
                             <input className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.android_version} onChange={e => setEditProduct({...editProduct, android_version: e.target.value})} placeholder="Android Ver." />
                          </div>
                          <select className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}><option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option></select>
                       </div>
                       <div className="space-y-4 text-center">
                          <label className="text-[10px] font-black uppercase text-zinc-400">Cover Image</label>
                          <div className="aspect-video bg-zinc-100 rounded-[2rem] overflow-hidden relative border-2 border-dashed border-zinc-300 hover:border-[#007AFF] transition-colors group">
                             {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-30"><i className="fa-solid fa-upload text-3xl"></i></div>}
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-2"><label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Gallery Preview ({editProduct.gallery?.length || 0}/20)</label></div>
                      <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                        {(editProduct.gallery || []).map((img, idx) => (
                          <div key={idx} className="aspect-[3/4] rounded-xl overflow-hidden relative group border border-zinc-200 shadow-sm">
                            <img src={img} className="w-full h-full object-cover" />
                            <button onClick={() => { const g = [...editProduct.gallery!]; g.splice(idx,1); setEditProduct({...editProduct, gallery: g}); }} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                          </div>
                        ))}
                        {(editProduct.gallery || []).length < 20 && (
                          <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center relative hover:border-[#007AFF] transition-colors">
                            <i className="fa-solid fa-plus text-zinc-300"></i><input type="file" multiple accept="image/*" onChange={e => handleGalleryUpload(e.target.files)} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-100 text-zinc-500 rounded-2xl font-black uppercase text-[10px]">Discard</button>
                       <button onClick={saveProduct} disabled={isPublishing} className="flex-[2] py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg disabled:opacity-50">{isPublishing ? 'Publishing...' : 'Sync to Cloud'}</button>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                   {dbProducts.map(p => (
                     <div key={p.id} className="p-4 glass-panel rounded-3xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <img src={p.image} className="w-14 h-14 rounded-2xl object-cover" />
                           <div><p className="font-black text-sm text-zinc-900">{p.title}</p><p className="text-[9px] text-[#007AFF] font-black uppercase">{p.category} • {p.price} EGP</p></div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); }} className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                           <button onClick={async () => { if(confirm('Permanently delete from cloud?')) { await supabase.from('products').delete().eq('id', p.id); refreshData(); } }} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all"><i className="fa-solid fa-trash text-xs"></i></button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <div className="glass-panel p-8 rounded-[3rem] space-y-6">
                  <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900">Add Video Review</h3>
                  <div className="space-y-4">
                    <div className="relative">
                      <input className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} placeholder="YouTube URL" />
                      {isFetchingVideo && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#007AFF]"><i className="fa-solid fa-circle-notch fa-spin"></i></div>}
                    </div>
                    <input className="w-full p-5 rounded-2xl bg-zinc-100 font-black outline-none border-2 border-transparent focus:border-[#007AFF] text-zinc-900" value={videoTitleInput} onChange={e => setVideoTitleInput(e.target.value)} placeholder="Display Title" />
                    <button onClick={addVideo} disabled={isPublishing || !getYouTubeId(videoUrlInput)} className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Sync Video</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dbVideos.map(vid => (
                    <div key={vid.id} className="p-4 glass-panel rounded-3xl flex items-center justify-between">
                       <div className="flex items-center gap-4 overflow-hidden"><img src={`https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`} className="w-20 h-12 rounded-xl object-cover" /><p className="font-black text-xs text-zinc-900 truncate">{vid.title}</p></div>
                       <button onClick={async () => { if(confirm('Delete video?')) { await supabase.from('videos').delete().eq('id', vid.id); refreshData(); } }} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all"><i className="fa-solid fa-trash text-xs"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="space-y-10 animate-in fade-in">
                 <div className="glass-panel p-10 rounded-[3rem] space-y-10 border-white/40">
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">Cloud System Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <section className="space-y-6">
                         <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2">Brand Name</label><input className="w-full p-4 rounded-xl bg-zinc-100 font-black text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF]" value={siteName} onChange={e => setSiteName(e.target.value)} /></div>
                         <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2">Tagline</label><input className="w-full p-4 rounded-xl bg-zinc-100 font-black text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF]" value={siteSlogan} onChange={e => setSiteSlogan(e.target.value)} /></div>
                         <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2">Vodafone Cash Number</label><input className="w-full p-4 rounded-xl bg-zinc-100 font-black text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF]" value={paymentNumber} onChange={e => setPaymentNumber(e.target.value)} /></div>
                         <div className="space-y-2"><label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest px-2">Telegram Username</label><input className="w-full p-4 rounded-xl bg-zinc-100 font-black text-zinc-900 outline-none border-2 border-transparent focus:border-[#007AFF]" value={telegramUser} onChange={e => setTelegramUser(e.target.value)} /></div>
                       </section>
                       <section className="space-y-8">
                         <div className="space-y-4 p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-200 shadow-sm">
                            <label className="text-[8px] font-black uppercase text-zinc-400 block tracking-widest px-2">Access Code</label>
                            <input className="w-full p-4 rounded-xl bg-white font-black text-center text-lg outline-none border-2 border-transparent focus:border-[#007AFF]" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                            <button onClick={saveGlobalSettings} disabled={isPublishing} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl disabled:opacity-50">{isPublishing ? 'Saving...' : 'Update All Cloud Data'}</button>
                         </div>
                         <div className="flex gap-8 justify-center">
                            <div className="text-center flex-1 group">
                               <label className="text-[8px] font-black uppercase text-zinc-400 block mb-2">Primary Logo</label>
                               <div className="w-20 h-20 mx-auto rounded-full overflow-hidden relative border-4 border-[#007AFF]/10 bg-zinc-50 shadow-inner cursor-pointer transition-transform group-active:scale-90">
                                  {siteLogo && <img src={siteLogo} className="w-full h-full object-cover" />}
                                  <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); await supabase.from('settings').upsert({key: 'site_logo', value: b64}); setSiteLogo(b64); showNotify("Site Logo Updated"); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                               </div>
                            </div>
                            <div className="text-center flex-1 group">
                               <label className="text-[8px] font-black uppercase text-zinc-400 block mb-2">Splash Logo</label>
                               <div className="w-20 h-20 mx-auto rounded-full overflow-hidden relative border-4 border-zinc-200 bg-zinc-50 shadow-inner cursor-pointer transition-transform group-active:scale-90">
                                  {loaderLogo && <img src={loaderLogo} className="w-full h-full object-cover" />}
                                  <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) { const b64 = await fileToBase64(e.target.files[0]); await supabase.from('settings').upsert({key: 'loader_logo', value: b64}); setLoaderLogo(b64); showNotify("Splash Logo Updated"); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                               </div>
                            </div>
                         </div>
                       </section>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-[#007AFF] text-white' : 'bg-red-600 text-white'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={s => { window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`; }} />}
    </div>
  );
};

export default App;


import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Section, Product, BannerSettings, YoutubeVideo } from './types';
import { MOCK_PRODUCTS, DEFAULT_BANNER, MOCK_VIDEOS } from './constants';
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
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [banner, setBanner] = useState<BannerSettings>(DEFAULT_BANNER);
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // Merged Products (Mock + DB)
  const products = useMemo(() => {
    const merged = [...dbProducts, ...MOCK_PRODUCTS];
    return Array.from(new Map(merged.map(item => [item.id, item])).values());
  }, [dbProducts]);

  // Merged Videos
  const videos = useMemo(() => {
    const merged = [...dbVideos, ...MOCK_VIDEOS];
    return Array.from(new Map(merged.map(v => [v.id, v])).values());
  }, [dbVideos]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderCategory, setOrderCategory] = useState<Section>('Themes');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ is_premium: false });
  
  // Admin Tabs
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Banner' | 'Videos' | 'Settings'>('Inventory');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

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
        if (prodData) setDbProducts(prodData);

        const { data: vidData } = await supabase.from('videos').select('*');
        if (vidData) setDbVideos(vidData);

        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
          settingsData.forEach(s => {
            if (s.key === 'admin_password') setAdminPassword(s.value);
            if (s.key === 'site_logo') setSiteLogo(s.value);
            if (s.key === 'loading_logo') setLoadingLogo(s.value);
          });
        }

        const { data: bannerData } = await supabase.from('banner').select('*').eq('id', 1).maybeSingle();
        if (bannerData) {
          setBanner(prev => ({ 
            ...prev, 
            title: bannerData.title || prev.title, 
            highlight: bannerData.highlight || prev.highlight, 
            imageUrl: bannerData.imageUrl || prev.imageUrl 
          }));
        }
      } catch (e) {
        console.error("DB Fetch Error", e);
      } finally {
        setTimeout(() => setIsLoading(false), 400);
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'siteLogo' | 'loadingLogo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const base64 = await fileToBase64(file);
      if (target === 'product') {
        setEditProduct(prev => ({ ...prev, image: base64 }));
      } else if (target === 'siteLogo') {
        setSiteLogo(base64);
        await handleUpdateSettings('site_logo', base64);
      } else if (target === 'loadingLogo') {
        setLoadingLogo(base64);
        await handleUpdateSettings('loading_logo', base64);
      } else if (target === 'banner') {
        setBanner(prev => ({ ...prev, imageUrl: base64 }));
      }
      showNotification("Image Uploaded Locally");
    } catch (err) {
      console.error(err);
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
      showNotification("Product Published!");
    } catch (err) { console.error(err); }
    finally { setIsPublishing(false); }
  };

  const handleAddVideo = async () => {
    const urlParams = new URLSearchParams(new URL(newVideoUrl).search);
    const videoId = urlParams.get('v');
    if (!videoId) return showNotification("Invalid YouTube Link");
    
    const newVideo = { id: videoId, title: newVideoTitle || 'New Tutorial', url: newVideoUrl };
    try {
      await supabase.from('videos').insert(newVideo);
      setDbVideos(prev => [...prev, newVideo]);
      setNewVideoUrl('');
      setNewVideoTitle('');
      showNotification("Video Added");
    } catch (e) { console.error(e); }
  };

  const handleUpdateSettings = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      if (key === 'admin_password') setAdminPassword(value);
      showNotification("Settings Updated");
    } catch (e) { console.error(e); }
  };

  const handleUpdateBanner = async () => {
    try {
      await supabase.from('banner').upsert({ id: 1, ...banner });
      showNotification("Banner Updated");
    } catch (e) { console.error(e); }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800 animate-in fade-in duration-300">
          <img src={loadingLogo} className="w-full h-full object-cover" alt="Loading" loading="eager" />
        </div>
        <div className="absolute -inset-2 rounded-full border-2 border-dashed border-[#007AFF] animate-[spin_10s_linear_infinite]"></div>
      </div>
      <h3 className="mt-8 text-lg font-black tracking-widest text-zinc-900 dark:text-zinc-100 uppercase animate-in slide-in-from-bottom-2 duration-500">Edge Marketplace</h3>
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
            {/* Banner Section */}
            <section className="relative w-full aspect-[4/5] sm:aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-white dark:border-zinc-800">
              <img src={banner.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[5s] hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 md:p-14">
                <h2 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter">
                  {banner.title} <br/> <span className="text-[#007AFF]">{banner.highlight}</span>
                </h2>
                <button onClick={() => window.location.hash = '#/themes'} className="mt-8 px-8 py-3.5 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] self-start shadow-xl active:scale-95 transition-all">Explore Assets</button>
              </div>
            </section>
            
            {/* Tutorials Section */}
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Latest Tutorials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {videos.map(v => (
                  <div key={v.id} onClick={() => window.open(v.url, '_blank')} className="group relative aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem] overflow-hidden shadow-lg border-4 border-white dark:border-zinc-700 cursor-pointer active:scale-95 transition-all">
                    <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={v.title} />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                       <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-play text-2xl ml-1"></i>
                       </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                       <p className="text-white font-black text-sm">{v.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Featured Assets */}
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> Featured Assets
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
                  <button onClick={() => { setOrderProductId(selectedProduct.id); setOrderCategory(selectedProduct.category as Section); window.location.hash = '#/order'; }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">Buy Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-xl mx-auto space-y-8 pb-44 animate-in slide-in-from-bottom-10 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">Checkout</h2>
              <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.3em]">Premium Digital Asset</p>
            </div>

            <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-8 border-white dark:border-zinc-800 shadow-2xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-[10px]">1</div>
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Select Your Device</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {['Realme', 'Oppo'].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setOrderPhoneType(t as any)} 
                      className={`py-4 md:py-5 rounded-[1.2rem] md:rounded-[1.5rem] border-2 transition-all font-black text-[10px] tracking-widest uppercase flex flex-col items-center gap-2 ${orderPhoneType === t ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xl scale-[1.02]' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200'}`}
                    >
                      <i className={`fa-solid ${t === 'Realme' ? 'fa-mobile-screen' : 'fa-mobile'} text-lg`}></i>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-black text-[10px]">2</div>
                  <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Select Item</p>
                </div>
                <select 
                  value={orderProductId} 
                  onChange={e => setOrderProductId(e.target.value)} 
                  className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all text-xs appearance-none cursor-pointer"
                >
                  <option value="" disabled>Choose from store...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.title} — {p.price} EGP</option>)}
                </select>
              </div>

              {orderProduct && (
                <div className="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-[2rem] md:rounded-[2.5rem] border border-zinc-100 dark:border-zinc-700 space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-zinc-700">
                      <img src={orderProduct.image} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[8px] font-black uppercase text-[#007AFF] tracking-widest">{orderProduct.category}</span>
                      <h4 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{orderProduct.title}</h4>
                      <p className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{orderProduct.price} EGP</p>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-3 pt-6 border-t dark:border-zinc-700">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payment Method: Vodafone Cash</p>
                    <div onClick={() => copyToClipboard("01091931466")} className="group cursor-pointer inline-flex flex-col items-center">
                      <span className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tighter hover:text-[#007AFF] transition-colors">01091931466</span>
                      <span className="mt-1.5 text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-copy"></i> Click to copy</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const msg = `Checkout Request:%0A- Asset: ${orderProduct.title}%0A- Device: ${orderPhoneType}%0A- Price: ${orderProduct.price} EGP`;
                      window.open(`https://t.me/Mohamed_edge?text=${msg}`);
                    }} 
                    className="w-full py-5 md:py-6 bg-[#24A1DE] text-white rounded-[1.2rem] md:rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <i className="fa-brands fa-telegram text-xl"></i> Send Screenshot
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories Sections */}
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

        {/* Admin Dashboard */}
        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-6xl mx-auto space-y-10 pb-44 animate-in fade-in duration-700">
            <div className="flex flex-wrap gap-2 md:gap-4 p-1.5 md:p-2 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl md:rounded-[1.5rem] w-fit">
              {(['Inventory', 'Banner', 'Videos', 'Settings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAdminTab(tab)}
                  className={`px-4 md:px-8 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${adminTab === tab ? 'bg-white dark:bg-zinc-800 shadow-md text-[#007AFF]' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Inventory Tab */}
            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm">
                  <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Cloud Store</h3>
                  <button onClick={() => { setEditProduct({ is_premium: false }); setIsEditing(true); }} className="w-full sm:w-auto px-8 py-4 bg-[#007AFF] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95">Add New Asset</button>
                </div>

                {isEditing && (
                  <div className="glass-panel p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-6 md:space-y-8 border-white dark:border-zinc-800 shadow-2xl relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Title</label>
                        <input className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Asset Image (Device Upload)</label>
                        <div className="flex gap-4">
                          <label className="flex-1 p-4 md:p-5 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] font-black text-center text-[10px] uppercase cursor-pointer border-2 border-dashed border-[#007AFF]/30">
                            Upload File
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'product')} />
                          </label>
                          {editProduct.image && <img src={editProduct.image} className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover" />}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Category</label>
                        <select className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as Section})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Price (EGP)</label>
                        <input type="number" className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <textarea placeholder="Asset Description..." className="w-full p-5 md:p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium h-32 outline-none text-sm" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-[1.5rem] md:rounded-[2rem] font-black uppercase text-[10px] tracking-widest">Cancel</button>
                      <button onClick={handleSaveProduct} disabled={isPublishing} className="flex-[2] py-5 bg-[#007AFF] text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest shadow-2xl">{isPublishing ? "Publishing..." : "Sync to Cloud"}</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dbProducts.map(p => (
                    <div key={p.id} className="p-5 md:p-6 bg-white dark:bg-zinc-900 rounded-[2rem] flex items-center justify-between border border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-4 md:gap-6">
                        <img src={p.image} className="w-12 h-12 md:w-16 md:h-16 rounded-2xl object-cover" />
                        <div><p className="font-black text-sm md:text-lg leading-none">{p.title}</p><p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest mt-1.5">{p.category} • {p.price} EGP</p></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {setEditProduct(p); setIsEditing(true);}} className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-[#007AFF] rounded-full flex items-center justify-center"><i className="fa-solid fa-pen text-sm"></i></button>
                        <button onClick={async () => { if(confirm('Delete?')) { await supabase.from('products').delete().eq('id', p.id); setDbProducts(ps => ps.filter(x => x.id !== p.id)); showNotification("Deleted"); } }} className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><i className="fa-solid fa-trash text-sm"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Banner Tab */}
            {adminTab === 'Banner' && (
              <div className="max-w-3xl glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-8 animate-in slide-in-from-bottom-4">
                <h3 className="text-2xl font-black tracking-tighter uppercase">Hero Banner</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <input className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" placeholder="Title" value={banner.title} onChange={e => setBanner({...banner, title: e.target.value})} />
                  <input className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" placeholder="Highlight" value={banner.highlight} onChange={e => setBanner({...banner, highlight: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Banner Background</label>
                  <label className="block w-full p-8 md:p-10 rounded-[1.5rem] md:rounded-[2rem] bg-zinc-50 dark:bg-zinc-800/50 border-4 border-dashed border-zinc-200 dark:border-zinc-700 cursor-pointer text-center group">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-[#007AFF] transition-colors">Click to upload banner image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'banner')} />
                  </label>
                  {banner.imageUrl && <img src={banner.imageUrl} className="mt-4 w-full h-32 md:h-40 object-cover rounded-2xl shadow-lg border-2 border-white dark:border-zinc-700" />}
                </div>
                <button onClick={handleUpdateBanner} className="w-full py-5 md:py-6 bg-[#007AFF] text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl">Update Home Banner</button>
              </div>
            )}

            {/* Videos Tab */}
            {adminTab === 'Videos' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4">
                <div className="max-w-3xl glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-6">
                  <h3 className="text-2xl font-black tracking-tighter uppercase">Manage YouTube Links</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <input className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" placeholder="Video Title" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} />
                    <input className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" placeholder="YouTube URL (https://...)" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} />
                  </div>
                  <button onClick={handleAddVideo} className="w-full py-4 md:py-5 bg-red-500 text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Add Video to Feed</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-5 md:p-6 bg-white dark:bg-zinc-900 rounded-[2rem] flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-4">
                        <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-16 md:w-20 h-10 md:h-12 rounded-lg object-cover" />
                        <p className="font-black text-[10px] md:text-xs line-clamp-1">{v.title}</p>
                      </div>
                      <button onClick={async () => { await supabase.from('videos').delete().eq('id', v.id); setDbVideos(prev => prev.filter(x => x.id !== v.id)); showNotification("Video Removed"); }} className="w-8 h-8 md:w-10 md:h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center"><i className="fa-solid fa-trash-can text-sm"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {adminTab === 'Settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 animate-in slide-in-from-bottom-4">
                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-6 md:space-y-8">
                  <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Identity & Logos</h3>
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase text-zinc-400">Site Logo (Header)</p>
                    <label className="flex items-center gap-4 md:gap-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-[1.5rem] md:rounded-3xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <img src={siteLogo} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover shadow-lg border-2 border-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Update Header Logo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'siteLogo')} />
                    </label>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase text-zinc-400">Loading Logo (App Boot)</p>
                    <label className="flex items-center gap-4 md:gap-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-[1.5rem] md:rounded-3xl cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <img src={loadingLogo} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover shadow-lg border-2 border-white" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Update Loader Image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'loadingLogo')} />
                    </label>
                  </div>
                </div>

                <div className="glass-panel p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] space-y-6 md:space-y-8">
                  <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase">Master Security</h3>
                  <div className="space-y-4">
                    <p className="text-[9px] font-black uppercase text-zinc-400">Change Admin Password</p>
                    <input type="password" placeholder="New Master Key" className="w-full p-5 md:p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-bold text-center text-xl md:text-3xl tracking-[0.2em] md:tracking-[0.5em] outline-none" onBlur={e => e.target.value && handleUpdateSettings('admin_password', e.target.value)} />
                    <p className="text-[8px] font-bold text-red-500 uppercase tracking-widest text-center mt-4 leading-relaxed">Security Note: Password is updated instantly on leave.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4">
           <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 md:px-8 py-3 md:py-4 rounded-full font-black text-[8px] md:text-[9px] shadow-2xl flex items-center gap-3 uppercase tracking-[0.2em]">
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

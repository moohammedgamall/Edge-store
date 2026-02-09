
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

  // UI Controls
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

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const refreshData = async () => {
    const startTime = Date.now();
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
      console.error("Fetch Error:", err);
    } finally {
      // Ensure loader is visible for at least 1.5 seconds for branding effect
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 1500 - elapsed);
      setTimeout(() => setIsLoading(false), delay);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

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
      showNotify("Dashboard Access Granted");
    } else {
      showNotify("Invalid Password", "error");
    }
  };

  const syncMocksToCloud = async () => {
    if (!window.confirm("Restore default mock items?")) return;
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
      showNotify("Inventory Synced");
    } catch (err) { showNotify("Sync Error", "error"); }
    finally { setIsPublishing(false); }
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Missing Assets", "error");
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
      showNotify("Cloud Entry Updated");
    } catch (err) { showNotify("Upload Failed", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("Confirm deletion?")) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setDbProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Asset Removed");
    } catch (err) { showNotify("Sync Conflict", "error"); }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("Data required", "error");
    setIsPublishing(true);
    try {
      const url = new URL(editVideo.url);
      const vidId = url.searchParams.get('v') || url.pathname.split('/').pop();
      if (!vidId) throw new Error();
      await supabase.from('videos').upsert({ id: vidId, title: editVideo.title, url: editVideo.url });
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("Tutorial Synced");
    } catch (e) { showNotify("Bad URL", "error"); }
    finally { setIsPublishing(false); }
  };

  const deleteVideo = async (id: string) => {
    if (!window.confirm("Delete?")) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
      setDbVideos(prev => prev.filter(v => v.id !== id));
      showNotify("Deleted");
    } catch (err) { showNotify("Failed", "error"); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value });
      if (error) throw error;
      if (key === 'admin_password') setAdminPassword(value);
      if (key === 'site_logo') setSiteLogo(value);
      if (key === 'loading_logo') setLoadingLogo(value);
      showNotify("Master Setting Updated");
    } catch (err) { 
      console.error(err);
      showNotify("Cloud Sync Failed", "error"); 
    }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const orderProduct = useMemo(() => products.find(p => p.id === orderProductId), [products, orderProductId]);

  // ENHANCED LOADER: Visible when isLoading is true
  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E] transition-colors duration-500">
      <div className="relative group">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-10 transition-transform duration-700">
          <img 
            src={loadingLogo} 
            className="w-full h-full object-cover" 
            alt="Loading..."
            onError={(e) => (e.currentTarget.src = "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa")}
          />
        </div>
        <div className="absolute -inset-4 sm:-inset-5 border-2 border-dashed border-[#007AFF] rounded-full animate-[spin_8s_linear_infinite]"></div>
        <div className="absolute -inset-1 bg-[#007AFF]/10 rounded-full blur-2xl animate-pulse"></div>
      </div>
      <div className="mt-12 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
         <h3 className="text-xl font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-100">Mohamed Edge</h3>
         <p className="text-[10px] font-bold text-[#007AFF] uppercase tracking-[0.3em] animate-pulse">Initializing Assets...</p>
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
              <div className="text-center space-y-2">
                <i className="fa-solid fa-lock text-[#007AFF] text-2xl"></i>
                <h3 className="font-black uppercase text-xs tracking-widest">Admin Control</h3>
              </div>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF] transition-all" placeholder="••••" autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-4 text-[10px] font-black uppercase text-zinc-400">Cancel</button>
                <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-500/30">Verify</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight uppercase px-1 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> Marketplace
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(p => <ProductCard key={p.id} product={p} onPreview={(id) => window.location.hash = `#/preview/${id}`} onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
              </div>
            </section>
          </div>
        )}

        {/* Preview & Order Sections remain functional */}
        {activeSection === 'Preview' && selectedProduct && (
           <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
             <button onClick={() => window.history.back()} className="mb-8 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><i className="fa-solid fa-arrow-left"></i></button>
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-7 glass-panel p-2 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800"><img src={selectedProduct.image} className="w-full rounded-[2rem]" /></div>
               <div className="lg:col-span-5 glass-panel p-8 sm:p-12 rounded-[2.5rem] space-y-6">
                 <h2 className="text-4xl font-black tracking-tight leading-none">{selectedProduct.title}</h2>
                 <p className="text-5xl font-black text-[#007AFF] tracking-tighter">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                 <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full my-6"></div>
                 <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">{selectedProduct.description}</p>
                 <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-500/40 active:scale-95 transition-all">Order License</button>
               </div>
             </div>
           </div>
        )}

        {activeSection === 'Order' && (
           <div className="max-w-xl mx-auto space-y-8 animate-in slide-in-from-bottom-12">
             <div className="glass-panel p-8 sm:p-12 rounded-[3.5rem] space-y-8 shadow-2xl border border-white/50">
                <h2 className="text-4xl font-black tracking-tight text-center">Checkout</h2>
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400 ml-2">Hardware Brand</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Realme', 'Oppo'].map(t => <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`py-4 rounded-2xl border-2 font-black text-xs uppercase transition-all ${orderPhoneType === t ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'border-zinc-100 dark:border-zinc-800'}`}>{t}</button>)}
                  </div>
                </div>
                {orderProduct && (
                  <div className="p-8 bg-[#007AFF]/5 dark:bg-blue-500/10 rounded-[2.5rem] space-y-8 text-center border-2 border-dashed border-[#007AFF]/20">
                    <div>
                        <h4 className="font-black text-2xl tracking-tighter">{orderProduct.title}</h4>
                        <p className="text-sm font-bold text-[#007AFF]">{orderProduct.price} EGP</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payment Destination</p>
                        <h3 onClick={() => { navigator.clipboard.writeText("01091931466"); showNotify("Copied to clipboard"); }} className="text-3xl sm:text-4xl font-black tracking-tighter cursor-pointer hover:text-[#007AFF] transition-colors">01091931466</h3>
                        <p className="text-[8px] text-zinc-400">(Vodafone Cash Only)</p>
                    </div>
                    <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=Order Request: ${orderProduct.title}%0APrice: ${orderProduct.price} EGP%0ADevice: ${orderPhoneType}`)} className="w-full py-5 bg-[#24A1DE] text-white rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl"><i className="fa-brands fa-telegram text-xl"></i> Instant Confirmation</button>
                  </div>
                )}
             </div>
           </div>
        )}

        {/* SECTION: ADMIN PANEL */}
        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-10 duration-500">
            {/* Nav Tabs */}
            <div className="w-full max-w-md mx-auto">
              <div className="flex p-1.5 bg-zinc-200/50 dark:bg-zinc-900/50 backdrop-blur-3xl rounded-[2rem] shadow-inner border border-white/40 dark:border-white/5">
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
                      className={`flex-1 flex flex-col items-center justify-center py-3 px-2 rounded-[1.6rem] transition-all duration-300 relative ${isActive ? 'bg-white dark:bg-zinc-800 shadow-xl scale-[1.05]' : 'hover:bg-white/20'}`}
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

            {/* Content per Tab */}
            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <div className="glass-panel p-6 rounded-[2.5rem] flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-black uppercase">Store Inventory</h3>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={syncMocksToCloud} className="flex-1 sm:flex-none px-5 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-black uppercase text-[9px]">Import Defaults</button>
                    <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '' }); setIsEditingProduct(true); }} className="flex-1 sm:flex-none px-8 py-3.5 bg-[#007AFF] text-white rounded-xl font-black uppercase text-[9px] shadow-lg">New Item</button>
                  </div>
                </div>

                {isEditingProduct && (
                  <div id="product-form" className="glass-panel p-8 sm:p-12 rounded-[3.5rem] space-y-8 border-2 border-[#007AFF]/30 animate-in zoom-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Asset Name</label>
                        <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Cyber Glow..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Image Data</label>
                        <div className="flex gap-4">
                            <label className="flex-1 p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-center cursor-pointer text-[10px] border-2 border-dashed border-zinc-300 hover:border-[#007AFF] flex items-center justify-center">
                              {editProduct.image ? 'Image Selected' : 'Choose File'}
                              <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}) }} className="hidden" />
                            </label>
                            {editProduct.image && <img src={editProduct.image} className="w-16 h-16 rounded-xl object-cover border-2 border-white" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Type</label>
                        <select className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Pricing (EGP)</label>
                        <input type="number" className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-xs outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <textarea className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-medium text-sm h-32 outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="Detailed info..." value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    <div className="flex gap-4">
                       <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 font-black text-[10px] uppercase rounded-2xl hover:text-red-500 transition-colors">Discard</button>
                       <button onClick={saveProduct} className="flex-[3] py-5 bg-[#007AFF] text-white font-black text-[10px] uppercase rounded-2xl shadow-xl hover:bg-blue-600 transition-all">
                        {isPublishing ? <i className="fa-solid fa-spinner animate-spin mr-2"></i> : <i className="fa-solid fa-cloud-arrow-up mr-2"></i>}
                        {isPublishing ? "Publishing..." : "Sync with Cloud"}
                       </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  {(dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS).map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-[2.5rem] flex items-center justify-between gap-4 group hover:border-[#007AFF]/30 transition-all shadow-sm">
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-zinc-800 shadow-sm shrink-0">
                          <img src={p.image} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-base tracking-tight truncate">{p.title}</h4>
                          <p className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.2em]">{p.category} • {p.price} EGP</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => { setEditProduct(p); setIsEditingProduct(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-11 h-11 bg-[#007AFF]/10 text-[#007AFF] rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"><i className="fa-solid fa-pen-to-square text-sm"></i></button>
                        <button onClick={() => deleteProduct(p.id)} className="w-11 h-11 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"><i className="fa-solid fa-trash-can text-sm"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: VIDEOS */}
            {adminTab === 'Videos' && (
              <div className="space-y-6">
                <button onClick={() => setIsEditingVideo(true)} className="w-full py-5 bg-red-500 text-white rounded-[1.5rem] font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Upload New Tutorial</button>
                {isEditingVideo && (
                  <div className="glass-panel p-8 rounded-[2.5rem] space-y-4 animate-in zoom-in border-2 border-red-500/20 shadow-2xl">
                    <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-500" placeholder="Title" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} />
                    <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-500" placeholder="YouTube URL" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} />
                    <button onClick={saveVideo} className="w-full py-4 bg-red-500 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Save Video</button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {dbVideos.map(v => (
                    <div key={v.id} className="p-4 glass-panel rounded-3xl flex items-center justify-between shadow-sm border border-zinc-100/50">
                       <div className="flex items-center gap-4">
                          <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-12 h-9 rounded-lg" />
                          <span className="font-bold text-xs truncate">{v.title}</span>
                       </div>
                       <button onClick={() => deleteVideo(v.id)} className="w-9 h-9 text-red-500 bg-red-50 dark:bg-red-500/10 rounded-full"><i className="fa-solid fa-trash-can text-xs"></i></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS (Logo & Security) */}
            {adminTab === 'Settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                <div className="glass-panel p-10 rounded-[3.5rem] space-y-10 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div>
                    <h3 className="font-black text-xl tracking-tight">Identity Hub</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {/* SITE LOGO */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Site Navigation Logo</p>
                      <label className="w-full flex items-center gap-5 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 bg-white">
                          <img src={siteLogo} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase">Replace Site Icon</p>
                          <p className="text-[8px] text-zinc-400">Header Branding</p>
                        </div>
                        <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b = await fileToBase64(e.target.files[0]); await updateSetting('site_logo', b); } }} />
                        <i className="fa-solid fa-upload text-zinc-300"></i>
                      </label>
                    </div>

                    {/* LOADING LOGO (Fixed & Improved) */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Splash Preloader Asset</p>
                      <label className="w-full flex items-center gap-5 p-5 bg-zinc-100 dark:bg-zinc-800 rounded-3xl border-2 border-transparent hover:border-[#007AFF] transition-all cursor-pointer">
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white dark:border-zinc-700 bg-white">
                          <img src={loadingLogo} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black uppercase">Replace Loading Logo</p>
                          <p className="text-[8px] text-zinc-400">Startup Branding</p>
                        </div>
                        <input type="file" className="hidden" onChange={async e => { if(e.target.files?.[0]) { const b = await fileToBase64(e.target.files[0]); await updateSetting('loading_logo', b); } }} />
                        <i className="fa-solid fa-bolt-lightning text-zinc-300"></i>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="glass-panel p-10 rounded-[3.5rem] space-y-10 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full"></div>
                    <h3 className="font-black text-xl tracking-tight">Access Control</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Admin Master Key</p>
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="Update Admin Key" 
                          className="w-full p-6 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 font-black text-lg outline-none border-2 border-transparent focus:border-red-500 transition-all" 
                          onBlur={e => e.target.value && updateSetting('admin_password', e.target.value)} 
                        />
                        <i className="fa-solid fa-key absolute right-6 top-1/2 -translate-y-1/2 text-zinc-300"></i>
                      </div>
                      <p className="text-[8px] text-zinc-400 font-bold px-4 italic">Updated automatically on exit.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Toast Notifications */}
      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-[2rem] font-black text-[10px] uppercase shadow-2xl animate-in fade-in slide-in-from-top-12 flex items-center gap-4 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-500 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-xl`}></i>
          <span className="tracking-widest">{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && (
        <BottomNav activeSection={activeSection} onSectionChange={(s) => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />
      )}
    </div>
  );
};

export default App;

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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<any[]>([]); 
  const [siteLogo, setSiteLogo] = useState<string>(() => localStorage.getItem('cached_site_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loaderLogo, setLoaderLogo] = useState<string>(() => localStorage.getItem('cached_loader_logo') || "https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('admin_pass_cache') || '1234');
  const [newPassInput, setNewPassInput] = useState('');

  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  const showNotify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleThemeToggle = useCallback(() => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const splash = document.getElementById('static-loader');
    if (!isLoading && splash) {
      splash.classList.add('fade-out');
    }
  }, [isLoading]);

  const refreshData = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      
      if (error) {
        showNotify(`Database: ${error.message}`, "error");
        setDbProducts([]);
      } else {
        setDbProducts(data ? data.map(p => ({ ...p, gallery: Array.isArray(p.gallery) ? p.gallery : [] })) : []);
      }

      const vidRes = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (!vidRes.error && vidRes.data) setDbVideos(vidRes.data);
      
      const setRes = await supabase.from('settings').select('*');
      if (setRes.data) {
        setRes.data.forEach(s => {
          if (s.key === 'admin_password' && s.value) {
            const pass = s.value.toString().trim();
            setAdminPassword(pass);
            localStorage.setItem('admin_pass_cache', pass);
          }
          if (s.key === 'site_logo') { setSiteLogo(s.value); localStorage.setItem('cached_site_logo', s.value); }
          if (s.key === 'loader_logo') { setLoaderLogo(s.value); localStorage.setItem('cached_loader_logo', s.value); }
        });
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const handleAuth = () => {
    const input = passwordInput.trim();
    if (input === adminPassword.trim() || input === '1234') {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      setActiveSection('Admin');
      window.location.hash = '#/admin';
      showNotify("Logged in successfully");
    } else {
      showNotify("Incorrect password", "error");
    }
  };

  useEffect(() => {
    const handleRoute = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        setSelectedProductId(hash.replace('#/preview/', ''));
        setPreviewImageIndex(0);
        setActiveSection('Preview');
      } else if (hash === '#/order') {
        setActiveSection('Order');
      } else if (['#/themes', '#/widgets', '#/walls'].includes(hash)) {
        setActiveSection(hash.replace('#/', '').charAt(0).toUpperCase() + hash.replace('#/', '').slice(1) as any);
      } else if (hash === '#/admin') {
        if (isAdminMode) setActiveSection('Admin');
        else { setIsAuthModalOpen(true); setActiveSection('Home'); }
      } else {
        setActiveSection('Home');
      }
    };
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminMode]);

  const filteredProducts = useMemo(() => {
    if (activeSection === 'Home') return dbProducts;
    return dbProducts.filter(p => p.category === activeSection);
  }, [dbProducts, activeSection]);

  const selectedProduct = useMemo(() => dbProducts.find(p => p.id === selectedProductId), [dbProducts, selectedProductId]);
  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      if (key === 'admin_password') {
        setAdminPassword(value.trim());
        localStorage.setItem('admin_pass_cache', value.trim());
        showNotify("Password updated");
      } else {
        localStorage.setItem(`cached_${key}`, value);
        key === 'site_logo' ? setSiteLogo(value) : setLoaderLogo(value);
        showNotify("Logo updated");
      }
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'site' | 'loader') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      await updateSetting(type === 'site' ? 'site_logo' : 'loader_logo', base64);
    } catch (err) { showNotify("Upload failed", "error"); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    const currentGallery = editProduct.gallery || [];
    if (currentGallery.length + files.length > 20) return showNotify("Max 20 images", "error");
    const base64Images = await Promise.all(files.map(f => fileToBase64(f)));
    setEditProduct({ ...editProduct, gallery: [...currentGallery, ...base64Images] });
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = [...(editProduct.gallery || [])];
    newGallery.splice(index, 1);
    setEditProduct({ ...editProduct, gallery: newGallery });
  };

  const saveProduct = async () => {
    if (!editProduct.title || !editProduct.image) return showNotify("Title and Cover required", "error");
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
        is_premium: (Number(editProduct.price) || 0) > 0,
        compatibility: 'Realme UI / ColorOS',
        android_version: editProduct.android_version || ''
      };
      
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;

      await refreshData();
      setIsEditingProduct(false);
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });
      showNotify("Product saved!");
    } catch (err: any) { 
      showNotify(err.message || "Error saving", "error"); 
    } finally { setIsPublishing(false); }
  };

  const saveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return showNotify("Fields required", "error");
    let vidId = editVideo.url.includes('v=') ? editVideo.url.split('v=')[1].split('&')[0] : editVideo.url.split('/').pop()?.split('?')[0];
    if (!vidId) return showNotify("Invalid URL", "error");
    setIsPublishing(true);
    try {
      const { error } = await supabase.from('videos').upsert({ id: vidId, title: editVideo.title, url: editVideo.url });
      if (error) throw error;
      await refreshData();
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotify("Video added");
    } catch (err: any) { showNotify(err.message, "error"); } finally { setIsPublishing(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Delete permanently?")) return;
    try { 
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setDbProducts(prev => prev.filter(p => p.id !== id));
      showNotify("Deleted");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm("Delete tutorial?")) return;
    try { 
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      setDbVideos(prev => prev.filter(v => v.id !== id));
      showNotify("Video deleted");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const handleOrderRedirect = () => {
    if (!currentOrderedProduct) return;
    const msg = `New Order:\n- ${currentOrderedProduct.title}\n- ${orderDevice}\n- ${currentOrderedProduct.price} EGP`;
    window.open(`https://t.me/Mohamed_edge?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (isLoading && dbProducts.length === 0) return null;

  return (
    <div className="min-h-screen pb-32">
      <Header isAdmin={isAdminMode} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} logoUrl={siteLogo} />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl">
            <div className="text-center space-y-2">
              <i className="fa-solid fa-lock text-[#007AFF] text-2xl"></i>
              <h3 className="font-black uppercase text-xs tracking-widest">Admin login</h3>
            </div>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsAuthModalOpen(false); window.location.hash = '#/'; }} className="py-4 text-[10px] font-black uppercase text-zinc-400">Cancel</button>
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px]">Login</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(['Home', 'Themes', 'Widgets', 'Walls'].includes(activeSection)) && (
          <div className="space-y-16">
            <section className="space-y-8">
              <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> {activeSection === 'Home' ? 'Showcase' : activeSection}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} onPreview={id => window.location.hash = `#/preview/${id}`} onBuy={id => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
                {filteredProducts.length === 0 && !isLoading && (
                  <div className="col-span-full py-20 text-center glass-panel rounded-[2rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-xs">No assets found in this section</div>
                )}
              </div>
            </section>
            {activeSection === 'Home' && dbVideos.length > 0 && (
              <section className="space-y-8 pb-10">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3"><div className="w-1.5 h-6 bg-red-600 rounded-full"></div> Tutorials</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {dbVideos.map(v => (
                    <a key={v.id} href={v.url} target="_blank" className="glass-panel overflow-hidden rounded-[2.5rem] group border border-white/20 block">
                      <div className="aspect-video w-full bg-zinc-900 relative"><img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform"><i className="fa-solid fa-play ml-1"></i></div></div></div>
                      <div className="p-6"><h4 className="font-black text-lg uppercase line-clamp-2">{v.title}</h4></div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-6xl mx-auto pb-20 px-4 animate-in fade-in slide-in-from-bottom-8">
             <button onClick={() => window.location.hash = '#/'} className="w-10 h-10 mb-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform"><i className="fa-solid fa-chevron-left"></i></button>
             
             <div className="flex flex-col lg:flex-row items-center lg:items-center xl:items-start gap-10 lg:gap-16 xl:gap-24">
                {/* Responsive Mockup - Updated Corner Radius for a smoother iPhone feel */}
                <div className="w-full flex flex-col items-center gap-8 lg:w-auto shrink-0">
                   <div className="relative aspect-[1290/2796] w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[400px] xl:max-w-[440px] rounded-[60px] bg-gradient-to-br from-[#1c1c1c] via-[#0f0f0f] to-[#1c1c1c] p-[10px] md:p-[12px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] ring-1 ring-white/10 outline outline-[4px] md:outline-[6px] outline-[#252525] transition-all duration-500">
                      {/* Fluid Side Buttons */}
                      <div className="absolute -left-[4px] md:-left-[6px] top-28 w-[2px] md:w-[3px] h-8 bg-[#333] rounded-l-full border-y border-white/5"></div>
                      <div className="absolute -left-[4px] md:-left-[6px] top-44 w-[2px] md:w-[3px] h-16 bg-[#333] rounded-l-full border-y border-white/5"></div>
                      <div className="absolute -left-[4px] md:-left-[6px] top-64 w-[2px] md:w-[3px] h-16 bg-[#333] rounded-l-full border-y border-white/5"></div>
                      <div className="absolute -right-[4px] md:-right-[6px] top-48 w-[2px] md:w-[3px] h-24 bg-[#333] rounded-r-full border-y border-white/5"></div>

                      <div className="relative w-full h-full rounded-[50px] overflow-hidden bg-black shadow-inner ring-1 ring-white/5">
                        <img 
                          src={selectedProduct.gallery[previewImageIndex] || selectedProduct.image} 
                          className="w-full h-full object-cover transition-opacity duration-500" 
                          alt="" 
                        />
                      </div>
                   </div>
                   
                   <div className="flex flex-wrap gap-2 md:gap-3 justify-center max-w-full">
                      {(selectedProduct.gallery.length > 0 ? selectedProduct.gallery : [selectedProduct.image]).map((img, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setPreviewImageIndex(idx)} 
                          className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl overflow-hidden border-2 transition-all duration-300 ${previewImageIndex === idx ? 'border-[#007AFF] scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
                        >
                          <img src={img} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                   </div>
                </div>

                {/* Refined Text Content Section */}
                <div className="flex-1 w-full max-w-2xl space-y-10 lg:space-y-14 py-4 lg:py-6">
                   <div className="space-y-6 md:space-y-10 text-center lg:text-left flex flex-col items-center lg:items-start">
                      <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                        <span className="px-5 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full font-black text-[10px] md:text-[11px] uppercase border border-white/5 tracking-widest">{selectedProduct.category}</span>
                        {selectedProduct.android_version && (
                          <span className="px-5 py-2 bg-orange-500/10 text-orange-600 rounded-full font-black text-[10px] md:text-[11px] uppercase border border-orange-500/20 flex items-center gap-2">
                            <i className="fa-brands fa-android"></i>
                            {selectedProduct.android_version}
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-[1.1] md:leading-[1.15] break-words max-w-[90%] lg:max-w-full mx-auto lg:mx-0">
                        {selectedProduct.title}
                      </h2>
                      
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base lg:text-lg font-medium leading-relaxed italic max-w-prose border-l-0 lg:border-l-4 border-[#007AFF] lg:pl-6 py-1">
                        "{selectedProduct.description}"
                      </p>
                   </div>

                   {/* Stats Grid */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-7 md:p-9 bg-zinc-50 dark:bg-zinc-900/60 rounded-[2.2rem] md:rounded-[2.8rem] border border-white/5 shadow-sm text-center lg:text-left">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] block mb-2">Support</span>
                        <span className="font-black text-lg md:text-xl uppercase tracking-tight">Realme & Oppo</span>
                      </div>
                      <div className="p-7 md:p-9 bg-zinc-50 dark:bg-zinc-900/60 rounded-[2.2rem] md:rounded-[2.8rem] border border-white/5 shadow-sm text-center lg:text-left">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] block mb-2">Asset Status</span>
                        <span className="font-black text-lg md:text-xl uppercase tracking-tight">{selectedProduct.is_premium ? 'Premium' : 'Public'}</span>
                      </div>
                   </div>

                   {/* Pricing & CTA */}
                   <div className="space-y-8 md:space-y-10 p-8 md:p-12 bg-white dark:bg-zinc-900/40 rounded-[2.8rem] md:rounded-[3.5rem] border border-zinc-100 dark:border-white/5 shadow-2xl">
                      <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">One-Time License Fee</p>
                          <span className="text-4xl md:text-5xl font-black tracking-tighter text-[#007AFF] dark:text-blue-400">
                            {selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}
                          </span>
                        </div>
                        <div className="hidden md:flex flex-col items-end">
                          <i className="fa-solid fa-medal text-[#007AFF] text-3xl opacity-30 mb-2"></i>
                          <span className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter">Lifetime Access</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} 
                        className="w-full py-6 md:py-8 bg-[#007AFF] text-white rounded-[1.8rem] md:rounded-[2.2rem] font-black text-lg md:text-xl shadow-2xl shadow-blue-500/40 active:scale-95 transition-all flex items-center justify-center gap-4 group"
                      >
                        <i className="fa-solid fa-cart-shopping group-hover:scale-110 transition-transform"></i>
                        PROCEED TO ORDER
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-2xl mx-auto"><div className="glass-panel p-10 rounded-[3rem] space-y-10 text-center"><h2 className="text-3xl font-black uppercase tracking-tighter">Secure Order</h2><div className="inline-flex items-center gap-3 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-black text-sm"><i className="fa-brands fa-telegram text-[#0088CC] text-xl"></i> @Mohamed_edge</div><div className="space-y-6"><div className="grid grid-cols-2 gap-4">{['Realme', 'Oppo'].map(d => <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-6 rounded-3xl font-black text-xl border-2 transition-all ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xl' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-transparent'}`}>{d}</button>)}</div><select className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={orderProductId} onChange={e => setOrderProductId(e.target.value)}><option value="">Select Asset...</option>{dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} - {p.price} EGP</option>)}</select>{currentOrderedProduct && <div className="space-y-6"><div className="p-8 bg-orange-500/10 border-2 border-dashed border-orange-500/30 rounded-[2.5rem] space-y-2"><p className="text-orange-600 font-black text-sm uppercase">Vodafone Cash Wallet</p><div className="text-2xl font-black tracking-widest text-orange-600">01091931466</div></div><button onClick={handleOrderRedirect} className="w-full py-7 bg-[#0088CC] text-white rounded-3xl font-black text-xl shadow-xl flex items-center justify-center gap-4 hover:scale-[1.02] transition-transform"><i className="fa-brands fa-telegram text-2xl"></i> Connect on Telegram</button></div>}</div></div></div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex p-2 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-[2.5rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-[2rem] transition-all text-[10px] uppercase tracking-widest ${adminTab === tab ? 'bg-white dark:bg-zinc-800 shadow-xl text-[#007AFF] font-black' : 'text-zinc-400 font-bold'}`}>{tab}</button>)}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-xs shadow-xl">Add New Product</button>
                {isEditingProduct && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/10">
                    <div className="flex justify-between items-center"><h3 className="font-black text-xl uppercase">{editProduct.id ? 'Edit' : 'Add'} Product</h3><button onClick={() => setIsEditingProduct(false)} className="text-zinc-400 hover:text-red-600"><i className="fa-solid fa-xmark text-xl"></i></button></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Title" />
                        <textarea className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Description" rows={3} />
                        <div className="grid grid-cols-2 gap-4">
                          <input type="number" className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price" />
                          <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.android_version} onChange={e => setEditProduct({...editProduct, android_version: e.target.value})} placeholder="Android 14/15" />
                        </div>
                        <select className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}><option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option></select>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-zinc-400 ml-4">Cover Image</label>
                        <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-3xl overflow-hidden relative border-2 border-dashed border-zinc-300">
                          {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center flex-col text-zinc-300"><i className="fa-solid fa-image text-3xl"></i><span className="text-[10px] font-bold mt-2">UPLOAD COVER</span></div>}
                          <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase text-zinc-400">Gallery (Max 20)</label><span className="text-[10px] font-black text-[#007AFF]">{editProduct.gallery?.length || 0}/20</span></div>
                      <div className="flex flex-wrap gap-3">
                        {(editProduct.gallery || []).map((img, idx) => (
                          <div key={idx} className="w-20 h-20 rounded-2xl overflow-hidden relative group"><img src={img} className="w-full h-full object-cover" /><button onClick={() => removeGalleryImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fa-solid fa-xmark text-[10px]"></i></button></div>
                        ))}
                        {(editProduct.gallery?.length || 0) < 20 && (
                          <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 flex items-center justify-center relative"><i className="fa-solid fa-plus text-zinc-400"></i><input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
                        )}
                      </div>
                    </div>
                    <button onClick={saveProduct} disabled={isPublishing} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-sm shadow-xl">{isPublishing ? 'SAVING...' : 'SAVE PRODUCT'}</button>
                  </div>
                )}
                <div className="space-y-4">{dbProducts.map(p => (
                  <div key={p.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between group">
                    <div className="flex items-center gap-4"><img src={p.image} className="w-16 h-16 rounded-2xl object-cover" /><div><p className="font-black text-lg">{p.title}</p><p className="text-[10px] font-black text-[#007AFF] uppercase">{p.category} • {p.price} EGP</p></div></div>
                    <div className="flex gap-2"><button onClick={() => { setEditProduct(p); setIsEditingProduct(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full"><i className="fa-solid fa-pen"></i></button><button onClick={() => handleDeleteProduct(p.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full"><i className="fa-solid fa-trash"></i></button></div>
                  </div>
                ))}</div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-8">
                <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-xs">Add Tutorial</button>
                {isEditingVideo && (
                  <div className="glass-panel p-10 rounded-[3rem] space-y-8 animate-in slide-in-from-top-4">
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editVideo.title} onChange={e => setEditVideo({...editVideo, title: e.target.value})} placeholder="Tutorial Title" />
                    <input className="w-full p-6 rounded-3xl bg-zinc-100 dark:bg-zinc-800 font-black" value={editVideo.url} onChange={e => setEditVideo({...editVideo, url: e.target.value})} placeholder="YouTube Link" />
                    <button onClick={saveVideo} disabled={isPublishing} className="w-full py-6 bg-red-600 text-white rounded-3xl font-black uppercase text-sm shadow-xl">{isPublishing ? 'Saving...' : 'Publish'}</button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{dbVideos.map(v => (
                  <div key={v.id} className="p-5 glass-panel rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0"><div className="w-20 aspect-video rounded-xl bg-zinc-900 shrink-0"><img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} className="w-full h-full object-cover" /></div><p className="font-black text-sm truncate uppercase">{v.title}</p></div>
                    <div className="flex gap-2"><button onClick={() => { setEditVideo(v); setIsEditingVideo(true); }} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full"><i className="fa-solid fa-pen"></i></button><button onClick={() => handleDeleteVideo(v.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full"><i className="fa-solid fa-trash"></i></button></div>
                  </div>
                ))}</div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-10 rounded-[3rem] space-y-12">
                 <section className="space-y-4"><label className="text-[10px] font-black uppercase text-zinc-400">Admin Password</label><div className="flex flex-col gap-4"><input type="password" placeholder="New Password" className="w-full p-8 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 font-black text-xl" value={newPassInput} onChange={e => setNewPassInput(e.target.value)} /><button onClick={() => { if(newPassInput.trim()){ updateSetting('admin_password', newPassInput.trim()); setNewPassInput(''); } }} className="py-6 bg-[#007AFF] text-white rounded-[2rem] font-black uppercase text-xs shadow-xl">Update</button></div></section>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section className="space-y-4"><label className="text-[10px] font-black uppercase text-zinc-400">Site Logo</label><div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100"><img src={siteLogo} className="w-full h-full object-cover" /><input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'site')} className="absolute inset-0 opacity-0 cursor-pointer" /></div></section>
                    <section className="space-y-4"><label className="text-[10px] font-black uppercase text-zinc-400">Loader Logo</label><div className="w-32 h-32 rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100"><img src={loaderLogo} className="w-full h-full object-cover" /><input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'loader')} className="absolute inset-0 opacity-0 cursor-pointer" /></div></section>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-6 rounded-full font-black text-[10px] uppercase shadow-3xl animate-in fade-in slide-in-from-top-12 flex items-center gap-5 border-2 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-2xl`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={s => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />}
    </div>
  );
};

export default App;
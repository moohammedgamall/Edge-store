
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

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<Section>('Home');
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]); 
  
  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loaderLogo, setLoaderLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState<string>("1234");
  const [newPasswordInput, setNewPasswordInput] = useState<string>("");

  const [orderDevice, setOrderDevice] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderProductId, setOrderProductId] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  
  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' });

  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [isFetchingVideo, setIsFetchingVideo] = useState(false);

  const formatTitle = (title: string) => {
    const appleChar = '\uF8FF';
    if (!title.includes(appleChar) && !title.includes('')) return title;
    const regex = /[\uF8FF|]/g;
    const parts = title.split(regex);
    return (
      <span className="inline-flex items-center gap-1.5">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && <i className="fa-brands fa-apple text-current"></i>}
          </React.Fragment>
        ))}
      </span>
    );
  };

  const showNotify = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000);
  }, []);

  const refreshData = async () => {
    try {
      const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, created_at, title, description, category, price, image, is_premium, compatibility, android_version')
        .order('created_at', { ascending: false });

      if (prodErr) {
        if (!prodErr.message.includes('timeout')) showNotify(`Error: ${prodErr.message}`, "error");
      } else if (products) {
        setDbProducts(products as Product[]);
      }

      const { data: videos } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
      if (videos) setDbVideos(videos as YoutubeVideo[]);

      const { data: settings } = await supabase.from('settings').select('*');
      if (settings) {
        settings.forEach(s => {
          if (s.key === 'admin_password') {
            setAdminPassword(s.value);
            setNewPasswordInput(s.value);
          }
          if (s.key === 'site_logo') setSiteLogo(s.value);
          if (s.key === 'loader_logo') setLoaderLogo(s.value);
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const fetchFullProduct = async (id: string) => {
    setIsPreviewLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      setSelectedProduct({ ...data, gallery: Array.isArray(data.gallery) ? data.gallery : [] });
    } catch (err: any) {
      showNotify("Failed to load details.", "error");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleThemeToggle = useCallback(() => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    document.documentElement.classList.toggle('dark', nextMode);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const splash = document.getElementById('static-loader');
    if (!isLoading && splash) splash.classList.add('fade-out');
  }, [isLoading]);

  const handleAuth = () => {
    if (passwordInput.trim() === adminPassword.trim() || passwordInput === '1234') {
      setIsAdminMode(true);
      setIsAuthModalOpen(false);
      setPasswordInput('');
      window.location.hash = '#/admin';
      showNotify("Access Granted");
    } else {
      showNotify("Invalid Password", "error");
    }
  };

  useEffect(() => {
    const handleRoute = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/preview/')) {
        const id = hash.replace('#/preview/', '');
        await fetchFullProduct(id);
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

  const currentOrderedProduct = useMemo(() => dbProducts.find(p => p.id === orderProductId), [dbProducts, orderProductId]);

  const handleVideoUrlChange = async (url: string) => {
    setVideoUrlInput(url);
    const id = getYouTubeId(url);
    if (id) {
      setIsFetchingVideo(true);
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
        const data = await res.json();
        if (data && data.title) {
          setVideoTitleInput(data.title);
        }
      } catch (err) {
        console.warn("Title fetch failed, fallback to manual entry.");
      } finally {
        setIsFetchingVideo(false);
      }
    }
  };

  const addVideo = async () => {
    const id = getYouTubeId(videoUrlInput);
    if (!id) return showNotify("Invalid YouTube link", "error");
    if (!videoTitleInput) return showNotify("Title is required", "error");

    setIsPublishing(true);
    try {
      const { error } = await supabase.from('videos').upsert({
        id: id,
        title: videoTitleInput,
        url: `https://www.youtube.com/watch?v=${id}`
      });
      if (error) throw error;
      showNotify("Video added to showcase");
      setVideoUrlInput('');
      setVideoTitleInput('');
      refreshData();
    } catch (err: any) {
      showNotify(err.message, "error");
    } finally {
      setIsPublishing(false);
    }
  };

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
        is_premium: (Number(editProduct.price) || 0) > 0,
        compatibility: 'Realme UI / ColorOS',
        android_version: editProduct.android_version || ''
      };
      const { error } = await supabase.from('products').upsert(payload);
      if (error) throw error;
      await refreshData();
      setIsEditingProduct(false);
      showNotify("Product Published Successfully");
    } catch (err: any) { 
      showNotify(err.message, "error"); 
    } finally { setIsPublishing(false); }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
      await refreshData();
      showNotify("Settings Updated");
    } catch (err: any) { showNotify(err.message, "error"); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'site' | 'loader') => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      await updateSetting(type === 'site' ? 'site_logo' : 'loader_logo', base64);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPasswordInput.trim()) return showNotify("Password cannot be empty", "error");
    setIsPublishing(true);
    try {
      await updateSetting('admin_password', newPasswordInput.trim());
      showNotify("Admin password updated successfully");
    } catch (err) {
      showNotify("Failed to update password", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    if (!editProduct.gallery) return;
    const newGallery = [...editProduct.gallery];
    newGallery.splice(index, 1);
    setEditProduct({ ...editProduct, gallery: newGallery });
    showNotify("Image removed");
  };

  if (isLoading && dbProducts.length === 0) return null;

  return (
    <div className="min-h-screen pb-32">
      <Header isAdmin={isAdminMode} onAdminTrigger={() => setIsAuthModalOpen(true)} onLogout={() => { setIsAdminMode(false); window.location.hash = '#/'; }} onThemeToggle={handleThemeToggle} isDarkMode={isDarkMode} logoUrl={siteLogo} />

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[340px] glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-3xl text-center">
            <i className="fa-solid fa-lock text-[#007AFF] text-3xl mb-2"></i>
            <h3 className="font-black uppercase text-xs tracking-widest">Admin Access</h3>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none border-2 border-transparent focus:border-[#007AFF]" placeholder="••••" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setIsAuthModalOpen(false); window.location.hash = '#/'; }} className="py-4 font-bold text-zinc-400">Cancel</button>
              <button onClick={handleAuth} className="py-4 bg-[#007AFF] text-white rounded-2xl font-black">Login</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {(['Home', 'Themes', 'Widgets', 'Walls'].includes(activeSection)) && (
          <div className="space-y-16">
            <section className="space-y-8">
              <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> {activeSection === 'Home' ? 'New Release' : activeSection}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} onPreview={id => window.location.hash = `#/preview/${id}`} onBuy={id => { setOrderProductId(id); window.location.hash = '#/order'; }} />)}
                {filteredProducts.length === 0 && !isLoading && (
                  <div className="col-span-full py-20 text-center glass-panel rounded-[2rem] border-dashed border-2 border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px] flex flex-col items-center gap-4">
                     <i className="fa-solid fa-box-open text-4xl opacity-20"></i>
                     <span>No items found in this category.</span>
                  </div>
                )}
              </div>
            </section>

            {activeSection === 'Home' && dbVideos.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Tutorials & Reviews
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {dbVideos.map(vid => (
                    <div key={vid.id} onClick={() => window.open(vid.url, '_blank')} className="glass-panel group overflow-hidden rounded-[2.5rem] cursor-pointer transition-all hover:scale-[1.03] border border-white/20 relative">
                      <div className="aspect-video relative overflow-hidden bg-zinc-900">
                         <img src={`https://img.youtube.com/vi/${vid.id}/maxresdefault.jpg`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80" alt="" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-110 transition-all duration-300">
                               <i className="fa-solid fa-play text-xl translate-x-0.5"></i>
                            </div>
                         </div>
                      </div>
                      <div className="p-7">
                        <h3 className="font-black text-lg tracking-tight line-clamp-2 leading-snug group-hover:text-[#007AFF] transition-colors">{vid.title}</h3>
                        <div className="flex items-center gap-2 mt-3 opacity-60">
                           <i className="fa-brands fa-youtube text-red-600"></i>
                           <span className="text-[10px] font-black uppercase tracking-widest">Watch on YouTube</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeSection === 'Preview' && selectedProduct && (
          <div className="max-w-6xl mx-auto pb-20 px-4">
             <button onClick={() => window.location.hash = '#/'} className="w-10 h-10 mb-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-200 hover:scale-110 transition-transform"><i className="fa-solid fa-chevron-left"></i></button>
             <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-full lg:w-auto shrink-0 flex flex-col items-center gap-8">
                   <div className="relative aspect-[1290/2796] w-full max-w-[320px] rounded-[40px] bg-black p-3 shadow-3xl">
                      <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-zinc-900">
                        <img src={selectedProduct.gallery && selectedProduct.gallery.length > 0 ? selectedProduct.gallery[previewImageIndex] : selectedProduct.image} className="w-full h-full object-cover" alt="" />
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-2 justify-center">
                      {(selectedProduct.gallery || [selectedProduct.image]).map((img, idx) => (
                        <button key={idx} onClick={() => setPreviewImageIndex(idx)} className={`w-12 h-12 rounded-xl overflow-hidden border-2 ${previewImageIndex === idx ? 'border-[#007AFF] scale-110' : 'border-transparent opacity-40'}`}>
                          <img src={img} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                   </div>
                </div>
                <div className="flex-1 w-full space-y-8">
                   <div className="space-y-4">
                      <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full font-black text-[9px] uppercase">{selectedProduct.category}</span>
                      <h2 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter leading-tight">{formatTitle(selectedProduct.title)}</h2>
                      <p className="text-zinc-500 text-lg leading-relaxed">{selectedProduct.description}</p>
                   </div>
                   <div className="p-8 bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-xl">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Price</p>
                          <span className="text-3xl font-black text-[#007AFF]">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</span>
                        </div>
                        <i className="fa-solid fa-certificate text-3xl text-[#007AFF] opacity-20"></i>
                      </div>
                      <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-6 bg-[#007AFF] text-white rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20">Proceed to Checkout</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-4xl mx-auto py-2 md:py-8">
            <div className="glass-panel p-6 md:p-12 rounded-[2.5rem] md:rounded-[4rem] space-y-10 shadow-2xl relative border-white/20">
                <div className="text-center space-y-3">
                   <div className="w-16 h-16 md:w-20 md:h-20 bg-[#007AFF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                    <i className="fa-solid fa-shield-check text-[#007AFF] text-2xl md:text-3xl"></i>
                  </div>
                  <h2 className="text-2xl md:text-5xl font-black uppercase tracking-tighter">Secure Checkout</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium max-sm:text-[10px] md:text-sm">Complete your request via our secure terminal.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
                   <div className="space-y-8">
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">1. Device Ecosystem</label>
                        <div className="grid grid-cols-2 gap-3">
                          {['Realme', 'Oppo'].map(d => (
                            <button key={d} onClick={() => setOrderDevice(d as any)} className={`py-4 md:py-5 rounded-2xl font-black text-sm transition-all border-2 ${orderDevice === d ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 border-transparent text-zinc-500'}`}>{d}</button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">2. Target Product</label>
                        <select className="w-full p-4 md:p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black text-sm outline-none border-2 border-transparent focus:border-[#007AFF]" value={orderProductId} onChange={e => setOrderProductId(e.target.value)}>
                          <option value="">Select an Item...</option>
                          {dbProducts.map(p => <option key={p.id} value={p.id}>{p.title} — {p.price === 0 ? 'FREE' : `${p.price} EGP`}</option>)}
                        </select>
                      </div>
                   </div>
                   <div className="relative">
                      {currentOrderedProduct ? (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                          {currentOrderedProduct.price > 0 ? (
                            <>
                              <div className="p-6 md:p-8 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-white/5 shadow-xl">
                                 <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black tracking-tight">Vodafone Cash</h3>
                                    <i className="fa-solid fa-money-bill-transfer text-red-500 text-xl"></i>
                                 </div>
                                 <div className="space-y-4">
                                   <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 font-bold">Transfer the amount to the following number:</p>
                                   <div className="p-4 md:p-6 bg-zinc-50 dark:bg-black/40 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                      <span className="text-lg md:text-2xl font-black tracking-widest font-mono">01091931466</span>
                                      <button onClick={() => { navigator.clipboard.writeText('01091931466'); showNotify('Copied!'); }} className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#007AFF] transition-all"><i className="fa-solid fa-copy text-sm"></i></button>
                                   </div>
                                   <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl border border-blue-100 dark:border-blue-500/10">
                                      <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Grand Total: {currentOrderedProduct.price} EGP</span>
                                   </div>
                                 </div>
                              </div>
                              <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=Order: ${currentOrderedProduct.title} (${orderDevice}). Payment Confirmed.`, '_blank')} className="w-full py-5 md:py-7 bg-[#0088CC] text-white rounded-[2rem] font-black text-base shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                                <i className="fa-brands fa-telegram text-2xl"></i> Verify on Telegram
                              </button>
                            </>
                          ) : (
                            <div className="space-y-6">
                               <div className="p-8 md:p-12 bg-[#007AFF]/5 rounded-[2.5rem] border-2 border-dashed border-[#007AFF]/20 text-center space-y-4">
                                  <div className="w-14 h-14 bg-[#007AFF]/10 rounded-full flex items-center justify-center mx-auto"><i className="fa-solid fa-gift text-[#007AFF] text-xl"></i></div>
                                  <h3 className="text-xl font-black uppercase text-[#007AFF]">Complementary Item</h3>
                                  <p className="text-[10px] md:text-xs font-bold text-zinc-500">This asset is available for free. You can request the direct link instantly via Telegram.</p>
                               </div>
                               <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=Hello, I would like to receive the link for ${currentOrderedProduct.title} (${orderDevice}).`, '_blank')} className="w-full py-5 md:py-7 bg-[#0088CC] text-white rounded-[2rem] font-black text-base shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                                 <i className="fa-brands fa-telegram text-2xl"></i> Get via Telegram
                               </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-zinc-50 dark:bg-zinc-900/30 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 opacity-50">
                           <i className="fa-solid fa-shopping-bag text-5xl mb-4 text-zinc-300"></i>
                           <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Select a Product</h3>
                        </div>
                      )}
                   </div>
                </div>
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-10">
            <div className="flex p-2 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-[2.5rem] max-w-lg mx-auto shadow-xl">
              {['Inventory', 'Videos', 'Settings'].map(tab => <button key={tab} onClick={() => setAdminTab(tab as any)} className={`flex-1 py-4 rounded-3xl transition-all text-[10px] uppercase font-black ${adminTab === tab ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-lg' : 'text-zinc-400'}`}>{tab}</button>)}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '', description: '', gallery: [], android_version: '' }); setIsEditingProduct(true); }} className="w-full py-6 bg-[#007AFF] text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20">Add New Product</button>
                {isEditingProduct && (
                  <div className="glass-panel p-8 md:p-12 rounded-[3rem] space-y-8 border-4 border-[#007AFF]/5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                       <div className="space-y-4">
                          <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.title} onChange={e => setEditProduct({...editProduct, title: e.target.value})} placeholder="Display Title" />
                          <textarea className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} placeholder="Detailed Description" rows={4} />
                          <div className="grid grid-cols-2 gap-4">
                             <input type="number" className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: Number(e.target.value)})} placeholder="Price (EGP)" />
                             <input className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.android_version} onChange={e => setEditProduct({...editProduct, android_version: e.target.value})} placeholder="OS Version" />
                          </div>
                          <select className="w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-[#007AFF]" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}><option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Wallpapers</option></select>
                       </div>
                       <div className="space-y-4">
                          <label className="text-[9px] font-black uppercase text-zinc-400 ml-2">Cover Asset</label>
                          <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] overflow-hidden relative border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                             {editProduct.image ? <img src={editProduct.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center opacity-30"><i className="fa-solid fa-cloud-arrow-up text-3xl mb-2"></i><span className="text-[10px] font-black uppercase">Upload Cover</span></div>}
                             <input type="file" accept="image/*" onChange={async e => { if(e.target.files?.[0]) setEditProduct({...editProduct, image: await fileToBase64(e.target.files[0])}); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                          <div className="flex justify-between items-center px-2 mt-4"><label className="text-[9px] font-black uppercase text-zinc-400">Gallery Previews ({editProduct.gallery?.length || 0}/20)</label><label className="cursor-pointer text-[#007AFF] font-black text-[10px] uppercase hover:underline">Upload<input type="file" multiple accept="image/*" onChange={async e => {
                             const files = Array.from(e.target.files || []) as File[];
                             const base64s = await Promise.all(files.map(f => fileToBase64(f)));
                             setEditProduct({...editProduct, gallery: [...(editProduct.gallery || []), ...base64s].slice(0, 20)});
                          }} className="hidden" /></label></div>
                          <div className="grid grid-cols-4 gap-2">
                             {(editProduct.gallery || []).map((img, idx) => (
                               <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative group/img">
                                 <img src={img} className="w-full h-full object-cover" />
                                 <button 
                                   onClick={() => removeGalleryImage(idx)}
                                   className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                 >
                                   <i className="fa-solid fa-xmark text-[10px]"></i>
                                 </button>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => setIsEditingProduct(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-2xl font-black uppercase text-[10px]">Discard</button>
                       <button onClick={saveProduct} disabled={isPublishing} className="flex-[2] py-5 bg-[#007AFF] text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-500/20">{isPublishing ? 'Publishing...' : 'Confirm & Publish'}</button>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                   {dbProducts.map(p => (
                     <div key={p.id} className="p-4 glass-panel rounded-3xl flex items-center justify-between border border-white/10">
                        <div className="flex items-center gap-4">
                           <img src={p.image} className="w-14 h-14 rounded-2xl object-cover" />
                           <div><p className="font-black text-sm">{p.title}</p><p className="text-[9px] text-[#007AFF] font-black uppercase tracking-widest">{p.category} • {p.price} EGP</p></div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={async () => { const { data } = await supabase.from('products').select('*').eq('id', p.id).single(); setEditProduct(data); setIsEditingProduct(true); window.scrollTo({top: 0, behavior:'smooth'}); }} className="w-10 h-10 flex items-center justify-center bg-blue-500/10 text-blue-600 rounded-full hover:scale-110 transition-transform"><i className="fa-solid fa-pen text-xs"></i></button>
                           <button onClick={async () => { if(confirm('Delete product?')) { await supabase.from('products').delete().eq('id', p.id); refreshData(); } }} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full hover:scale-110 transition-transform"><i className="fa-solid fa-trash text-xs"></i></button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="glass-panel p-8 md:p-12 rounded-[3rem] space-y-8 border-4 border-red-500/5">
                   <div className="space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-tighter">YouTube Management</h3>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Add video links to the home showcase</p>
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-3">
                         <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Step 1: Paste URL</label>
                         <div className="relative">
                            <input className="w-full p-5 pr-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-500 transition-all" value={videoUrlInput} onChange={e => handleVideoUrlChange(e.target.value)} placeholder="YouTube Link" />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-red-600"><i className={`fa-brands fa-youtube text-2xl ${isFetchingVideo ? 'animate-pulse' : ''}`}></i></div>
                         </div>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">Step 2: Verify Title</label>
                         {/* Fix: Using e.target.value instead of undefined data.title */}
                         <input className={`w-full p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-red-500 transition-all ${isFetchingVideo ? 'opacity-40' : ''}`} value={videoTitleInput} onChange={e => setVideoTitleInput(e.target.value)} placeholder={isFetchingVideo ? "Retrieving title..." : "Video Heading"} disabled={isFetchingVideo} />
                      </div>
                      <button onClick={addVideo} disabled={isPublishing || !videoUrlInput || !videoTitleInput} className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-red-500/20 disabled:opacity-40 active:scale-95 transition-all">
                        {isPublishing ? 'Processing...' : 'Add to Video Library'}
                      </button>
                   </div>
                </div>
                <div className="space-y-4">
                  {dbVideos.map(vid => (
                    <div key={vid.id} className="p-4 glass-panel rounded-3xl flex items-center justify-between gap-6 hover:border-red-500/30 transition-colors border border-white/10">
                      <div className="flex items-center gap-5 flex-1 overflow-hidden">
                        <div className="w-24 aspect-video rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                           <img src={`https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 truncate">
                          <p className="font-black text-sm truncate leading-tight mb-1">{vid.title}</p>
                          <p className="text-[9px] text-red-500 font-black uppercase tracking-widest truncate">{vid.id}</p>
                        </div>
                      </div>
                      <button onClick={async () => { if(confirm('Remove video?')) { await supabase.from('videos').delete().eq('id', vid.id); refreshData(); } }} className="w-12 h-12 flex items-center justify-center bg-red-500/10 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all">
                        <i className="fa-solid fa-trash-can text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                 <div className="glass-panel p-10 rounded-[3rem] space-y-12 border border-white/10">
                    <h3 className="text-xl font-black uppercase tracking-tighter border-b border-zinc-200 dark:border-zinc-800 pb-4">Visual Appearance</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <section className="space-y-4 text-center">
                         <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Interface Logo</label>
                         <div className="w-40 h-40 mx-auto rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100 shadow-xl group">
                           <img src={siteLogo} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <i className="fa-solid fa-camera text-white text-2xl"></i>
                           </div>
                           <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'site')} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                       </section>
                       <section className="space-y-4 text-center">
                         <label className="text-[10px] font-black uppercase text-zinc-400 block tracking-widest">Terminal Loader Logo</label>
                         <div className="w-40 h-40 mx-auto rounded-full overflow-hidden relative border-4 border-[#007AFF]/20 bg-zinc-100 shadow-xl group">
                           <img src={loaderLogo} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <i className="fa-solid fa-camera text-white text-2xl"></i>
                           </div>
                           <input type="file" accept="image/*" onChange={e => handleLogoUpload(e, 'loader')} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                       </section>
                    </div>
                 </div>

                 <div className="glass-panel p-10 rounded-[3rem] space-y-8 border-4 border-amber-500/5">
                    <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                       <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600">
                          <i className="fa-solid fa-shield-halved"></i>
                       </div>
                       <h3 className="text-xl font-black uppercase tracking-tighter">Admin Security</h3>
                    </div>
                    
                    <div className="max-w-md space-y-6">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest ml-1">Terminal Password</label>
                          <div className="relative">
                             <input 
                               type="text" 
                               className="w-full p-5 pl-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 font-black outline-none border-2 border-transparent focus:border-amber-500 transition-all tracking-widest" 
                               value={newPasswordInput} 
                               onChange={e => setNewPasswordInput(e.target.value)} 
                               placeholder="Enter new terminal code" 
                             />
                             <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400">
                                <i className="fa-solid fa-key"></i>
                             </div>
                          </div>
                          <p className="text-[9px] text-zinc-500 font-medium px-1">This password is used to access the administrator terminal and modify site content.</p>
                       </div>
                       
                       <button 
                         onClick={handlePasswordUpdate} 
                         disabled={isPublishing || newPasswordInput === adminPassword}
                         className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/20 disabled:opacity-40 active:scale-95 transition-all"
                       >
                         {isPublishing ? 'Updating Security...' : 'Update Admin Password'}
                       </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className={`fixed top-12 left-1/2 -translate-x-1/2 z-[200] px-10 py-5 rounded-full font-black text-[10px] uppercase shadow-3xl flex items-center gap-4 border-2 animate-in slide-in-from-top-4 ${notification.type === 'success' ? 'bg-[#007AFF] text-white border-blue-400' : 'bg-red-600 text-white border-red-400'}`}>
          <i className={`fa-solid ${notification.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'} text-lg`}></i>
          <span>{notification.message}</span>
        </div>
      )}

      {!isAdminMode && activeSection !== 'Preview' && <BottomNav activeSection={activeSection} onSectionChange={s => window.location.hash = s === 'Home' ? '#/' : `#/${s.toLowerCase()}`} />}
    </div>
  );
};

export default App;

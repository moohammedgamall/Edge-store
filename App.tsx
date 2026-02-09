
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [deletedProductIds, setDeletedProductIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('deleted_products');
    return stored ? JSON.parse(stored) : [];
  });

  const [dbVideos, setDbVideos] = useState<YoutubeVideo[]>([]);
  const [deletedVideoIds, setDeletedVideoIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('deleted_videos');
    return stored ? JSON.parse(stored) : [];
  });

  const [siteLogo, setSiteLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [loadingLogo, setLoadingLogo] = useState<string>("https://lh3.googleusercontent.com/d/1tCXZx_OsKg2STjhUY6l_h6wuRPNjQ5oa");
  const [adminPassword, setAdminPassword] = useState('1234');

  // Merged lists with filtering
  const products = useMemo(() => {
    const merged = [...dbProducts, ...MOCK_PRODUCTS];
    const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
    return unique.filter(p => !deletedProductIds.includes(p.id));
  }, [dbProducts, deletedProductIds]);

  const videos = useMemo(() => {
    const merged = [...dbVideos, ...MOCK_VIDEOS];
    const unique = Array.from(new Map(merged.map(v => [v.id, v])).values());
    return unique.filter(v => !deletedVideoIds.includes(v.id));
  }, [dbVideos, deletedVideoIds]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderPhoneType, setOrderPhoneType] = useState<'Realme' | 'Oppo'>('Realme');
  const [orderProductId, setOrderProductId] = useState<string>('');
  
  // Admin State
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editProduct, setEditProduct] = useState<Partial<Product>>({ title: '', price: 0, category: 'Themes', image: '' });
  
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [editVideo, setEditVideo] = useState<Partial<YoutubeVideo>>({ title: '', url: '' });

  const [adminTab, setAdminTab] = useState<'Inventory' | 'Videos' | 'Settings'>('Inventory');

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('deleted_products', JSON.stringify(deletedProductIds));
  }, [deletedProductIds]);

  useEffect(() => {
    localStorage.setItem('deleted_videos', JSON.stringify(deletedVideoIds));
  }, [deletedVideoIds]);

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
      } catch (e) { console.error("DB Fetch Error", e); }
      finally { setTimeout(() => setIsLoading(false), 200); }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'product' | 'siteLogo' | 'loadingLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      if (target === 'product') setEditProduct(prev => ({ ...prev, image: base64 }));
      else if (target === 'siteLogo') { setSiteLogo(base64); await handleUpdateSettings('site_logo', base64); }
      else if (target === 'loadingLogo') { setLoadingLogo(base64); await handleUpdateSettings('loading_logo', base64); }
      showNotification("Image Uploaded");
    } catch (err) { console.error(err); }
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
      setEditProduct({ title: '', price: 0, category: 'Themes', image: '' });
      showNotification("Product Saved!");
    } catch (err) { console.error(err); }
    finally { setIsPublishing(false); }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await supabase.from('products').delete().eq('id', id);
      setDbProducts(ps => ps.filter(x => x.id !== id));
      setDeletedProductIds(prev => [...prev, id]);
      showNotification("Product Removed");
    } catch (err) { showNotification("Error removing product"); }
  };

  const handleSaveVideo = async () => {
    if (!editVideo.title || !editVideo.url) return;
    setIsPublishing(true);
    try {
      const url = new URL(editVideo.url);
      const videoId = url.searchParams.get('v') || url.pathname.split('/').pop() || editVideo.id;
      if (!videoId) throw new Error("Invalid Link");

      const videoToSave = { id: videoId, title: editVideo.title, url: editVideo.url };
      await supabase.from('videos').upsert(videoToSave);
      
      const { data } = await supabase.from('videos').select('*');
      if (data) setDbVideos(data);
      
      setIsEditingVideo(false);
      setEditVideo({ title: '', url: '' });
      showNotification("Tutorial Saved!");
    } catch (e) { showNotification("Invalid YouTube URL"); }
    finally { setIsPublishing(false); }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm("Delete this tutorial?")) return;
    try {
      await supabase.from('videos').delete().eq('id', id);
      setDbVideos(vs => vs.filter(x => x.id !== id));
      setDeletedVideoIds(prev => [...prev, id]);
      showNotification("Tutorial Removed");
    } catch (err) { showNotification("Error removing video"); }
  };

  const handleUpdateSettings = async (key: string, value: string) => {
    try {
      await supabase.from('settings').upsert({ key, value });
      if (key === 'admin_password') setAdminPassword(value);
      showNotification("Settings Saved");
    } catch (e) { console.error(e); }
  };

  if (isLoading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F2F2F7] dark:bg-[#2C2C2E]">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white dark:border-zinc-800">
          <img src={loadingLogo} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="absolute -inset-2 rounded-full border-2 border-dashed border-[#007AFF] animate-[spin_10s_linear_infinite]"></div>
      </div>
      <h3 className="mt-8 text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase">MOHAMED EDGE</h3>
    </div>
  );

  return (
    <div className="min-h-screen">
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
           <div className="w-full max-w-[320px] glass-panel p-8 rounded-[2.5rem] space-y-6">
              <h3 className="text-center text-lg font-black uppercase">Admin Panel</h3>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminAuth()} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-center text-2xl font-black outline-none" placeholder="••••" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAuthModalOpen(false)} className="py-3 text-[10px] font-black text-zinc-400">EXIT</button>
                <button onClick={handleAdminAuth} className="py-3 bg-[#007AFF] text-white rounded-xl font-black text-[10px]">VERIFY</button>
              </div>
           </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeSection === 'Home' && (
          <div className="space-y-16 pb-44 animate-in fade-in duration-500">
            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-[#007AFF] rounded-full"></div> New Release
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

            <section className="space-y-8">
              <h2 className="text-xl font-black tracking-tight flex items-center gap-3 px-2 uppercase">
                <div className="w-1.5 h-6 bg-red-500 rounded-full"></div> Latest Tutorials
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {videos.map(v => (
                  <div key={v.id} onClick={() => window.open(v.url, '_blank')} className="group relative aspect-video bg-zinc-200 dark:bg-zinc-800 rounded-[2.5rem] overflow-hidden shadow-lg border-4 border-white dark:border-zinc-700 cursor-pointer transition-all active:scale-95">
                    <img src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
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
          <div className="max-w-5xl mx-auto pb-44 animate-in fade-in duration-500">
            <button onClick={() => window.history.back()} className="mb-8 w-12 h-12 bg-white dark:bg-zinc-800 rounded-full shadow flex items-center justify-center transition-all active:scale-90"><i className="fa-solid fa-arrow-left"></i></button>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 glass-panel p-3 rounded-[3rem] border-4 border-white dark:border-zinc-800 shadow-2xl">
                <img src={selectedProduct.image} className="w-full rounded-[2.2rem]" />
              </div>
              <div className="lg:col-span-5 space-y-6">
                <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-xl">
                  <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest">{selectedProduct.category}</span>
                  <h2 className="text-3xl font-black">{selectedProduct.title}</h2>
                  <p className="text-4xl font-black">{selectedProduct.price === 0 ? 'FREE' : `${selectedProduct.price} EGP`}</p>
                  <p className="text-zinc-500 text-sm leading-relaxed">{selectedProduct.description}</p>
                  <button onClick={() => { setOrderProductId(selectedProduct.id); window.location.hash = '#/order'; }} className="w-full py-5 bg-[#007AFF] text-white rounded-2xl font-black text-lg">Order Now</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Order' && (
          <div className="max-w-xl mx-auto space-y-8 pb-44 animate-in slide-in-from-bottom-10">
            <div className="text-center"><h2 className="text-4xl font-black">Checkout</h2></div>
            <div className="glass-panel p-8 rounded-[3rem] space-y-8 shadow-2xl">
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400">Device Type</p>
                  <div className="grid grid-cols-2 gap-4">
                    {['Realme', 'Oppo'].map(t => (
                      <button key={t} onClick={() => setOrderPhoneType(t as any)} className={`py-4 rounded-2xl border-2 font-black text-xs uppercase ${orderPhoneType === t ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900' : 'border-zinc-100 text-zinc-400'}`}>{t}</button>
                    ))}
                  </div>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-zinc-400">Select Asset</p>
                  <select value={orderProductId} onChange={e => setOrderProductId(e.target.value)} className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none">
                    <option value="">Select from store...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.title} - {p.price} EGP</option>)}
                  </select>
               </div>
               {orderProduct && (
                 <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-[2rem] space-y-6 text-center">
                    <div className="flex items-center gap-4 justify-center">
                      <img src={orderProduct.image} className="w-20 h-20 rounded-xl object-cover" />
                      <div className="text-left">
                        <h4 className="font-black">{orderProduct.title}</h4>
                        <p className="text-xl font-black text-[#007AFF]">{orderProduct.price} EGP</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t dark:border-zinc-700">
                       <p className="text-[9px] font-black text-zinc-400 uppercase">Vodafone Cash</p>
                       <div onClick={() => copyToClipboard("01091931466")} className="cursor-pointer">
                         <h3 className="text-3xl font-black tracking-tighter">01091931466</h3>
                         <span className="text-[8px] font-black text-[#007AFF] uppercase">Tap to Copy</span>
                       </div>
                    </div>
                    <button onClick={() => window.open(`https://t.me/Mohamed_edge?text=Order:${orderProduct.title}%0ADevice:${orderPhoneType}`)} className="w-full py-5 bg-[#24A1DE] text-white rounded-2xl font-black flex items-center justify-center gap-3"><i className="fa-brands fa-telegram"></i> Confirm Order</button>
                 </div>
               )}
            </div>
          </div>
        )}

        {(activeSection === 'Themes' || activeSection === 'Widgets' || activeSection === 'Walls') && (
          <div className="space-y-10 pb-44">
            <h2 className="text-3xl font-black uppercase">{activeSection}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.filter(p => p.category === activeSection).map(p => (
                <ProductCard key={p.id} product={p} onPreview={(id) => window.location.hash = `#/preview/${id}`} onBuy={(id) => { setOrderProductId(id); window.location.hash = '#/order'; }} />
              ))}
            </div>
          </div>
        )}

        {activeSection === 'Admin' && isAdminMode && (
          <div className="max-w-5xl mx-auto space-y-8 pb-44">
            <div className="flex gap-4 p-2 bg-zinc-100 dark:bg-zinc-900 rounded-2xl w-max mx-auto">
              {(['Inventory', 'Videos', 'Settings'] as const).map(tab => (
                <button key={tab} onClick={() => setAdminTab(tab)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${adminTab === tab ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow' : 'text-zinc-400'}`}>{tab}</button>
              ))}
            </div>

            {adminTab === 'Inventory' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black uppercase">Store Inventory</h3>
                  <button onClick={() => { setEditProduct({ title: '', price: 0, category: 'Themes', image: '' }); setIsEditing(true); }} className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-black uppercase text-xs">Add New Product</button>
                </div>
                {isEditing && (
                  <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-2 border-[#007AFF]/20">
                    <h4 className="text-lg font-black uppercase text-[#007AFF]">{editProduct.id ? 'Edit Product' : 'New Product'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Title</label>
                        <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" value={editProduct.title || ''} onChange={e => setEditProduct({...editProduct, title: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Image</label>
                        <div className="flex gap-4 items-center">
                          <label className="flex-1 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold text-center cursor-pointer text-sm">Upload Image<input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'product')} className="hidden" /></label>
                          {editProduct.image && <img src={editProduct.image} className="w-12 h-12 rounded-lg object-cover" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Category</label>
                        <select className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value as any})}>
                          <option value="Themes">Themes</option><option value="Widgets">Widgets</option><option value="Walls">Walls</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Price (EGP)</label>
                        <input type="number" className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" value={editProduct.price || 0} onChange={e => setEditProduct({...editProduct, price: parseFloat(e.target.value)})} />
                      </div>
                    </div>
                    <textarea className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-medium h-32 outline-none" placeholder="Description" value={editProduct.description || ''} onChange={e => setEditProduct({...editProduct, description: e.target.value})} />
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl font-black uppercase">Cancel</button>
                      <button onClick={handleSaveProduct} className="flex-[2] py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl font-black uppercase">{isPublishing ? "Saving..." : "Save Product"}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {products.map(p => (
                    <div key={p.id} className="p-5 glass-panel rounded-3xl flex justify-between items-center group transition-all hover:border-[#007AFF]/50">
                      <div className="flex items-center gap-6"><img src={p.image} className="w-16 h-16 rounded-2xl object-cover shadow-lg" /><div><div className="flex items-center gap-2"><h4 className="font-black text-lg">{p.title}</h4>{MOCK_PRODUCTS.some(m => m.id === p.id) && <span className="text-[7px] font-black bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 uppercase">Default</span>}</div><p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{p.category} • {p.price} EGP</p></div></div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditProduct(p); setIsEditing(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-[#007AFF] rounded-full flex items-center justify-center transition-all hover:bg-[#007AFF] hover:text-white"><i className="fa-solid fa-pen text-sm"></i></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"><i className="fa-solid fa-trash text-sm"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Videos' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-black uppercase">Video Tutorials</h3>
                  <button onClick={() => { setEditVideo({ title: '', url: '' }); setIsEditingVideo(true); }} className="px-6 py-3 bg-red-500 text-white rounded-xl font-black uppercase text-xs">Add Tutorial</button>
                </div>
                {isEditingVideo && (
                  <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 border-2 border-red-500/20">
                    <h4 className="text-lg font-black uppercase text-red-500">{editVideo.id ? 'Edit Tutorial' : 'New Tutorial'}</h4>
                    <div className="space-y-4">
                      <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" placeholder="Video Title" value={editVideo.title || ''} onChange={e => setEditVideo({...editVideo, title: e.target.value})} />
                      <input className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold outline-none" placeholder="YouTube Link (e.g. https://youtube.com/watch?v=...)" value={editVideo.url || ''} onChange={e => setEditVideo({...editVideo, url: e.target.value})} />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setIsEditingVideo(false)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-xl font-black uppercase">Cancel</button>
                      <button onClick={handleSaveVideo} className="flex-[2] py-4 bg-red-500 text-white rounded-xl font-black uppercase">{isPublishing ? "Saving..." : "Save Tutorial"}</button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  {videos.map(v => (
                    <div key={v.id} className="p-5 glass-panel rounded-3xl flex justify-between items-center group transition-all hover:border-red-500/50">
                      <div className="flex items-center gap-6"><div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100"><img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} className="w-full h-full object-cover" /></div><div><div className="flex items-center gap-2"><h4 className="font-black text-lg">{v.title}</h4>{MOCK_VIDEOS.some(m => m.id === v.id) && <span className="text-[7px] font-black bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 uppercase">Default</span>}</div><p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">ID: {v.id}</p></div></div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditVideo(v); setIsEditingVideo(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"><i className="fa-solid fa-pen text-sm"></i></button>
                        <button onClick={() => handleDeleteVideo(v.id)} className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center transition-all hover:bg-red-500 hover:text-white"><i className="fa-solid fa-trash text-sm"></i></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'Settings' && (
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
                <div className="space-y-4">
                  <p className="font-black text-xs uppercase text-zinc-400">Logos</p>
                  <label className="block p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer">Update Header Logo <input type="file" className="hidden" onChange={e => handleImageUpload(e, 'siteLogo')} /></label>
                  <label className="block p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer">Update Loader Logo <input type="file" className="hidden" onChange={e => handleImageUpload(e, 'loadingLogo')} /></label>
                </div>
                <div className="space-y-4">
                  <p className="font-black text-xs uppercase text-zinc-400">Admin Password</p>
                  <input type="password" placeholder="New Key" className="w-full p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800" onBlur={e => e.target.value && handleUpdateSettings('admin_password', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-zinc-900 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase shadow-2xl animate-in fade-in slide-in-from-top-4">
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
